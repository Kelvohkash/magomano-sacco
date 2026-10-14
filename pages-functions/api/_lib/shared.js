import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'magomano_session'
const SESSION_TTL_SECONDS = 12 * 60 * 60

export function ApiError(message, status = 400) {
  const error = new Error(message)
  error.name = 'ApiError'
  error.status = status
  return error
}

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers })
}

export function getStatementFilters(url, { status = false } = {}) {
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
  if (requestedStatus && !['active', 'paid', 'pending', 'approved', 'rejected', 'disbursed', 'decision'].includes(requestedStatus)) {
    throw new ApiError('Choose a valid statement status.')
  }
  return { from, to, search, status: requestedStatus }
}

export function getCookie(request, name) {
  const prefix = `${name}=`
  const part = (request.headers.get('Cookie') ?? '').split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
  return part?.slice(prefix.length) ?? ''
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function loanApplicationHash(application) {
  return sha256(`MAGOMANO-LOAN-APPLICATION-V1:${JSON.stringify([
    Number(application.id), Number(application.memberId), Number(application.requestedAmount),
    Number(application.repaymentMonths), application.purpose, application.payoutBankName,
    application.payoutBankBranch, application.payoutAccountName, application.payoutAccountNumber,
    application.electronicSignatureName, application.electronicallySignedAt,
  ])}`)
}

export function hashPassword(password, saltHex) {
  return scryptSync(password, Buffer.from(saltHex, 'hex'), 64).toString('hex')
}

function hashesMatch(left, right) {
  const leftHash = Buffer.from(left, 'hex')
  const rightHash = Buffer.from(right, 'hex')
  return leftHash.length === rightHash.length && timingSafeEqual(leftHash, rightHash)
}

export async function readJson(request) {
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

export async function currentSession(request, env) {
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

export async function requireRole(request, env, role) {
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
  const capacitorOrigin = request.headers.get('Origin') === 'https://localhost'
  const secure = new URL(request.url).protocol === 'https:' || capacitorOrigin
  response.headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=${capacitorOrigin ? 'None' : 'Strict'}; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`)
  return response
}
export function withSessionCookie(response, request, token = '') {
  const capacitorOrigin = request.headers.get('Origin') === 'https://localhost'
  const secure = new URL(request.url).protocol === 'https:' || capacitorOrigin ? '; Secure' : ''
  response.headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=${capacitorOrigin ? 'None' : 'Strict'}; Max-Age=${token ? SESSION_TTL_SECONDS : 0}${secure}`)
  return response
}

export async function loginSession(env, request, body, role, row) {
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
      cacheScope: `admin:${row.id}`,
    }
    : { member: { nationalId: row.national_id, fullName: row.full_name }, cacheScope: `member:${row.id}` })
  await startSession(env, request, response, role === 'admin'
    ? { role, adminId: row.id }
    : { role, memberId: row.id })
  return response
}
