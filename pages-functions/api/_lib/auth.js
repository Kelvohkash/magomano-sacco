import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import {
  ApiError,
  currentSession,
  getCookie,
  hashPassword,
  json,
  loginSession,
  readJson,
  sha256,
  SESSION_COOKIE,
  withSessionCookie,
} from './shared.js'

export async function handleAuth(path, request, env) {
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
