import { ApiError, json, readJson } from './shared.js'

export async function handleAdminCharges(path, request, session, db) {
  if (path !== '/admin/charges') return null

  if (request.method === 'GET') {
    const result = await db.prepare(`
      SELECT c.id, c.description, c.amount, c.target_type AS targetType,
        c.created_at AS createdAt,
        COUNT(a.member_id) AS targetCount,
        SUM(CASE WHEN a.status = 'applied' THEN 1 ELSE 0 END) AS appliedCount,
        SUM(CASE WHEN a.status = 'insufficient_savings' THEN 1 ELSE 0 END) AS insufficientCount
      FROM admin_charges c
      LEFT JOIN admin_charge_applications a ON a.charge_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT 100
    `).all()
    return json({ charges: result.results.map((charge) => ({
      ...charge,
      amount: Number(charge.amount),
      targetCount: Number(charge.targetCount),
      appliedCount: Number(charge.appliedCount),
      insufficientCount: Number(charge.insufficientCount),
    })) })
  }

  if (request.method !== 'POST') return null
  const body = await readJson(request)
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const amount = Number(body.amount)
  const targetType = body.targetType
  const memberIds = Array.isArray(body.memberIds)
    ? [...new Set(body.memberIds.map(Number))]
    : []

  if (!description || description.length > 160) {
    throw new ApiError('Charge description must be 1 to 160 characters.')
  }
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) / 100 <= 0) {
    throw new ApiError('Enter a charge amount of at least 0.01.')
  }
  if (!['individual', 'group', 'all'].includes(targetType)) {
    throw new ApiError('Choose an individual member, a selected group, or all members.')
  }
  if ((targetType === 'individual' && memberIds.length !== 1)
    || (targetType === 'group' && (memberIds.length < 2 || memberIds.length > 500))
    || (targetType === 'all' && memberIds.length)) {
    throw new ApiError('Select one member, between 2 and 500 group members, or all members.')
  }
  if (memberIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    throw new ApiError('Choose valid member accounts.')
  }

  let targetSql = ''
  const targetParams = []
  if (targetType !== 'all') {
    targetSql = `AND m.id IN (${memberIds.map(() => '?').join(', ')})`
    targetParams.push(...memberIds)
  }
  const targetCount = await db.prepare(`
    SELECT COUNT(*) AS total FROM members m
    WHERE m.account_status = 'approved' ${targetSql}
  `).bind(...targetParams).first()
  if (Number(targetCount.total) !== (targetType === 'all' ? Number(targetCount.total) : memberIds.length)) {
    throw new ApiError('Selected recipients must all be approved members.')
  }
  if (Number(targetCount.total) === 0) throw new ApiError('There are no approved members in this audience.')

  const roundedAmount = Math.round(amount * 100) / 100
  const requestKey = crypto.randomUUID()
  const statements = [
    db.prepare(`
      INSERT INTO admin_charges (request_key, description, amount, target_type, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).bind(requestKey, description, roundedAmount, targetType, session.adminId),
    db.prepare(`
      INSERT INTO admin_charge_applications (charge_id, member_id, amount, status)
      SELECT c.id, m.id, c.amount,
        CASE WHEN COALESCE((
          SELECT SUM(CASE WHEN st.entry_type = 'deposit' THEN st.amount ELSE -st.amount END)
          FROM savings_transactions st WHERE st.member_id = m.id
        ), 0) >= c.amount THEN 'applied' ELSE 'insufficient_savings' END
      FROM members m
      JOIN admin_charges c ON c.request_key = ?
      WHERE m.account_status = 'approved' ${targetSql}
    `).bind(requestKey, ...targetParams),
    db.prepare(`
      INSERT INTO savings_transactions (member_id, entry_type, amount, description)
      SELECT a.member_id, 'withdrawal', a.amount, 'Admin charge: ' || c.description
      FROM admin_charge_applications a
      JOIN admin_charges c ON c.id = a.charge_id
      WHERE c.request_key = ? AND a.status = 'applied'
    `).bind(requestKey),
  ]
  await db.batch(statements)
  const counts = await db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) AS applied,
      SUM(CASE WHEN status = 'insufficient_savings' THEN 1 ELSE 0 END) AS insufficient
    FROM admin_charge_applications a
    JOIN admin_charges c ON c.id = a.charge_id
    WHERE c.request_key = ?
  `).bind(requestKey).first()
  return json({
    message: `Charge issued to ${Number(counts.applied ?? 0)} member${Number(counts.applied) === 1 ? '' : 's'}. ${Number(counts.insufficient ?? 0)} member${Number(counts.insufficient) === 1 ? '' : 's'} had insufficient savings and were not charged.`,
    appliedCount: Number(counts.applied ?? 0),
    insufficientCount: Number(counts.insufficient ?? 0),
  }, 201)
}
