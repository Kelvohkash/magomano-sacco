import { ApiError, getStatementFilters, json, readJson } from './shared.js'

export async function handleAdminOverview(path, request, session, db) {
  const method = request.method
  if (path === '/admin/member-messages' && method === 'GET') {
    const messages = await db.prepare(`
      SELECT p.id, p.title, p.body, p.target_type AS targetType,
        p.target_member_id AS targetMemberId, m.full_name AS targetMemberName,
        m.sacco_number AS targetSaccoNumber,
        (SELECT group_concat(rm.full_name, ', ') FROM member_popup_message_recipients r
          JOIN members rm ON rm.id = r.member_id WHERE r.message_id = p.id) AS targetMemberNames,
        (SELECT COUNT(*) FROM member_popup_message_recipients r WHERE r.message_id = p.id) AS targetMemberCount,
        p.active, p.created_at AS createdAt
      FROM member_popup_messages p
      LEFT JOIN members m ON m.id = p.target_member_id
      ORDER BY p.active DESC, p.created_at DESC, p.id DESC
      LIMIT 200
    `).all()
    return json({ messages: messages.results.map((message) => ({
      ...message,
      active: Boolean(message.active),
    })) })
  }

  if (path === '/admin/member-messages' && method === 'POST') {
    const body = await readJson(request)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const messageBody = typeof body.body === 'string' ? body.body.trim() : ''
    const targetType = body.targetType
    const targetMemberIds = Array.isArray(body.targetMemberIds)
      ? [...new Set(body.targetMemberIds.map(Number))]
      : [Number(body.targetMemberId)]
    if (title.length < 1 || title.length > 120) throw new ApiError('Message title must be 1 to 120 characters.')
    if (messageBody.length < 1 || messageBody.length > 2000) throw new ApiError('Message must be 1 to 2,000 characters.')
    if (!['all', 'member'].includes(targetType)) throw new ApiError('Choose all members or one member as the audience.')
    if (targetType === 'member' && (!targetMemberIds.length || targetMemberIds.some((id) => !Number.isInteger(id) || id < 1))) {
      throw new ApiError('Choose a member for this message.')
    }
    if (targetType === 'member') {
      const placeholders = targetMemberIds.map(() => '?').join(', ')
      const members = await db.prepare(`SELECT id FROM members WHERE account_status = 'approved' AND id IN (${placeholders})`)
        .bind(...targetMemberIds).all()
      if (members.results.length !== targetMemberIds.length) throw new ApiError('Choose approved members for this message.')
    }
    const result = await db.prepare(`
      INSERT INTO member_popup_messages (title, body, target_type, target_member_id, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).bind(title, messageBody, targetType, targetType === 'member' ? targetMemberIds[0] : null, session.adminId).run()
    if (targetType === 'member') {
      await db.batch(targetMemberIds.map((memberId) => db.prepare(`
        INSERT INTO member_popup_message_recipients (message_id, member_id) VALUES (?, ?)
      `).bind(result.meta.last_row_id, memberId)))
    }
    return json({ id: result.meta.last_row_id, message: 'Member message created.' }, 201)
  }

  const popupMessage = path.match(/^\/admin\/member-messages\/(\d+)$/)
  if (popupMessage && method === 'PUT') {
    const messageId = Number(popupMessage[1])
    const body = await readJson(request)
    if (typeof body.active !== 'boolean') throw new ApiError('Choose whether this member message is active.')
    const result = await db.prepare(`
      UPDATE member_popup_messages SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(body.active ? 1 : 0, messageId).run()
    if (!result.meta.changes) throw new ApiError('Member message was not found.', 404)
    return json({ message: body.active ? 'Member message activated.' : 'Member message deactivated.' })
  }

  if (popupMessage && method === 'DELETE') {
    const result = await db.prepare('DELETE FROM member_popup_messages WHERE id = ?')
      .bind(Number(popupMessage[1])).run()
    if (!result.meta.changes) throw new ApiError('Member message was not found.', 404)
    return json({ message: 'Member message deleted.' })
  }

  if (path === '/admin/maintenance' && method === 'GET') {
    const maintenance = await db.prepare(`
      SELECT enabled, message, updated_at AS updatedAt FROM maintenance_mode WHERE id = 1
    `).first()
    return json({
      enabled: Boolean(maintenance?.enabled),
      message: maintenance?.message ?? 'We are carrying out maintenance. Please try again later.',
      updatedAt: maintenance?.updatedAt ?? null,
    })
  }

  if (path === '/admin/maintenance' && method === 'PUT') {
    const body = await readJson(request)
    if (typeof body.enabled !== 'boolean') throw new ApiError('Choose whether maintenance mode is on or off.')
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (message.length > 500) throw new ApiError('The maintenance message must be 500 characters or fewer.')
    const statusMessage = message || 'We are carrying out maintenance. Please try again later.'
    await db.prepare(`
      UPDATE maintenance_mode
      SET enabled = ?, message = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).bind(body.enabled ? 1 : 0, statusMessage, session.adminId).run()
    return json({
      enabled: body.enabled,
      message: statusMessage,
      notice: body.enabled ? 'Maintenance mode is now on.' : 'Maintenance mode is now off.',
    })
  }

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
    if (filters.status && type === 'applications' && !['pending', 'approved', 'rejected', 'disbursed'].includes(filters.status)) {
      throw new ApiError('Choose a valid application status filter.')
    }
    const pageSize = 10
    const offset = (page - 1) * pageSize
    const statements = {
      savings: {
        idColumn: 's.id',
        table: 'savings_transactions',
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
        idColumn: 'r.id',
        table: 'loan_repayments',
        from: 'r.paid_at',
        fromTable: 'loan_repayments r JOIN member_loans l ON l.id = r.loan_id JOIN members m ON m.id = l.member_id',
        where: [],
        fields: 'r.id, l.loan_reference AS loanReference, r.amount, r.description, r.paid_at AS paidAt, m.full_name AS fullName, m.national_id AS nationalId',
        order: 'r.paid_at DESC, r.id DESC',
        search: '(m.full_name LIKE ? OR m.national_id LIKE ? OR l.loan_reference LIKE ? OR r.description LIKE ?)',
      },
      dividends: {
        idColumn: 'd.id',
        table: 'dividend_payments',
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
        fields: 'a.id, a.requested_amount AS requestedAmount, a.repayment_months AS repaymentMonths, a.purpose, a.status, a.security_type AS securityType, a.applied_at AS appliedAt, m.full_name AS fullName, m.national_id AS nationalId, a.payout_bank_name AS payoutBankName, a.payout_bank_branch AS payoutBankBranch, a.payout_account_name AS payoutAccountName, a.payout_account_number AS payoutAccountNumber, a.electronic_signature_name AS electronicSignatureName, a.electronically_signed_at AS electronicallySignedAt',
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
    const afterIdValue = Number(url.searchParams.get('afterId'))
    const canDeltaSync = page === 1 && Number.isInteger(afterIdValue) && afterIdValue >= 0 && definition.idColumn && definition.table
    if (canDeltaSync) {
      const latest = await db.prepare(`SELECT COALESCE(MAX(id), 0) AS latestId FROM ${definition.table}`).first()
      const [deltaItems, deltaCount] = await Promise.all([
        db.prepare(`SELECT ${definition.fields} FROM ${definition.fromTable}
          ${whereSql}${whereSql ? ' AND ' : 'WHERE '}${definition.idColumn} > ?
          ORDER BY ${definition.idColumn} ASC`).bind(...params, afterIdValue).all(),
        db.prepare(`SELECT COUNT(*) AS total FROM ${definition.fromTable} ${whereSql}`).bind(...params).first(),
      ])
      return json({ items: deltaItems.results, total: deltaCount.total, latestId: latest.latestId, delta: true, page, pageSize })
    }
    const [count, items, latest] = await Promise.all([
      db.prepare(`SELECT COUNT(*) AS total FROM ${definition.fromTable} ${whereSql}`).bind(...params).first(),
      db.prepare(`SELECT ${definition.fields} FROM ${definition.fromTable} ${whereSql} ORDER BY ${definition.order} LIMIT ? OFFSET ?`)
        .bind(...params, pageSize, offset).all(),
      definition.table
        ? db.prepare(`SELECT COALESCE(MAX(id), 0) AS latestId FROM ${definition.table}`).first()
        : Promise.resolve(null),
    ])
    return json({ items: items.results, total: count.total, latestId: latest?.latestId ?? 0, page, pageSize })
  }

  if (path === '/admin/dashboard' && method === 'GET') {
    const [members, savings, loans, dividends, applications, interest] = await Promise.all([
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
      db.prepare(`
        SELECT MAX(0,
          COALESCE((SELECT SUM(MAX(0, MIN(l.total_repayable - l.principal_amount,
            l.total_repayable - l.outstanding_balance))) FROM member_loans l), 0)
          - COALESCE((SELECT SUM(amount) FROM interest_disbursements), 0)
        ) AS held
      `).first(),
    ])
    return json({
      members,
      totalSavings: savings.total,
      loansIssued: loans.issued,
      pendingPayments: loans.pendingPayments,
      interestHeld: interest.held,
      dividendsPaid: dividends.total,
      pendingLoanApplications: applications.total,
    })
  }
  return null
}
