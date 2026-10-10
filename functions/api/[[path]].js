import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SESSION_COOKIE = 'magomano_session'
const SESSION_TTL_SECONDS = 12 * 60 * 60
const MAX_IMPORT_ROWS = 400

class ApiError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers })
}

function getStatementFilters(url, { status = false } = {}) {
  const from = url.searchParams.get('from') ?? ''
  const to = url.searchParams.get('to') ?? ''
  const search = (url.searchParams.get('search') ?? '').trim()
  const requestedStatus = status ? (url.searchParams.get('status') ?? '') : ''
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) {
    throw new ApiError('Choose a valid date range.')
  }
  if (search.length > 100) throw new ApiError('Statement search must be 100 characters or fewer.')
  if (requestedStatus && !['active', 'paid', 'pending', 'approved', 'rejected'].includes(requestedStatus)) {
    throw new ApiError('Choose a valid statement status.')
  }
  return { from, to, search, status: requestedStatus }
}

function getCookie(request, name) {
  const prefix = `${name}=`
  const part = (request.headers.get('Cookie') ?? '').split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
  return part?.slice(prefix.length) ?? ''
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function hashPassword(password, saltHex) {
  return scryptSync(password, Buffer.from(saltHex, 'hex'), 64).toString('hex')
}

function hashesMatch(left, right) {
  const leftHash = Buffer.from(left, 'hex')
  const rightHash = Buffer.from(right, 'hex')
  return leftHash.length === rightHash.length && timingSafeEqual(leftHash, rightHash)
}

async function readJson(request) {
  let body
  try {
    body = await request.json()
  } catch {
    throw new ApiError('Request body must contain a valid JSON object.')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError('Request body must be a JSON object.')
  }
  return body
}

async function currentSession(request, env) {
  const token = getCookie(request, SESSION_COOKIE)
  if (!token) return null
  return env.DB.prepare(`
    SELECT s.token_hash AS tokenHash, s.role, s.member_id AS memberId,
      s.admin_id AS adminId, s.expires_at AS expiresAt, a.role AS adminRole
    FROM sessions s
    LEFT JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(await sha256(token), Math.floor(Date.now() / 1000)).first()
}

async function requireRole(request, env, role) {
  const session = await currentSession(request, env)
  const authorized = role === 'admin'
    ? session?.role === 'admin' && ['admin', 'superadmin'].includes(session.adminRole)
    : session?.role === role
  if (!authorized) {
    throw new ApiError(role === 'admin'
      ? 'Administrator sign-in is required.'
      : 'Please sign in to continue.', 401)
  }
  return session
}

async function startSession(env, request, response, session) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Math.floor(Date.now() / 1000)),
    env.DB.prepare(`
      INSERT INTO sessions (token_hash, role, member_id, admin_id, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(await sha256(token), session.role, session.memberId ?? null, session.adminId ?? null, expiresAt),
  ])
  response.headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`)
  return response
}

function withSessionCookie(response, request, token = '') {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  response.headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${token ? SESSION_TTL_SECONDS : 0}${secure}`)
  return response
}

async function loginSession(env, request, body, role, row) {
  const passwordHash = hashPassword(body.password, row.password_salt)
  if (!hashesMatch(passwordHash, row.password_hash)) {
    throw new ApiError(role === 'admin'
      ? 'Admin username or password is incorrect.'
      : 'National ID or password is incorrect.', 401)
  }
  if (role === 'member' && row.account_status !== 'approved') {
    throw new ApiError(row.account_status === 'pending'
      ? 'Your account is waiting for SACCO administrator approval.'
      : 'Your account is not approved for sign-in. Please contact the SACCO.', 403)
  }

  const response = json(role === 'admin'
    ? {
      admin: {
        username: row.username,
        displayName: row.display_name,
        isSuperAdmin: row.role === 'superadmin',
      },
    }
    : { member: { nationalId: row.national_id, fullName: row.full_name } })
  await startSession(env, request, response, role === 'admin'
    ? { role, adminId: row.id }
    : { role, memberId: row.id })
  return response
}

