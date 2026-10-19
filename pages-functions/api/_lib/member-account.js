import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { ApiError, hashPassword, json, readJson } from './shared.js'

async function memberProfile(request, session, env) {
  if (request.method === 'GET') {
    const profile = await env.DB.prepare(`SELECT phone_number AS phoneNumber, email,
      job_title AS jobTitle, work_branch AS workBranch,
      county, sub_county AS subCounty, location, bank_name AS bankName, bank_branch AS bankBranch,
      bank_account_name AS bankAccountName, bank_account_number AS bankAccountNumber,
      bank_two_name AS bankTwoName, bank_two_branch AS bankTwoBranch,
      bank_two_account_name AS bankTwoAccountName, bank_two_account_number AS bankTwoAccountNumber,
      next_kin_name AS nextKinName, next_kin_relationship AS nextKinRelationship,
      next_kin_phone AS nextKinPhone FROM members WHERE id = ?`).bind(session.memberId).first()
    if (!profile) throw new ApiError('Member account was not found.', 404)
    return json({ profile })
  }
  if (request.method !== 'PUT') return null
  const body = await readJson(request)
  const keys = ['phoneNumber','email','jobTitle','workBranch','county','subCounty','location','bankName','bankBranch',
    'bankAccountName','bankAccountNumber','bankTwoName','bankTwoBranch','bankTwoAccountName',
    'bankTwoAccountNumber','nextKinName','nextKinRelationship','nextKinPhone']
  const values = Object.fromEntries(keys.map((key) => [key, typeof body[key] === 'string' ? body[key].trim() : '']))
  const limits = { phoneNumber: 32, email: 254, jobTitle: 100, workBranch: 100, county: 100, subCounty: 100, location: 160,
    bankName: 100, bankBranch: 100, bankAccountName: 120, bankAccountNumber: 64,
    bankTwoName: 100, bankTwoBranch: 100, bankTwoAccountName: 120, bankTwoAccountNumber: 64,
    nextKinName: 100, nextKinRelationship: 60, nextKinPhone: 32 }
  for (const [key, max] of Object.entries(limits)) {
    if (values[key].length > max) throw new ApiError(`${key} must be ${max} characters or fewer.`)
  }
  if (values.phoneNumber.length < 5) throw new ApiError('Enter a valid phone number.')
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) throw new ApiError('Enter a valid email address, or leave it blank.')
  // Cancel any existing pending change for this member, then insert new one
  await env.DB.prepare(`UPDATE pending_profile_changes SET status='cancelled' WHERE member_id=? AND status='pending'`).bind(session.memberId).run()
  await env.DB.prepare(`INSERT INTO pending_profile_changes (member_id, changes_json) VALUES (?, ?)`)
    .bind(session.memberId, JSON.stringify(values)).run()
  return json({ message: 'Your changes have been submitted for admin review. They will take effect once approved.' })
}

async function changePassword(request, session, env) {
  if (request.method !== 'POST') return null
  const body = await readJson(request)
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  if (newPassword.length < 8 || newPassword.length > 256) throw new ApiError('New password must be 8 to 256 characters.')
  const member = await env.DB.prepare('SELECT password_salt, password_hash FROM members WHERE id=?').bind(session.memberId).first()
  if (!member) throw new ApiError('Member account was not found.', 404)
  const submitted = Buffer.from(hashPassword(currentPassword, member.password_salt), 'hex')
  const expected = Buffer.from(member.password_hash, 'hex')
  if (submitted.length !== expected.length || !timingSafeEqual(submitted, expected)) throw new ApiError('Current password is incorrect.', 401)
  const salt = randomBytes(16).toString('hex')
  await env.DB.prepare('UPDATE members SET password_salt=?, password_hash=? WHERE id=?')
    .bind(salt, hashPassword(newPassword, salt), session.memberId).run()
  await env.DB.prepare('DELETE FROM sessions WHERE member_id=? AND token_hash != ?').bind(session.memberId, session.tokenHash).run()
  return json({ message: 'Password changed. Other signed-in sessions were signed out.' })
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
async function pendingProfileChange(request, session, env) {
  if (request.method !== 'GET') return null
  const row = await env.DB.prepare(
    `SELECT id, changes_json AS changesJson, status, submitted_at AS submittedAt, admin_note AS adminNote
     FROM pending_profile_changes WHERE member_id=? AND status='pending'
     ORDER BY submitted_at DESC LIMIT 1`
  ).bind(session.memberId).first()
  if (!row) return json({ pending: null })
  return json({ pending: { id: row.id, status: row.status, submittedAt: row.submittedAt, adminNote: row.adminNote, changes: JSON.parse(row.changesJson) } })
}

export async function handleMemberAccount(path, request, session, env) {
  if (path === '/member/profile') return memberProfile(request, session, env)
  if (path === '/member/password') return changePassword(request, session, env)
  if (path === '/member/contacts') return memberContacts(request, session, env)

  const contactDelete = path.match(/^\/member\/contacts\/(\d+)$/)
  if (contactDelete && request.method === 'DELETE') {
    const contactId = Number(contactDelete[1])
    const result = await env.DB.prepare('DELETE FROM member_contacts WHERE id = ? AND member_id = ?')
      .bind(contactId, session.memberId).run()
    if (!result.meta.changes) throw new ApiError('Contact was not found.', 404)
    return json({ message: 'Contact removed.' })
  }

  if (path === '/member/terms' && request.method === 'GET') {
    const terms = await env.DB.prepare('SELECT content, updated_at AS updatedAt FROM sacco_terms WHERE id = 1').first()
    return json({ terms: terms?.content ?? '', updatedAt: terms?.updatedAt ?? null })
  }
  if (path === '/member/profile/pending' && request.method === 'GET') return pendingProfileChange(request, session, env)
  return null
}
