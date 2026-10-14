import {
  ApiError,
  getStatementFilters,
  json,
  loanApplicationHash,
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
  if (purpose && purpose.length > 500) {
    throw new ApiError('Describe the purpose in 500 characters or fewer.')
  }
  if (!['primary', 'secondary'].includes(payoutAccount)) {
    throw new ApiError('Choose the bank account where loan funds should be deposited.')
  }
  if (body.electronicSignature !== true) {
    throw new ApiError('Confirm your electronic signature to submit the application.')
  }

  // Fetch member details and borrowing capacity concurrently in one roundtrip
  const [member, capacity] = await Promise.all([
    env.DB.prepare(`
      SELECT full_name AS fullName,
        CASE WHEN ? = 'primary' THEN bank_name ELSE bank_two_name END AS bankName,
        CASE WHEN ? = 'primary' THEN bank_branch ELSE bank_two_branch END AS bankBranch,
        CASE WHEN ? = 'primary' THEN bank_account_name ELSE bank_two_account_name END AS accountName,
        CASE WHEN ? = 'primary' THEN bank_account_number ELSE bank_two_account_number END AS accountNumber
      FROM members WHERE id = ?
    `).bind(payoutAccount, payoutAccount, payoutAccount, payoutAccount, session.memberId).first(),
    getMemberBorrowingCapacity(env, session.memberId),
  ])

  if (!member?.bankName || !member.accountNumber) {
    throw new ApiError('The selected bank account is incomplete. Update your member profile before applying.')
  }
  if (requestedAmount > capacity.availableBalance) {
    throw new ApiError(`Requested loan exceeds your available borrowing balance of ${Number(capacity.availableBalance).toFixed(2)}.`)
  }

  const signatureName = standardizeName(member.fullName)
  const effectivePurpose = purpose || 'Personal'
  const signedAt = new Date().toISOString().replace('T', ' ').slice(0, 19)

  // Direct insert without re-running expensive nested subqueries
  const insertResult = await env.DB.prepare(`
    INSERT INTO loan_applications (
      member_id, requested_amount, repayment_months, purpose, security_type,
      payout_bank_name, payout_bank_branch, payout_account_name, payout_account_number,
      electronic_signature_name, electronically_signed_at
    ) VALUES (?, ?, ?, ?, 'savings', ?, ?, ?, ?, ?, ?)
  `).bind(
    session.memberId,
    requestedAmount,
    repaymentMonths,
    effectivePurpose,
    member.bankName,
    member.bankBranch ?? '',
    member.accountName ?? '',
    member.accountNumber,
    signatureName,
    signedAt,
  ).run()

  const applicationId = insertResult.meta.last_row_id
  const securityHash = loanApplicationHash({
    id: applicationId,
    memberId: session.memberId,
    requestedAmount,
    repaymentMonths,
    purpose: effectivePurpose,
    payoutBankName: member.bankName,
    payoutBankBranch: member.bankBranch ?? '',
    payoutAccountName: member.accountName ?? '',
    payoutAccountNumber: member.accountNumber,
    electronicSignatureName: signatureName,
    electronicallySignedAt: signedAt,
  })

  await env.DB.prepare('UPDATE loan_applications SET security_hash = ? WHERE id = ?')
    .bind(securityHash, applicationId).run()

  const totalRepayable = Math.round(requestedAmount * 1.1 * 100) / 100
  const monthlyInstallment = Math.round(totalRepayable / repaymentMonths * 100) / 100
  return json({
    message: `Application submitted. At 10% interest, total repayment is ${totalRepayable.toFixed(2)} over ${repaymentMonths} months (about ${monthlyInstallment.toFixed(2)} per month).`,
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
  if (filters.status && !['pending', 'approved', 'rejected', 'disbursed', 'decision'].includes(filters.status)) {
    throw new ApiError('Choose a valid loan application status filter.')
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
    if (filters.status === 'decision') {
      where.push("status IN ('approved', 'rejected')")
    } else {
      where.push('status = ?')
      params.push(filters.status)
    }
  }
  const whereSql = `WHERE ${where.join(' AND ')}`
  const pageSize = 10
  const offset = (page - 1) * pageSize
  const [count, items] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total FROM loan_applications ${whereSql}`).bind(...params).first(),
    env.DB.prepare(`
      SELECT id, requested_amount AS requestedAmount, repayment_months AS repaymentMonths,
        purpose, status, security_type AS securityType, applied_at AS appliedAt,
        payout_bank_name AS payoutBankName, payout_bank_branch AS payoutBankBranch,
        payout_account_name AS payoutAccountName, payout_account_number AS payoutAccountNumber,
        disbursed_at AS disbursedAt, disbursed_loan_reference AS disbursedLoanReference,
    disbursement_message AS disbursementMessage, security_hash AS securityHash
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