async function handleAuth(path, request, env) {
  if (path === '/health' && request.method === 'GET') return json({ status: 'ok' })

  if (path === '/auth/terms' && request.method === 'GET') {
    const terms = await env.DB.prepare('SELECT content, updated_at AS updatedAt FROM sacco_terms WHERE id = 1').first()
    return json({ terms: terms?.content ?? '', updatedAt: terms?.updatedAt ?? null })
  }

  if (path === '/auth/session' && request.method === 'GET') {
    const session = await currentSession(request, env)
    if (!session) return json({ authenticated: false })
    if (session.role === 'admin') {
      const admin = await env.DB.prepare(`
          SELECT username, display_name AS displayName, role FROM admins WHERE id = ?
      `).bind(session.adminId).first()
        return json(admin
          ? { authenticated: true, role: 'admin', isSuperAdmin: admin.role === 'superadmin', admin }
          : { authenticated: false })
      }
    return json({ authenticated: true, role: 'member' })
  }

  if (path === '/auth/register' && request.method === 'POST') {
    const body = await readJson(request)
    const nationalId = typeof body.nationalId === 'string' ? body.nationalId.trim() : ''
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const secondName = typeof body.secondName === 'string' ? body.secondName.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const fullName = [firstName, secondName, lastName].join(' ')
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const county = typeof body.county === 'string' ? body.county.trim() : ''
    const subCounty = typeof body.subCounty === 'string' ? body.subCounty.trim() : ''
    const location = typeof body.location === 'string' ? body.location.trim() : ''
    const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : ''
    const bankBranch = typeof body.bankBranch === 'string' ? body.bankBranch.trim() : ''
    const bankAccountName = typeof body.bankAccountName === 'string' ? body.bankAccountName.trim() : ''
    const bankAccountNumber = typeof body.bankAccountNumber === 'string' ? body.bankAccountNumber.trim() : ''
    const bankTwoName = typeof body.bankTwoName === 'string' ? body.bankTwoName.trim() : ''
    const bankTwoBranch = typeof body.bankTwoBranch === 'string' ? body.bankTwoBranch.trim() : ''
    const bankTwoAccountName = typeof body.bankTwoAccountName === 'string' ? body.bankTwoAccountName.trim() : ''
    const bankTwoAccountNumber = typeof body.bankTwoAccountNumber === 'string' ? body.bankTwoAccountNumber.trim() : ''
    const contactName = typeof body.contactName === 'string' ? body.contactName.trim() : ''
    const contactRelationship = typeof body.contactRelationship === 'string' ? body.contactRelationship.trim() : ''
    const contactPhoneNumber = typeof body.contactPhoneNumber === 'string' ? body.contactPhoneNumber.trim() : ''
    const secondContactName = typeof body.secondContactName === 'string' ? body.secondContactName.trim() : ''
    const secondContactRelationship = typeof body.secondContactRelationship === 'string' ? body.secondContactRelationship.trim() : ''
    const secondContactPhoneNumber = typeof body.secondContactPhoneNumber === 'string' ? body.secondContactPhoneNumber.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const phoneIsValid = (phone) => {
      const digits = phone.replace(/\D/g, '')
      return phone.length <= 32 && digits.length >= 7 && digits.length <= 15
    }
    if (!/^[0-9]{6,12}$/.test(nationalId)) throw new ApiError('Enter a National ID using 6 to 12 digits.')
    if ([firstName, secondName, lastName].some((name) => name.length < 1 || name.length > 60) || fullName.length > 150) {
      throw new ApiError('Enter your first, second, and last names (up to 60 characters each).')
    }
    if (!phoneIsValid(phoneNumber)) throw new ApiError('Enter a valid phone number.')
    if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      throw new ApiError('Enter a valid email address, or leave it blank.')
    }
    if (!county || county.length > 100 || !subCounty || subCounty.length > 100 || !location || location.length > 160) {
      throw new ApiError('Enter your county, sub-county, and location.')
    }
    if (!bankName || bankName.length > 100 || !bankAccountNumber || bankAccountNumber.length > 50
      || bankBranch.length > 100 || bankAccountName.length > 100) {
      throw new ApiError('Enter a bank name and account number for your first bank account.')
    }
    const hasSecondBank = Boolean(bankTwoName || bankTwoBranch || bankTwoAccountName || bankTwoAccountNumber)
    if (hasSecondBank && (!bankTwoName || !bankTwoAccountNumber)) {
      throw new ApiError('For your second bank account, provide both the bank name and account number.')
    }
    if (bankTwoName.length > 100 || bankTwoBranch.length > 100 || bankTwoAccountName.length > 100 || bankTwoAccountNumber.length > 50) {
      throw new ApiError('Check the second bank account details and try again.')
    }
    if (contactName.length < 2 || contactName.length > 100
      || contactRelationship.length < 2 || contactRelationship.length > 60 || !phoneIsValid(contactPhoneNumber)) {
      throw new ApiError('Enter a contact name, relationship, and valid phone number.')
    }
    const hasSecondContact = Boolean(secondContactName || secondContactRelationship || secondContactPhoneNumber)
    if (hasSecondContact && (secondContactName.length < 2 || secondContactName.length > 100
      || secondContactRelationship.length < 2 || secondContactRelationship.length > 60 || !phoneIsValid(secondContactPhoneNumber))) {
      throw new ApiError('Complete all details for your second contact, or leave them blank.')
    }
    if (body.acceptedTerms !== true || typeof body.termsVersion !== 'string' || body.termsVersion.length > 100
      || typeof body.termsSnapshot !== 'string' || body.termsSnapshot.length > 20000) {
      throw new ApiError('Review and accept the current terms and conditions before joining.')
    }
    const terms = await env.DB.prepare('SELECT content, updated_at AS updatedAt FROM sacco_terms WHERE id = 1').first()
    if (!terms?.content.trim()) throw new ApiError('The SACCO has not published its terms and conditions yet.', 503)
    if (body.termsVersion !== terms.updatedAt || body.termsSnapshot !== terms.content) {
      throw new ApiError('The terms and conditions have changed. Review and accept the current version before joining.', 409)
    }
    if (!password || password.length > 256) throw new ApiError('Enter a password of up to 256 characters.')

    const salt = randomBytes(16).toString('hex')
    const passwordHash = hashPassword(password, salt)
    try {
      const registration = [
        env.DB.prepare(`
          INSERT INTO members (
            national_id, full_name, phone_number, account_status, password_salt, password_hash,
            bank_name, bank_branch, bank_account_name, bank_account_number,
            location, email, county, sub_county, first_name, second_name, last_name,
            bank_two_name, bank_two_branch, bank_two_account_name, bank_two_account_number
          ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          nationalId, fullName, phoneNumber, salt, passwordHash,
          bankName, bankBranch, bankAccountName || fullName, bankAccountNumber,
          location, email, county, subCounty, firstName, secondName, lastName,
          bankTwoName, bankTwoBranch, bankTwoAccountName || (hasSecondBank ? fullName : ''), bankTwoAccountNumber,
        ),
        env.DB.prepare(`
          INSERT INTO member_contacts (member_id, full_name, relationship, phone_number)
          SELECT id, ?, ?, ? FROM members WHERE national_id = ? COLLATE NOCASE
        `).bind(contactName, contactRelationship, contactPhoneNumber, nationalId),
        ...(hasSecondContact ? [env.DB.prepare(`
          INSERT INTO member_contacts (member_id, full_name, relationship, phone_number)
          SELECT id, ?, ?, ? FROM members WHERE national_id = ? COLLATE NOCASE
        `).bind(secondContactName, secondContactRelationship, secondContactPhoneNumber, nationalId)] : []),
        env.DB.prepare(`
          INSERT INTO member_terms_acceptances (member_id, terms_content, terms_updated_at)
          SELECT id, ?, ? FROM members WHERE national_id = ? COLLATE NOCASE
        `).bind(terms.content, terms.updatedAt, nationalId),
      ]
      await env.DB.batch(registration)
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new ApiError('An account with this National ID already exists.', 409)
      }
      if (String(error).includes('member contact limit')) {
        throw new ApiError('A member can have no more than two contacts.', 409)
      }
      throw error
    }
    return json({
      member: { nationalId, fullName },
      message: 'Your membership application has been submitted for administrator approval.',
    }, 201)
  }

  if (path === '/auth/login' && request.method === 'POST') {
    const body = await readJson(request)
    const nationalId = typeof body.nationalId === 'string' ? body.nationalId.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!/^[0-9]{6,12}$/.test(nationalId) || !password) {
      throw new ApiError('Enter your National ID and password.')
    }
    const member = await env.DB.prepare(`
      SELECT id, national_id, full_name, account_status, password_salt, password_hash
      FROM members WHERE national_id = ? COLLATE NOCASE
    `).bind(nationalId).first()
    if (!member) throw new ApiError('National ID or password is incorrect.', 401)
    return loginSession(env, request, body, 'member', member)
  }

  if (path === '/admin/login' && request.method === 'POST') {
    const body = await readJson(request)
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!username || !password) throw new ApiError('Enter your admin username and password.')
    const superAdminUsername = typeof env.SUPER_ADMIN_USERNAME === 'string'
      ? env.SUPER_ADMIN_USERNAME.trim()
      : ''
    const superAdminPassword = typeof env.SUPER_ADMIN_PASSWORD === 'string'
      ? env.SUPER_ADMIN_PASSWORD
      : ''
    if (superAdminUsername && superAdminPassword && username.toLowerCase() === superAdminUsername.toLowerCase()) {
      const submittedHash = scryptSync(password, Buffer.alloc(16), 64)
      const configuredHash = scryptSync(superAdminPassword, Buffer.alloc(16), 64)
      if (!timingSafeEqual(submittedHash, configuredHash)) {
        throw new ApiError('Admin username or password is incorrect.', 401)
      }
      const collision = await env.DB.prepare(`
        SELECT member_id AS memberId, role FROM admins WHERE username = ? COLLATE NOCASE
      `).bind(superAdminUsername).first()
      if (collision && (collision.memberId || collision.role !== 'superadmin')) {
        throw new ApiError('The configured super admin username is already assigned to another account. Set a different SUPER_ADMIN_USERNAME.', 500)
      }
      const salt = randomBytes(16).toString('hex')
      const passwordHash = hashPassword(superAdminPassword, salt)
      await env.DB.prepare(`
        INSERT INTO admins (username, display_name, password_salt, password_hash, role)
        VALUES (?, ?, ?, ?, 'superadmin')
        ON CONFLICT(username) DO UPDATE SET
          display_name = excluded.display_name,
          password_salt = excluded.password_salt,
          password_hash = excluded.password_hash,
          role = 'superadmin'
      `).bind(
        superAdminUsername,
        typeof env.SUPER_ADMIN_DISPLAY_NAME === 'string' && env.SUPER_ADMIN_DISPLAY_NAME.trim()
          ? env.SUPER_ADMIN_DISPLAY_NAME.trim().slice(0, 100)
          : 'Super Administrator',
        salt,
        passwordHash,
      ).run()
      const superAdmin = await env.DB.prepare(`
        SELECT id, username, display_name, password_salt, password_hash, role
        FROM admins WHERE username = ? COLLATE NOCASE
      `).bind(superAdminUsername).first()
      return loginSession(env, request, body, 'admin', superAdmin)
    }
    const admin = await env.DB.prepare(`
      SELECT a.id, a.username, a.display_name, a.role,
        COALESCE(m.password_salt, a.password_salt) AS password_salt,
        COALESCE(m.password_hash, a.password_hash) AS password_hash
      FROM admins a
      LEFT JOIN members m ON m.id = a.member_id
      WHERE a.username = ? COLLATE NOCASE
    `).bind(username).first()
    if (!admin) throw new ApiError('Admin username or password is incorrect.', 401)
    return loginSession(env, request, body, 'admin', admin)
  }

  if (path === '/auth/logout' && request.method === 'POST') {
    const token = getCookie(request, SESSION_COOKIE)
    if (token) {
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run()
    }
    return withSessionCookie(new Response(null, { status: 204 }), request)
  }
  return null
}

async function getMemberBorrowingCapacity(env, memberId) {
  const result = await env.DB.prepare(`
    SELECT
      COALESCE((SELECT SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END)
        FROM savings_transactions WHERE member_id = ?), 0) AS savingsBalance,
      COALESCE((SELECT SUM(outstanding_balance)
        FROM member_loans WHERE member_id = ? AND outstanding_balance > 0), 0) AS activeLoanBalance,
      COALESCE((SELECT SUM(requested_amount)
        FROM loan_applications WHERE member_id = ? AND status = 'pending'), 0) AS pendingApplications
  `).bind(memberId, memberId, memberId).first()
  return {
    ...result,
    availableBalance: Math.max(0, result.savingsBalance - result.activeLoanBalance - result.pendingApplications),
  }
}

async function memberDashboard(session, env) {
  const memberId = session.memberId
  const member = await env.DB.prepare(`
    SELECT national_id, full_name FROM members WHERE id = ?
  `).bind(memberId).first()
  if (!member) throw new ApiError('Please sign in to continue.', 401)

  const [borrowingCapacity, loanTotals] = await Promise.all([
    getMemberBorrowingCapacity(env, memberId),
    env.DB.prepare(`
      SELECT COALESCE(SUM(outstanding_balance), 0) AS balance
      FROM member_loans WHERE member_id = ?
    `).bind(memberId).first(),
  ])
  return json({
    member,
    borrowingCapacity,
    savings: { balance: borrowingCapacity.savingsBalance, statement: [] },
    loans: {
      outstandingBalance: loanTotals.balance,
      statement: [],
      repayments: [],
    },
  })
}

async function memberTransactions(request, session, env) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const requestedPage = Number(url.searchParams.get('page') ?? '1')
  const filters = getStatementFilters(url, { status: type === 'loans' })
  if (!['savings', 'loans', 'repayments'].includes(type)) {
    throw new ApiError('Choose savings, loans, or repayments for the statement type.')
  }
  if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > 1_000_000) {
    throw new ApiError('Choose a valid statement page.')
  }

  const pageSize = 10
  const offset = (requestedPage - 1) * pageSize
  const memberId = session.memberId
  let countQuery
  let itemsQuery
  const dateConditions = []
  const dateParams = []

  if (filters.from) {
    dateConditions.push(type === 'loans' ? 'issued_at >= ?' : type === 'repayments' ? 'r.paid_at >= ?' : 'occurred_at >= ?')
    dateParams.push(`${filters.from} 00:00:00`)
  }
  if (filters.to) {
    dateConditions.push(type === 'loans' ? 'issued_at <= ?' : type === 'repayments' ? 'r.paid_at <= ?' : 'occurred_at <= ?')
    dateParams.push(`${filters.to} 23:59:59`)
  }

  if (type === 'savings') {
    const where = ['member_id = ?', "entry_type = 'deposit'", ...dateConditions]
    const params = [memberId, ...dateParams]
    if (filters.search) {
      where.push('(description LIKE ?)')
      params.push(`%${filters.search}%`)
    }
    countQuery = env.DB.prepare(`
      SELECT COUNT(*) AS total FROM savings_transactions WHERE ${where.join(' AND ')}
    `).bind(...params)
    itemsQuery = env.DB.prepare(`
      SELECT entry_type AS entryType, amount, description, occurred_at AS occurredAt
      FROM savings_transactions WHERE ${where.join(' AND ')}
      ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?
    `).bind(...params, pageSize, offset)
  } else if (type === 'loans') {
    const where = ['member_id = ?', ...dateConditions]
    const params = [memberId, ...dateParams]
    if (filters.search) {
      where.push('(loan_reference LIKE ? OR status LIKE ?)')
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }
    if (filters.status) {
      where.push('status = ?')
      params.push(filters.status)
    }
    countQuery = env.DB.prepare(`
      SELECT COUNT(*) AS total FROM member_loans WHERE ${where.join(' AND ')}
    `).bind(...params)
    itemsQuery = env.DB.prepare(`
      SELECT loan_reference AS reference, principal_amount AS principalAmount,
        interest_rate AS interestRate, repayment_months AS repaymentMonths,
        total_repayable AS totalRepayable,
        MAX(0, total_repayable - outstanding_balance) AS paidAmount,
        outstanding_balance AS outstandingBalance, security_type AS securityType,
        status, issued_at AS issuedAt
      FROM member_loans WHERE ${where.join(' AND ')}
      ORDER BY issued_at DESC, id DESC LIMIT ? OFFSET ?
    `).bind(...params, pageSize, offset)
  } else {
    const where = ['l.member_id = ?', ...dateConditions]
    const params = [memberId, ...dateParams]
    if (filters.search) {
      where.push('(l.loan_reference LIKE ? OR r.description LIKE ?)')
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }
    countQuery = env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM loan_repayments r JOIN member_loans l ON l.id = r.loan_id
      WHERE ${where.join(' AND ')}
    `).bind(...params)
    itemsQuery = env.DB.prepare(`
      SELECT l.loan_reference AS loanReference, r.amount, r.description, r.paid_at AS paidAt
      FROM loan_repayments r JOIN member_loans l ON l.id = r.loan_id
      WHERE ${where.join(' AND ')}
      ORDER BY r.paid_at DESC, r.id DESC LIMIT ? OFFSET ?
    `).bind(...params, pageSize, offset)
  }

  const [count, items] = await Promise.all([countQuery.first(), itemsQuery.all()])
  return json({ items: items.results, total: count.total, page: requestedPage, pageSize })
}

