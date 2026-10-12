import {
  ApiError,
  getStatementFilters,
  json,
  readJson,
} from './shared.js'
import { getMemberBorrowingCapacity } from './member-dashboard.js'

function standardizeName(value) {
  return value.trim().toLocaleLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, boundary, letter) =>
    `${boundary}${letter.toLocaleUpperCase()}`)
}

async function applyForLoan(request, session, env) {
  const body = await readJson(request)
  const requestedAmount = Number(body.requestedAmount)
  const repaymentMonths = Number(body.repaymentMonths)
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : ''
  const payoutAccount = body.payoutAccount
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
  if (!['primary', 'secondary'].includes(payoutAccount)) {
    throw new ApiError('Choose the bank account where loan funds should be deposited.')
  }
  if (body.electronicSignature !== true) {
    throw new ApiError('Confirm your electronic signature to submit the application.')
  }

  const member = await env.DB.prepare(`
    SELECT full_name AS fullName,
      CASE WHEN ? = 'primary' THEN bank_name ELSE bank_two_name END AS bankName,
      CASE WHEN ? = 'primary' THEN bank_branch ELSE bank_two_branch END AS bankBranch,
      CASE WHEN ? = 'primary' THEN bank_account_name ELSE bank_two_account_name END AS accountName,
      CASE WHEN ? = 'primary' THEN bank_account_number ELSE bank_two_account_number END AS accountNumber
    FROM members WHERE id = ?
  `).bind(payoutAccount, payoutAccount, payoutAccount, payoutAccount, session.memberId).first()
  if (!member?.bankName || !member.accountNumber) {
    throw new ApiError('The selected bank account is incomplete. Update your member profile before applying.')
  }
  const signatureName = standardizeName(member.fullName)

  const capacity = await getMemberBorrowingCapacity(env, session.memberId)
  if (requestedAmount > capacity.availableBalance) {
    throw new ApiError(`Requested loan exceeds your available borrowing balance of ${Number(capacity.availableBalance).toFixed(2)}.`)
  }
  const result = await env.DB.prepare(`
    INSERT INTO loan_applications (
      member_id, requested_amount, repayment_months, purpose, security_type,
      payout_bank_name, payout_bank_branch, payout_account_name, payout_account_number,
      electronic_signature_name, electronically_signed_at
    )
    SELECT ?, ?, ?, ?, 'savings', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
    WHERE ? <= MAX(0,
      COALESCE((SELECT SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END)
        FROM savings_transactions WHERE member_id = ?), 0)
      - COALESCE((SELECT SUM(outstanding_balance)
        FROM member_loans WHERE member_id = ? AND outstanding_balance > 0), 0)
      - COALESCE((SELECT SUM(requested_amount)
        FROM loan_applications WHERE member_id = ? AND status = 'pending'), 0)
    )
  `).bind(session.memberId, requestedAmount, repaymentMonths, purpose,
    member.bankName, member.bankBranch, member.accountName, member.accountNumber, signatureName,
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
export async function handleMemberLoans(path, request, session, env) {
  if (path === '/member/loan-applications' && request.method === 'GET') {
    return memberLoanApplications(request, session, env)
  }
  if (path === '/member/loan-applications' && request.method === 'POST') {
    return applyForLoan(request, session, env)
  }
  return null
}
