import { ApiError, json, readJson } from './shared.js'

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
export async function handleMemberAccount(path, request, session, env) {
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
  return null
}