async function applyForLoan(request, session, env) {
  const body = await readJson(request)
  const requestedAmount = Number(body.requestedAmount)
  const repaymentMonths = Number(body.repaymentMonths)
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : ''
  if (body.securityType !== undefined && body.securityType !== 'savings') {
    throw new ApiError('Savings is the only accepted loan security.')
  }
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > 1_000_000_000) {
    throw new ApiError('Enter a loan amount greater than zero.')
  }
  if (!Number.isInteger(repaymentMonths) || repaymentMonths < 1 || repaymentMonths > 120) {
    throw new ApiError('Choose a repayment period from 1 to 120 months.')
  }
  if (purpose.length < 3 || purpose.length > 500) {
    throw new ApiError('Describe the purpose in 3 to 500 characters.')
  }

  const capacity = await getMemberBorrowingCapacity(env, session.memberId)
  if (requestedAmount > capacity.availableBalance) {
    throw new ApiError(`Requested loan exceeds your available borrowing balance of ${Number(capacity.availableBalance).toFixed(2)}.`)
  }
  const result = await env.DB.prepare(`
    INSERT INTO loan_applications (member_id, requested_amount, repayment_months, purpose, security_type)
    SELECT ?, ?, ?, ?, 'savings'
    WHERE ? <= MAX(0,
      COALESCE((SELECT SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END)
        FROM savings_transactions WHERE member_id = ?), 0)
      - COALESCE((SELECT SUM(outstanding_balance)
        FROM member_loans WHERE member_id = ? AND outstanding_balance > 0), 0)
      - COALESCE((SELECT SUM(requested_amount)
        FROM loan_applications WHERE member_id = ? AND status = 'pending'), 0)
    )
  `).bind(session.memberId, requestedAmount, repaymentMonths, purpose,
    requestedAmount, session.memberId, session.memberId, session.memberId).run()
  if (!result.meta.changes) {
    const latestCapacity = await getMemberBorrowingCapacity(env, session.memberId)
    throw new ApiError(`Requested loan exceeds your available borrowing balance of ${Number(latestCapacity.availableBalance).toFixed(2)}.`)
  }
  const totalRepayable = Math.round(requestedAmount * 1.1 * 100) / 100
  const monthlyInstallment = Math.round(totalRepayable / repaymentMonths * 100) / 100
  return json({
    message: `Application submitted. At 10% interest, estimated total repayment is ${totalRepayable.toFixed(2)} over ${repaymentMonths} months (about ${monthlyInstallment.toFixed(2)} per month).`,
    totalRepayable,
    monthlyInstallment,
  }, 201)
}

