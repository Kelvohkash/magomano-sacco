import { ApiError, getStatementFilters, json } from './shared.js'

export async function getMemberBorrowingCapacity(env, memberId) {
  const result = await env.DB.prepare(`
    SELECT
      COALESCE((SELECT SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END)
        FROM savings_transactions WHERE member_id = ?), 0) AS savingsBalance,
      COALESCE((SELECT SUM(outstanding_balance)
        FROM member_loans WHERE member_id = ? AND outstanding_balance > 0), 0) AS activeLoanBalance,
      COALESCE((SELECT SUM(requested_amount * 1.1)
        FROM loan_applications WHERE member_id = ? AND status IN ('pending', 'approved')), 0) AS pendingApplications
  `).bind(memberId, memberId, memberId).first()
  return {
    ...result,
    availableBalance: Math.floor(Math.max(0, result.savingsBalance - result.activeLoanBalance - result.pendingApplications) * 0.9 * 100) / 100,
  }
}

export async function memberDashboard(session, env) {
  const memberId = session.memberId
  const member = await env.DB.prepare(`
    SELECT national_id, full_name,
      bank_name AS bankName, bank_branch AS bankBranch,
      bank_account_name AS bankAccountName, bank_account_number AS bankAccountNumber,
      bank_two_name AS bankTwoName, bank_two_branch AS bankTwoBranch,
      bank_two_account_name AS bankTwoAccountName, bank_two_account_number AS bankTwoAccountNumber
    FROM members WHERE id = ?
  `).bind(memberId).first()
  if (!member) throw new ApiError('Please sign in to continue.', 401)

  const [borrowingCapacity, loanTotals, maintenance, memberMessages] = await Promise.all([
    getMemberBorrowingCapacity(env, memberId),
    env.DB.prepare(`
      SELECT COALESCE(SUM(outstanding_balance), 0) AS balance
      FROM member_loans WHERE member_id = ?
    `).bind(memberId).first(),
    env.DB.prepare('SELECT enabled, message FROM maintenance_mode WHERE id = 1').first(),
    env.DB.prepare(`
      SELECT id, title, body, created_at AS createdAt
      FROM member_popup_messages
      WHERE active = 1 AND (target_type = 'all' OR EXISTS (
        SELECT 1 FROM member_popup_message_recipients r
        WHERE r.message_id = member_popup_messages.id AND r.member_id = ?
      ) OR target_member_id = ?)
      ORDER BY created_at ASC, id ASC
    `).bind(memberId, memberId).all(),
  ])

  // Only applied admin charges belong in the member-facing debit summary.
  const [adminChargeTotal, recentAdminCharges] = await Promise.all([
    env.DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM admin_charge_applications WHERE member_id = ? AND status = 'applied'
    `).bind(memberId).first(),
    env.DB.prepare(`
      SELECT c.id, c.amount, c.description, a.applied_at AS occurredAt
      FROM admin_charge_applications a
      JOIN admin_charges c ON c.id = a.charge_id
      WHERE a.member_id = ? AND a.status = 'applied'
      ORDER BY a.applied_at DESC, a.charge_id DESC
      LIMIT 3
    `).bind(memberId).all(),
  ])

  return json({
    member: {
      id: memberId,
      national_id: member.national_id,
      full_name: member.full_name,
      bankAccounts: [
        {
          id: 'primary',
          bankName: member.bankName,
          branch: member.bankBranch,
          accountName: member.bankAccountName,
          accountNumber: member.bankAccountNumber,
        },
        {
          id: 'secondary',
          bankName: member.bankTwoName,
          branch: member.bankTwoBranch,
          accountName: member.bankTwoAccountName,
          accountNumber: member.bankTwoAccountNumber,
        },
      ].filter((account) => account.bankName && account.accountNumber),
    },
    maintenance: {
      enabled: Boolean(maintenance?.enabled),
      message: maintenance?.message ?? 'We are carrying out maintenance. Please try again later.',
    },
    memberMessages: memberMessages.results,
    borrowingCapacity,
    savings: { balance: borrowingCapacity.savingsBalance, statement: [] },
    loans: {
      outstandingBalance: loanTotals.balance,
      statement: [],
      repayments: [],
    },
    adminCharges: {
      total: Number(adminChargeTotal.total ?? 0),
      recent: recentAdminCharges.results,
    },
  })
}

export async function memberTransactions(request, session, env) {
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

  const pageSize = 5
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
    const where = ['member_id = ?', ...dateConditions]
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
        interest_rate AS interestRate,
        CASE WHEN legacy_imported = 1 THEN NULL ELSE repayment_months END AS repaymentMonths,
        total_repayable AS totalRepayable,
        MAX(0, total_repayable - outstanding_balance) AS paidAmount,
        outstanding_balance AS outstandingBalance, security_type AS securityType,
        status, CASE WHEN legacy_imported = 1 THEN NULL ELSE issued_at END AS issuedAt,
        legacy_imported AS legacyImported
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
      SELECT l.loan_reference AS loanReference, l.principal_amount AS loanAmount,
        r.amount, r.description, r.paid_at AS paidAt
      FROM loan_repayments r JOIN member_loans l ON l.id = r.loan_id
      WHERE ${where.join(' AND ')}
      ORDER BY r.paid_at DESC, r.id DESC LIMIT ? OFFSET ?
    `).bind(...params, pageSize, offset)
  }

  const [count, items] = await Promise.all([countQuery.first(), itemsQuery.all()])
  const results = type === 'loans'
    ? items.results.map((item) => ({ ...item, legacyImported: Boolean(item.legacyImported) }))
    : items.results
  return json({ items: results, total: count.total, page: requestedPage, pageSize })
}
