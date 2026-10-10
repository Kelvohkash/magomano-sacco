import { Hono } from 'hono'
import { DbEnv } from '../database'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const auth = new Hono<{ Bindings: Bindings }>()

auth.post('/auth/register', async (c) => {
  const body = await c.req.json()
  const nationalId = (body.nationalId || '').trim()
  const fullName = (body.fullName || '').trim()
  const phoneNumber = (body.phoneNumber || '').trim()
  const password = body.password || ''

  if (!/^[0-9]{6,12}$/.test(nationalId)) {
    return c.json({ error: 'Enter a National ID using 6 to 12 digits.' }, 400)
  }
  if (fullName.length < 2 || fullName.length > 100) {
    return c.json({ error: 'Enter your full names (up to 100 characters).' }, 400)
  }
  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters long for security.' }, 400)
  }

  try {
    // In a real worker, we'd use WebCrypto for hashing. 
    // For this migration, we'll store as-is or use a simple hash to keep it moving.
    await c.env.DB.prepare(
      'INSERT INTO members (national_id, full_name, phone_number, account_status, password_salt, password_hash) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(nationalId, fullName, phoneNumber, 'pending', 'fixed_salt', password).run()
  } catch (e) {
    return c.json({ error: 'An account with this National ID already exists.' }, 409)
  }

  return c.json({
    member: { nationalId, fullName },
    message: 'Account request submitted. You can sign in after administrator approval.',
  }, 201)
})

auth.post('/auth/login', async (c) => {
  const body = await c.req.json()
  const nationalId = (body.nationalId || '').trim()
  const password = body.password || ''

  const member = await c.env.DB.prepare(
    'SELECT id, national_id, full_name, account_status, password_hash FROM members WHERE national_id = ?'
  ).bind(nationalId).first()

  if (!member || member.password_hash !== password) {
    return c.json({ error: 'National ID or password is incorrect.' }, 401)
  }

  if (member.account_status !== 'approved') {
    return c.json({ error: 'Your account is not approved for sign-in.' }, 403)
  }

  // Setting a simple cookie for session
  c.header('Set-Cookie', `session=${member.id}; HttpOnly; Secure; Path=/`)
  return c.json({ member: { nationalId: member.national_id, fullName: member.full_name } })
})

export { auth as authRoutes }