async function memberLoanApplications(request, session, env) {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? '1')
  if (!Number.isInteger(page) || page < 1 || page > 1_000_000) {
    throw new ApiError('Choose a valid application page.')
  }
  const filters = getStatementFilters(url, { status: true })
  if (filters.status && !['pending', 'approved', 'rejected'].includes(filters.status)) {
    throw new ApiError('Choose pending, approved, or rejected for the application status filter.')
  }
  const where = ['member_id = ?']
  const params = [session.memberId]
  if (filters.from) {
    where.push('applied_at >= ?')
    params.push(`${filters.from} 00:00:00`)
  }
  if (filters.to) {
    where.push('applied_at <= ?')
    params.push(`${filters.to} 23:59:59`)
  }
  if (filters.search) {
    where.push('(purpose LIKE ? OR status LIKE ?)')
    params.push(`%${filters.search}%`, `%${filters.search}%`)
  }
  if (filters.status) {
    where.push('status = ?')
    params.push(filters.status)
  }
  const whereSql = `WHERE ${where.join(' AND ')}`
  const pageSize = 10
  const offset = (page - 1) * pageSize
  const [count, items] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total FROM loan_applications ${whereSql}`).bind(...params).first(),
    env.DB.prepare(`
      SELECT id, requested_amount AS requestedAmount, repayment_months AS repaymentMonths,
        purpose, status, security_type AS securityType, applied_at AS appliedAt
      FROM loan_applications ${whereSql}
      ORDER BY applied_at DESC, id DESC LIMIT ? OFFSET ?
    `).bind(...params, pageSize, offset).all(),
  ])
  return json({ items: items.results, total: count.total, page, pageSize })
}

async function memberContacts(request, session, env) {
  if (request.method === 'GET') {
    const contacts = await env.DB.prepare(`
      SELECT id, full_name AS fullName, relationship, phone_number AS phoneNumber
      FROM member_contacts WHERE member_id = ? ORDER BY created_at, id LIMIT 2
    `).bind(session.memberId).all()
    return json({ contacts: contacts.results, maxContacts: 2 })
  }

  if (request.method === 'POST') {
    const body = await readJson(request)
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const relationship = typeof body.relationship === 'string' ? body.relationship.trim() : ''
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : ''
    if (fullName.length < 2 || fullName.length > 100) throw new ApiError('Contact name must be 2 to 100 characters.')
    if (relationship.length < 2 || relationship.length > 60) throw new ApiError('Relationship must be 2 to 60 characters.')
    if (phoneNumber.length < 5 || phoneNumber.length > 32) throw new ApiError('Enter a contact phone number from 5 to 32 characters.')
    const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM member_contacts WHERE member_id = ?')
      .bind(session.memberId).first()
    if (count.total >= 2) throw new ApiError('You can add up to two contacts.', 409)
    const result = await env.DB.prepare(`
      INSERT INTO member_contacts (member_id, full_name, relationship, phone_number)
      VALUES (?, ?, ?, ?)
    `).bind(session.memberId, fullName, relationship, phoneNumber).run()
    return json({
      contact: { id: result.meta.last_row_id, fullName, relationship, phoneNumber },
      message: 'Contact added.',
    }, 201)
  }

  return null
}

async function handleMember(path, request, env) {
  const isContactDelete = /^\/member\/contacts\/\d+$/.test(path) && request.method === 'DELETE'
  if (path !== '/member/dashboard' && path !== '/member/loan-applications'
    && path !== '/member/transactions' && path !== '/member/contacts'
    && path !== '/member/terms' && !isContactDelete) return null
  const session = await requireRole(request, env, 'member')
  if (path === '/member/dashboard' && request.method === 'GET') return memberDashboard(session, env)
  if (path === '/member/transactions' && request.method === 'GET') return memberTransactions(request, session, env)
  if (path === '/member/loan-applications' && request.method === 'GET') return memberLoanApplications(request, session, env)
  if (path === '/member/loan-applications' && request.method === 'POST') {
    return applyForLoan(request, session, env)
  }
  if (path === '/member/contacts') return memberContacts(request, session, env)
  if (isContactDelete) {
    const contactId = Number(path.match(/\d+$/)?.[0])
    const result = await env.DB.prepare('DELETE FROM member_contacts WHERE id = ? AND member_id = ?')
      .bind(contactId, session.memberId).run()
    if (!result.meta.changes) throw new ApiError('Contact was not found.', 404)
    return json({ message: 'Contact removed.' })
  }
  if (path === '/member/terms' && request.method === 'GET') {
    const terms = await env.DB.prepare('SELECT content, updated_at AS updatedAt FROM sacco_terms WHERE id = 1').first()
    return json({ terms: terms?.content ?? '', updatedAt: terms?.updatedAt ?? null })
  }
  return null
}

async function handleAdmin(path, request, env) {
  if (!path.startsWith('/admin/')) return null
  const session = await requireRole(request, env, 'admin')
  const db = env.DB
  const method = request.method

  if (path === '/admin/terms' && method === 'GET') {
    const terms = await db.prepare('SELECT content, updated_at AS updatedAt FROM sacco_terms WHERE id = 1').first()
    return json({ terms: terms?.content ?? '', updatedAt: terms?.updatedAt ?? null })
  }

  if (path === '/admin/terms' && method === 'PUT') {
    const body = await readJson(request)
    const terms = typeof body.terms === 'string' ? body.terms.trim() : ''
    if (terms.length < 20 || terms.length > 20000) {
      throw new ApiError('Terms and conditions must be 20 to 20,000 characters.')
    }
    await db.prepare(`
      INSERT INTO sacco_terms (id, content, updated_by, updated_at)
      VALUES (1, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `).bind(terms, session.adminId).run()
    const saved = await db.prepare('SELECT updated_at AS updatedAt FROM sacco_terms WHERE id = 1').first()
    return json({ terms, updatedAt: saved.updatedAt, message: 'Terms and conditions saved.' })
  }

  if (path === '/admin/statements' && method === 'GET') {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    if (!['savings', 'loans', 'repayments', 'dividends', 'applications'].includes(type)) {
      throw new ApiError('Choose savings, loans, repayments, dividends, or applications for the statement type.')
    }
    const page = Number(url.searchParams.get('page') ?? '1')
    if (!Number.isInteger(page) || page < 1 || page > 1_000_000) {
      throw new ApiError('Choose a valid statement page.')
    }
    const filters = getStatementFilters(url, { status: true })
    if (filters.status && !['loans', 'applications'].includes(type)) {
      throw new ApiError('Status filters are only available for loans and applications.')
    }
    if (filters.status && type === 'loans' && !['active', 'paid'].includes(filters.status)) {
      throw new ApiError('Choose active or paid for the issued-loan status filter.')
    }
    if (filters.status && type === 'applications' && !['pending', 'approved', 'rejected'].includes(filters.status)) {
      throw new ApiError('Choose pending, approved, or rejected for the application status filter.')
    }
    const pageSize = 10
    const offset = (page - 1) * pageSize
    const statements = {
      savings: {
        from: 's.occurred_at',
        fromTable: 'savings_transactions s JOIN members m ON m.id = s.member_id',
        where: ["s.entry_type = 'deposit'"],
        fields: "s.id, s.entry_type AS entryType, m.full_name AS fullName, m.national_id AS nationalId, s.amount, s.description, s.occurred_at AS occurredAt",
        order: 's.occurred_at DESC, s.id DESC',
        search: '(m.full_name LIKE ? OR m.national_id LIKE ? OR s.description LIKE ?)',
      },
      loans: {
        from: 'l.issued_at',
        fromTable: 'member_loans l JOIN members m ON m.id = l.member_id',
        where: [],
        fields: 'l.id, l.loan_reference AS reference, l.principal_amount AS principalAmount, l.interest_rate AS interestRate, l.repayment_months AS repaymentMonths, l.total_repayable AS totalRepayable, l.outstanding_balance AS outstandingBalance, l.security_type AS securityType, l.status, l.issued_at AS issuedAt, m.full_name AS fullName, m.national_id AS nationalId',
        order: 'l.issued_at DESC, l.id DESC',
        search: '(m.full_name LIKE ? OR m.national_id LIKE ? OR l.loan_reference LIKE ? OR l.status LIKE ?)',
      },
      repayments: {
        from: 'r.paid_at',
        fromTable: 'loan_repayments r JOIN member_loans l ON l.id = r.loan_id JOIN members m ON m.id = l.member_id',
        where: [],
        fields: 'r.id, l.loan_reference AS loanReference, r.amount, r.description, r.paid_at AS paidAt, m.full_name AS fullName, m.national_id AS nationalId',
        order: 'r.paid_at DESC, r.id DESC',
        search: '(m.full_name LIKE ? OR m.national_id LIKE ? OR l.loan_reference LIKE ? OR r.description LIKE ?)',
      },
      dividends: {
        from: 'd.paid_at',
        fromTable: 'dividend_payments d JOIN members m ON m.id = d.member_id',
        where: [],
        fields: 'd.id, d.financial_period AS financialPeriod, d.amount, d.description, d.paid_at AS paidAt, m.full_name AS fullName, m.national_id AS nationalId',
        order: 'd.paid_at DESC, d.id DESC',
        search: '(m.full_name LIKE ? OR m.national_id LIKE ? OR d.financial_period LIKE ? OR d.description LIKE ?)',
      },
      applications: {
        from: 'a.applied_at',
        fromTable: 'loan_applications a JOIN members m ON m.id = a.member_id',
        where: [],
        fields: 'a.id, a.requested_amount AS requestedAmount, a.repayment_months AS repaymentMonths, a.purpose, a.status, a.security_type AS securityType, a.applied_at AS appliedAt, m.full_name AS fullName, m.national_id AS nationalId',
        order: "CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END, a.applied_at DESC, a.id DESC",
        search: '(m.full_name LIKE ? OR m.national_id LIKE ? OR a.purpose LIKE ? OR a.status LIKE ?)',
      },
    }
    const definition = statements[type]
    const where = [...definition.where]
    const params = []
    if (filters.from) {
      where.push(`${definition.from} >= ?`)
      params.push(`${filters.from} 00:00:00`)
    }
    if (filters.to) {
      where.push(`${definition.from} <= ?`)
      params.push(`${filters.to} 23:59:59`)
    }
    if (filters.search) {
      where.push(definition.search)
      params.push(...definition.search.match(/\?/g).map(() => `%${filters.search}%`))
    }
    if (filters.status) {
      where.push(type === 'loans' ? 'l.status = ?' : 'a.status = ?')
      params.push(filters.status)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const [count, items] = await Promise.all([
      db.prepare(`SELECT COUNT(*) AS total FROM ${definition.fromTable} ${whereSql}`).bind(...params).first(),
      db.prepare(`SELECT ${definition.fields} FROM ${definition.fromTable} ${whereSql} ORDER BY ${definition.order} LIMIT ? OFFSET ?`)
        .bind(...params, pageSize, offset).all(),
    ])
    return json({ items: items.results, total: count.total, page, pageSize })
  }

  if (path === '/admin/dashboard' && method === 'GET') {
    const [members, savings, loans, dividends, applications] = await Promise.all([
      db.prepare(`
        SELECT COUNT(*) AS totalMembers,
          SUM(CASE WHEN account_status = 'pending' THEN 1 ELSE 0 END) AS pendingMembers,
          SUM(CASE WHEN account_status = 'approved' THEN 1 ELSE 0 END) AS approvedMembers
        FROM members WHERE national_id IS NOT NULL
      `).first(),
      db.prepare(`
        SELECT COALESCE(SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END), 0) AS total
        FROM savings_transactions
      `).first(),
      db.prepare(`
        SELECT COALESCE(SUM(principal_amount), 0) AS issued,
          COALESCE(SUM(outstanding_balance), 0) AS pendingPayments FROM member_loans
      `).first(),
      db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM dividend_payments').first(),
      db.prepare("SELECT COUNT(*) AS total FROM loan_applications WHERE status = 'pending'").first(),
    ])
    return json({
      members,
      totalSavings: savings.total,
      loansIssued: loans.issued,
      pendingPayments: loans.pendingPayments,
      dividendsPaid: dividends.total,
      pendingLoanApplications: applications.total,
    })
  }

  if (path === '/admin/members' && method === 'GET') {
    const [members, contactRows] = await Promise.all([
      db.prepare(`
      SELECT m.id, m.national_id AS nationalId, m.full_name AS fullName,
        m.first_name AS firstName, m.second_name AS secondName, m.last_name AS lastName,
        m.phone_number AS phoneNumber, m.account_status AS accountStatus,
        m.email, m.county, m.sub_county AS subCounty,
        m.bank_name AS bankName, m.bank_branch AS bankBranch,
        m.bank_account_name AS bankAccountName, m.bank_account_number AS bankAccountNumber,
        m.bank_two_name AS bankTwoName, m.bank_two_branch AS bankTwoBranch,
        m.bank_two_account_name AS bankTwoAccountName,
        m.bank_two_account_number AS bankTwoAccountNumber,
        m.location, m.marital_status AS maritalStatus,
        m.next_kin_name AS nextKinName, m.next_kin_relationship AS nextKinRelationship,
        m.next_kin_phone AS nextKinPhone,
        (SELECT accepted_at FROM member_terms_acceptances ta WHERE ta.member_id = m.id) AS termsAcceptedAt,
        COALESCE(SUM(CASE WHEN s.entry_type = 'deposit' THEN s.amount ELSE -s.amount END), 0) AS savingsBalance,
        EXISTS (SELECT 1 FROM admins a WHERE a.member_id = m.id) AS isAdmin
      FROM members m LEFT JOIN savings_transactions s ON s.member_id = m.id
      WHERE m.national_id IS NOT NULL GROUP BY m.id ORDER BY m.full_name COLLATE NOCASE
      `).all(),
      db.prepare(`
        SELECT c.member_id AS memberId, c.id, c.full_name AS fullName,
          c.relationship, c.phone_number AS phoneNumber
        FROM member_contacts c JOIN members m ON m.id = c.member_id
        WHERE m.national_id IS NOT NULL ORDER BY c.member_id, c.created_at, c.id
      `).all(),
    ])
    const contactsByMember = new Map()
    for (const contact of contactRows.results) {
      const contacts = contactsByMember.get(contact.memberId) ?? []
      contacts.push({
        id: contact.id,
        fullName: contact.fullName,
        relationship: contact.relationship,
        phoneNumber: contact.phoneNumber,
      })
      contactsByMember.set(contact.memberId, contacts)
    }
    return json({
      members: members.results.map((member) => ({
        ...member,
        contacts: contactsByMember.get(member.id) ?? [],
      })),
    })
  }

  const memberDetails = path.match(/^\/admin\/members\/(\d+)\/details$/)
  if (memberDetails && method === 'PUT') {
    const memberId = Number(memberDetails[1])
    const body = await readJson(request)
    const fields = [
      ['fullName', 'Full name', 2, 100],
      ['phoneNumber', 'Phone number', 0, 32],
      ['bankName', 'Bank name', 0, 100],
      ['bankBranch', 'Bank branch', 0, 100],
      ['bankAccountName', 'Bank account name', 0, 100],
      ['bankAccountNumber', 'Bank account number', 0, 50],
      ['bankTwoName', 'Second bank name', 0, 100],
      ['bankTwoBranch', 'Second bank branch', 0, 100],
      ['bankTwoAccountName', 'Second bank account name', 0, 100],
      ['bankTwoAccountNumber', 'Second bank account number', 0, 50],
      ['email', 'Email', 0, 254],
      ['county', 'County', 0, 100],
      ['subCounty', 'Sub-county', 0, 100],
      ['location', 'Location', 0, 160],
      ['nextKinName', 'Next-of-kin name', 0, 100],
      ['nextKinRelationship', 'Next-of-kin relationship', 0, 60],
      ['nextKinPhone', 'Next-of-kin phone', 0, 32],
    ]
    const values = {}
    for (const [key, label, min, max] of fields) {
      if (typeof body[key] !== 'string') throw new ApiError(`${label} must be text.`)
      values[key] = body[key].trim()
      if (values[key].length < min || values[key].length > max) {
        throw new ApiError(`${label} must be ${min ? `${min} to ` : 'no more than '}${max} characters.`)
      }
    }
    const maritalStatus = typeof body.maritalStatus === 'string' ? body.maritalStatus : ''
    if (!['', 'single', 'married', 'divorced', 'widowed', 'other'].includes(maritalStatus)) {
      throw new ApiError('Choose a valid marital status.')
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      throw new ApiError('Enter a valid email address, or leave it blank.')
    }
    const nameParts = values.fullName.split(/\s+/)
    const firstName = nameParts.shift() ?? ''
    const lastName = nameParts.length > 1 ? nameParts.pop() ?? '' : ''
    const secondName = nameParts.join(' ')
    const result = await db.prepare(`
      UPDATE members SET
        full_name = ?, first_name = ?, second_name = ?, last_name = ?,
        phone_number = ?, email = ?, county = ?, sub_county = ?, bank_name = ?, bank_branch = ?,
        bank_account_name = ?, bank_account_number = ?, bank_two_name = ?, bank_two_branch = ?,
        bank_two_account_name = ?, bank_two_account_number = ?, location = ?,
        marital_status = ?, next_kin_name = ?, next_kin_relationship = ?, next_kin_phone = ?
      WHERE id = ?
    `).bind(
      values.fullName, firstName, secondName, lastName, values.phoneNumber, values.email,
      values.county, values.subCounty, values.bankName, values.bankBranch,
      values.bankAccountName, values.bankAccountNumber, values.bankTwoName, values.bankTwoBranch,
      values.bankTwoAccountName, values.bankTwoAccountNumber, values.location,
      maritalStatus, values.nextKinName, values.nextKinRelationship, values.nextKinPhone,
      memberId,
    ).run()
    if (!result.meta.changes) {
      const member = await db.prepare('SELECT id FROM members WHERE id = ?').bind(memberId).first()
      if (!member) throw new ApiError('Member account was not found.', 404)
    }
    return json({ message: 'Member details updated.' })
  }

  const promoteMember = path.match(/^\/admin\/members\/(\d+)\/promote$/)
  if (promoteMember && method === 'POST') {
    if (session.adminRole !== 'superadmin') {
      throw new ApiError('Only the super administrator can promote members.', 403)
    }
    const memberId = Number(promoteMember[1])
    const member = await db.prepare(`
      SELECT id, national_id AS nationalId, full_name AS fullName,
        password_salt AS passwordSalt, password_hash AS passwordHash
      FROM members WHERE id = ?
    `).bind(memberId).first()
    if (!member) throw new ApiError('Member account was not found.', 404)
    if (!member.nationalId) throw new ApiError('This account cannot be promoted because it has no National ID.')
    const existingPromotion = await db.prepare('SELECT id FROM admins WHERE member_id = ?')
      .bind(memberId).first()
    if (existingPromotion) throw new ApiError('This account is already an administrator.', 409)
    try {
      const result = await db.prepare(`
        INSERT INTO admins (username, display_name, password_salt, password_hash, role, member_id)
        VALUES (?, ?, ?, ?, 'admin', ?)
      `).bind(member.nationalId, member.fullName, member.passwordSalt, member.passwordHash, memberId).run()
      if (!result.meta.changes) throw new ApiError('Could not promote this account.', 500)
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new ApiError('An administrator already uses this National ID as a username.', 409)
      }
      throw error
    }
    return json({ message: `${member.fullName} is now an administrator.` }, 201)
  }

  const memberDecision = path.match(/^\/admin\/members\/(\d+)\/decision$/)
  if (memberDecision && method === 'POST') {
    const memberId = Number(memberDecision[1])
    const decision = (await readJson(request)).decision
    if (!['approve', 'reject'].includes(decision)) {
      throw new ApiError('Choose approve or reject for this member account.')
    }
    const nextStatus = decision === 'approve' ? 'approved' : 'rejected'
    const result = await db.prepare(`
      UPDATE members SET account_status = ? WHERE id = ? AND account_status = 'pending'
    `).bind(nextStatus, memberId).run()
    if (!result.meta.changes) {
      const member = await db.prepare('SELECT id FROM members WHERE id = ?').bind(memberId).first()
      throw new ApiError(member ? 'This account has already been reviewed.' : 'Member account was not found.', member ? 409 : 404)
    }
    return json({ message: `Member account ${nextStatus}.`, status: nextStatus })
  }

  if (path === '/admin/loan-applications' && method === 'GET') {
    const applications = await db.prepare(`
      SELECT a.id, a.requested_amount AS requestedAmount,
        a.repayment_months AS repaymentMonths, a.purpose, a.status,
        a.security_type AS securityType,
        a.applied_at AS appliedAt, m.national_id AS nationalId, m.full_name AS fullName
      FROM loan_applications a JOIN members m ON m.id = a.member_id
      ORDER BY CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END, a.applied_at DESC, a.id DESC
      LIMIT 100
    `).all()
    return json({ applications: applications.results })
  }

  const applicationDecision = path.match(/^\/admin\/loan-applications\/(\d+)\/decision$/)
  if (applicationDecision && method === 'POST') {
    const applicationId = Number(applicationDecision[1])
    const decision = (await readJson(request)).decision
    if (!['approve', 'reject'].includes(decision)) {
      throw new ApiError('Choose approve or reject for this loan application.')
    }
    const application = await db.prepare(`
      SELECT id, member_id AS memberId, requested_amount AS requestedAmount,
        repayment_months AS repaymentMonths, status
      FROM loan_applications WHERE id = ?
    `).bind(applicationId).first()
    if (!application) throw new ApiError('Loan application was not found.', 404)
    if (application.status !== 'pending') throw new ApiError('This loan application has already been reviewed.', 409)
    if (decision === 'reject') {
      await db.prepare("UPDATE loan_applications SET status = 'rejected' WHERE id = ? AND status = 'pending'")
        .bind(applicationId).run()
      return json({ message: 'Loan application rejected.', status: 'rejected' })
    }

    const reference = `LN-${Date.now()}-${applicationId}`
    const totalRepayable = Math.round(application.requestedAmount * 1.1 * 100) / 100
    const statements = [
      db.prepare(`
        INSERT INTO member_loans (
          member_id, loan_reference, principal_amount, interest_rate, repayment_months,
          total_repayable, outstanding_balance, status, issued_at, security_type
        )
        SELECT ?, ?, ?, 10, ?, ?, ?, 'active', CURRENT_TIMESTAMP, 'savings'
        FROM loan_applications
        WHERE id = ? AND status = 'pending'
          AND ? <= MAX(0,
            COALESCE((SELECT SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END)
              FROM savings_transactions WHERE member_id = ?), 0)
            - COALESCE((SELECT SUM(outstanding_balance)
              FROM member_loans WHERE member_id = ? AND outstanding_balance > 0), 0)
            - COALESCE((SELECT SUM(requested_amount) FROM loan_applications
              WHERE member_id = ? AND status = 'pending' AND id != ?), 0)
          )
      `).bind(application.memberId, reference, application.requestedAmount,
        application.repaymentMonths, totalRepayable, totalRepayable,
        applicationId, application.requestedAmount, application.memberId,
        application.memberId, application.memberId, applicationId),
      db.prepare(`
        UPDATE loan_applications SET status = 'approved'
        WHERE id = ? AND status = 'pending'
          AND EXISTS (SELECT 1 FROM member_loans WHERE loan_reference = ?)
      `).bind(applicationId, reference),
    ]
    const result = await db.batch(statements)
    if (!result[0].meta.changes || !result[1].meta.changes) {
      throw new ApiError('Approval blocked: available savings changed or this application was already reviewed.', 409)
    }
    return json({ message: `Loan approved and issued as ${reference}.`, status: 'approved' })
  }

  if (path === '/admin/repayments' && method === 'GET') {
    const loans = await db.prepare(`
      SELECT l.id, l.loan_reference AS reference, l.principal_amount AS principalAmount,
        l.total_repayable AS totalRepayable, l.outstanding_balance AS outstandingBalance,
        l.repayment_months AS repaymentMonths, l.security_type AS securityType,
        l.status, l.issued_at AS issuedAt,
        m.national_id AS nationalId, m.full_name AS fullName
      FROM member_loans l JOIN members m ON m.id = l.member_id
      WHERE l.outstanding_balance > 0 ORDER BY l.issued_at ASC, l.id ASC
    `).all()
    return json({ loans: loans.results })
  }

  if (path === '/admin/repayments' && method === 'POST') {
    const body = await readJson(request)
    const loanId = Number(body.loanId)
    const amount = Math.round(Number(body.amount) * 100) / 100
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!Number.isInteger(loanId) || !Number.isFinite(amount) || amount <= 0) {
      throw new ApiError('Select a loan and enter a repayment amount greater than zero.')
    }
    if (description.length > 120) throw new ApiError('Description must be 120 characters or fewer.')
    const loan = await db.prepare('SELECT id, outstanding_balance AS balance FROM member_loans WHERE id = ?')
      .bind(loanId).first()
    if (!loan) throw new ApiError('Loan was not found.', 404)
    if (amount > loan.balance + 0.001) {
      throw new ApiError(`Payment exceeds the outstanding balance of ${Number(loan.balance).toFixed(2)}.`)
    }
    const balance = Math.max(0, Math.round((loan.balance - amount) * 100) / 100)
    const results = await db.batch([
      db.prepare(`
        INSERT INTO loan_repayments (loan_id, admin_id, amount, description)
        SELECT ?, ?, ?, ? WHERE (SELECT outstanding_balance FROM member_loans WHERE id = ?) >= ?
      `).bind(loanId, session.adminId, amount, description, loanId, amount - 0.001),
      db.prepare(`
        UPDATE member_loans SET outstanding_balance = ?, status = ?
        WHERE id = ? AND outstanding_balance >= ?
      `).bind(balance, balance === 0 ? 'paid' : 'active', loanId, amount - 0.001),
    ])
    if (!results[0].meta.changes || !results[1].meta.changes) {
      throw new ApiError('Payment exceeds the current outstanding balance.', 409)
    }
    return json({ message: 'Loan repayment recorded.', outstandingBalance: balance }, 201)
  }

  if (path === '/admin/dividends' && method === 'GET') {
    const payments = await db.prepare(`
      SELECT d.id, d.financial_period AS financialPeriod, d.amount, d.description,
        d.paid_at AS paidAt, m.national_id AS nationalId, m.full_name AS fullName
      FROM dividend_payments d JOIN members m ON m.id = d.member_id
      ORDER BY d.paid_at DESC, d.id DESC LIMIT 100
    `).all()
    return json({ payments: payments.results })
  }

  if (path === '/admin/dividends' && method === 'POST') {
    const body = await readJson(request)
    const memberId = Number(body.memberId)
    const amount = Number(body.amount)
    const financialPeriod = typeof body.financialPeriod === 'string' ? body.financialPeriod.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!Number.isInteger(memberId) || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
      throw new ApiError('Select a member and enter a dividend amount greater than zero.')
    }
    if (financialPeriod.length < 2 || financialPeriod.length > 24 || description.length > 120) {
      throw new ApiError('Enter a valid financial period and a description up to 120 characters.')
    }
    const result = await db.prepare(`
      INSERT INTO dividend_payments (member_id, financial_period, amount, description)
      SELECT id, ?, ?, ? FROM members WHERE id = ? AND account_status = 'approved'
    `).bind(financialPeriod, amount, description, memberId).run()
    if (!result.meta.changes) throw new ApiError('Approved member account was not found.', 404)
    return json({ message: 'Dividend payment recorded.' }, 201)
  }

  if (path === '/admin/savings' && method === 'POST') {
    const body = await readJson(request)
    const memberId = Number(body.memberId)
    const entryType = body.entryType
    const amount = Number(body.amount)
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!Number.isInteger(memberId) || entryType !== 'deposit') {
      throw new ApiError('Savings entries can only be deposits. Members use loans for borrowing.')
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
      throw new ApiError('Enter an amount greater than zero.')
    }
    if (description.length > 120) throw new ApiError('Description must be 120 characters or fewer.')
    const member = await db.prepare('SELECT id FROM members WHERE id = ?').bind(memberId).first()
    if (!member) throw new ApiError('Member account was not found.', 404)
    await db.prepare(`
      INSERT INTO savings_transactions (member_id, entry_type, amount, description)
      VALUES (?, 'deposit', ?, ?)
    `).bind(memberId, amount, description || 'Savings deposit').run()
    const balance = await db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END), 0) AS balance
      FROM savings_transactions WHERE member_id = ?
    `).bind(memberId).first()
    return json({ message: 'Savings entry recorded.', balance: balance.balance }, 201)
  }

  const importMatch = path.match(/^\/admin\/imports\/(savings|repayments)$/)
  if (importMatch && method === 'POST') {
    return importRows(request, session, db, importMatch[1])
  }

  return null
}

function normalizeImportDate(value, rowNumber) {
  const date = typeof value === 'string' ? value.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(`Row ${rowNumber}: date must use YYYY-MM-DD.`)
  }
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ApiError(`Row ${rowNumber}: date must be a valid calendar date.`)
  }
  return date
}

async function importRows(request, session, db, kind) {
  const rawRows = (await readJson(request)).rows
  if (!Array.isArray(rawRows) || rawRows.length === 0 || rawRows.length > MAX_IMPORT_ROWS) {
    throw new ApiError(`Upload between 1 and ${MAX_IMPORT_ROWS} rows per batch.`)
  }
  const rows = rawRows.map((row, index) => {
    const rowNumber = index + 2
    const amount = Math.round(Number(row?.amount) * 100) / 100
    const description = typeof row?.description === 'string' ? row.description.trim() : ''
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
      throw new ApiError(`Row ${rowNumber}: amount must be greater than zero.`)
    }
    if (description.length > 120) throw new ApiError(`Row ${rowNumber}: description must be 120 characters or fewer.`)
    const date = normalizeImportDate(row?.date, rowNumber)
    if (kind === 'savings') {
      const nationalId = typeof row?.nationalId === 'string' ? row.nationalId.trim() : ''
      const entryType = typeof row?.entryType === 'string' && row.entryType.trim()
        ? row.entryType.trim().toLowerCase()
        : 'deposit'
      if (!/^\d{6,12}$/.test(nationalId)) throw new ApiError(`Row ${rowNumber}: invalid National ID.`)
      if (entryType !== 'deposit') {
        throw new ApiError(`Row ${rowNumber}: savings entries can only be deposits. Members use loans for borrowing.`)
      }
      return { nationalId, entryType, amount, description, date, rowNumber }
    }
    const loanReference = typeof row?.loanReference === 'string' ? row.loanReference.trim() : ''
    if (!loanReference) throw new ApiError(`Row ${rowNumber}: loanReference is required.`)
    return { loanReference, amount, description, date, rowNumber }
  })
  const contentHash = await sha256(JSON.stringify({ type: kind, rows }))
  const prior = await db.prepare('SELECT id FROM bulk_import_batches WHERE content_hash = ?')
    .bind(contentHash).first()
  if (prior) throw new ApiError(`This ${kind === 'savings' ? 'savings' : 'repayment'} file has already been imported.`, 409)

  const statements = [
    db.prepare(`
      INSERT INTO bulk_import_batches (import_type, content_hash, imported_rows, imported_by)
      VALUES (?, ?, ?, ?)
    `).bind(kind, contentHash, rows.length, session.adminId),
  ]
  if (kind === 'savings') {
    for (const row of rows) {
      const member = await db.prepare(`
        SELECT id FROM members WHERE national_id = ? COLLATE NOCASE AND account_status = 'approved'
      `).bind(row.nationalId).first()
      if (!member) throw new ApiError(`Row ${row.rowNumber}: no approved member has National ID ${row.nationalId}.`)
      statements.push(db.prepare(`
        INSERT INTO savings_transactions (member_id, entry_type, amount, description, occurred_at)
        VALUES (?, 'deposit', ?, ?, ?)
      `).bind(member.id, row.amount, row.description || 'Savings deposit', `${row.date} 12:00:00`))
    }
  } else {
    const balances = new Map()
    for (const row of rows) {
      let loan = balances.get(row.loanReference)
      if (!loan) {
        loan = await db.prepare(`
          SELECT id, outstanding_balance AS balance FROM member_loans WHERE loan_reference = ?
        `).bind(row.loanReference).first()
        if (!loan) throw new ApiError(`Row ${row.rowNumber}: loan ${row.loanReference} was not found.`)
        balances.set(row.loanReference, loan)
      }
      if (row.amount > loan.balance + 0.001) {
        throw new ApiError(`Row ${row.rowNumber}: repayment exceeds the remaining balance for loan ${row.loanReference}.`)
      }
      loan.balance = Math.max(0, Math.round((loan.balance - row.amount) * 100) / 100)
      statements.push(db.prepare(`
        INSERT INTO loan_repayments (loan_id, admin_id, amount, description, paid_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(loan.id, session.adminId, row.amount, row.description || 'Loan repayment', `${row.date} 12:00:00`))
      statements.push(db.prepare(`
        UPDATE member_loans SET outstanding_balance = ?, status = ? WHERE id = ?
      `).bind(loan.balance, loan.balance === 0 ? 'paid' : 'active', loan.id))
    }
  }
  try {
    const results = await db.batch(statements)
    const batchId = results[0].meta.last_row_id
    return json({
      message: `Imported ${rows.length} ${kind === 'savings' ? 'savings entries' : 'loan repayments'}.`,
      batchId,
      importedRows: rows.length,
    }, 201)
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed')) {
      throw new ApiError(`This ${kind === 'savings' ? 'savings' : 'repayment'} file has already been imported.`, 409)
    }
    throw error
  }
}

export async function onRequest(context) {
  try {
    const { request, env } = context
    if (!env.DB) throw new Error('The D1 binding "DB" is not configured.')
    if (!new URL(request.url).pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404)
    const paramPath = context.params.path ?? ''
    const path = `/${Array.isArray(paramPath) ? paramPath.join('/') : paramPath}`
    const result = await handleAuth(path, request, env)
      ?? await handleMember(path, request, env)
      ?? await handleAdmin(path, request, env)
    return result ?? json({ error: 'Not found.' }, 404)
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status)
    console.error('API request failed:', error)
    return json({ error: 'An unexpected server error occurred.' }, 500)
  }
}
