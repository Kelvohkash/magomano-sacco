import { randomBytes } from 'node:crypto'
import { ApiError, json, loanApplicationHash, readJson } from './shared.js'
import { getMemberBorrowingCapacity } from './member-dashboard.js'

export async function handleAdminLoans(path, request, session, db) {
  const method = request.method
  if (path === '/admin/loans' && method === 'POST') {
    const body = await readJson(request)
    const memberId = Number(body.memberId)
    const principalAmount = Number(body.principalAmount)
    const repaymentMonths = Number(body.repaymentMonths)
    const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : ''
    if (!Number.isInteger(memberId) || memberId < 1) throw new ApiError('Choose a member for this loan.')
    if (!Number.isFinite(principalAmount) || principalAmount <= 0 || principalAmount > 100000000) {
      throw new ApiError('Enter a valid loan amount.')
    }
    if (!Number.isInteger(repaymentMonths) || repaymentMonths < 1 || repaymentMonths > 120) {
      throw new ApiError('Repayment term must be between 1 and 120 months.')
    }
    if (purpose.length < 3 || purpose.length > 500) throw new ApiError('Loan purpose must be between 3 and 500 characters.')
    const member = await db.prepare("SELECT id, full_name AS fullName FROM members WHERE id = ? AND account_status = 'approved'")
      .bind(memberId).first()
    if (!member) throw new ApiError('Choose an approved member for this loan.')
    const capacity = await getMemberBorrowingCapacity({ DB: db }, memberId)
    if (principalAmount > capacity.availableBalance) {
      throw new ApiError(`Loan principal exceeds this member’s borrowing limit of ${Number(capacity.availableBalance).toFixed(2)} after interest.`)
    }
    const totalRepayable = Math.round(principalAmount * 1.1 * 100) / 100
    const reference = `LN-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`
    await db.prepare(`
      INSERT INTO member_loans (
        member_id, loan_reference, principal_amount, interest_rate, repayment_months,
        total_repayable, outstanding_balance, status, issued_at, security_type
      ) VALUES (?, ?, ?, 10, ?, ?, ?, 'active', CURRENT_TIMESTAMP, 'savings')
    `).bind(memberId, reference, principalAmount, repaymentMonths, totalRepayable, totalRepayable).run()
    return json({
      message: `Loan ${reference} was issued to ${member.fullName}. Total repayment including 10% interest is ${totalRepayable.toFixed(2)}.`,
      reference,
      principalAmount,
      totalRepayable,
    }, 201)
  }

  if (path === '/admin/loan-applications' && method === 'GET') {
    const applications = await db.prepare(`
      SELECT a.id, a.requested_amount AS requestedAmount,
        a.repayment_months AS repaymentMonths, a.purpose, a.status,
        a.security_type AS securityType,
        a.applied_at AS appliedAt, m.national_id AS nationalId, m.full_name AS fullName,
        a.payout_bank_name AS payoutBankName, a.payout_bank_branch AS payoutBankBranch,
        a.payout_account_name AS payoutAccountName, a.payout_account_number AS payoutAccountNumber,
        a.disbursed_at AS disbursedAt, a.disbursed_loan_reference AS disbursedLoanReference,
        a.disbursement_message AS disbursementMessage,
        a.electronic_signature_name AS electronicSignatureName,
        a.electronically_signed_at AS electronicallySignedAt,
        a.security_hash AS securityHash
      FROM loan_applications a JOIN members m ON m.id = a.member_id
      ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'rejected' THEN 2 ELSE 3 END,
        a.applied_at DESC, a.id DESC
      LIMIT 100
    `).all()
    for (const application of applications.results) {
      if (!application.securityHash) {
        const canonical = await db.prepare(`SELECT id, member_id AS memberId,
          requested_amount AS requestedAmount, repayment_months AS repaymentMonths, purpose,
          payout_bank_name AS payoutBankName, payout_bank_branch AS payoutBankBranch,
          payout_account_name AS payoutAccountName, payout_account_number AS payoutAccountNumber,
          electronic_signature_name AS electronicSignatureName,
          electronically_signed_at AS electronicallySignedAt FROM loan_applications WHERE id = ?`)
          .bind(application.id).first()
        application.securityHash = loanApplicationHash(canonical)
        await db.prepare('UPDATE loan_applications SET security_hash = ? WHERE id = ? AND security_hash = \'\'')
          .bind(application.securityHash, application.id).run()
      }
    }
    return json({ applications: applications.results })
  }

  const verifyHash = path.match(/^\/admin\/loan-applications\/(\d+)\/verify-hash$/)
  if (verifyHash && method === 'POST') {
    const application = await db.prepare(`SELECT id, member_id AS memberId,
      requested_amount AS requestedAmount, repayment_months AS repaymentMonths, purpose,
      payout_bank_name AS payoutBankName, payout_bank_branch AS payoutBankBranch,
      payout_account_name AS payoutAccountName, payout_account_number AS payoutAccountNumber,
      electronic_signature_name AS electronicSignatureName,
      electronically_signed_at AS electronicallySignedAt, security_hash AS securityHash
      FROM loan_applications WHERE id = ?`).bind(Number(verifyHash[1])).first()
    if (!application) throw new ApiError('Loan application was not found.', 404)
    const valid = Boolean(application.securityHash) && loanApplicationHash(application) === application.securityHash
    return json({ valid, securityHash: application.securityHash })
  }

  const editApplication = path.match(/^\/admin\/loan-applications\/(\d+)$/)
  if (editApplication && method === 'PUT') {
    const applicationId = Number(editApplication[1])
    const body = await readJson(request)
    const requestedAmount = Number(body.requestedAmount)
    const repaymentMonths = Number(body.repaymentMonths)
    const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : ''
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > 100000000) {
      throw new ApiError('Enter a valid loan amount.')
    }
    if (!Number.isInteger(repaymentMonths) || repaymentMonths < 1 || repaymentMonths > 120) {
      throw new ApiError('Repayment term must be between 1 and 120 months.')
    }
    if (purpose.length < 3 || purpose.length > 500) {
      throw new ApiError('Loan purpose must be between 3 and 500 characters.')
    }
    const result = await db.prepare(`
      UPDATE loan_applications
      SET requested_amount = ?, repayment_months = ?, purpose = ?
      WHERE id = ? AND status = 'pending'
    `).bind(requestedAmount, repaymentMonths, purpose, applicationId).run()
    if (!result.meta.changes) {
      const application = await db.prepare('SELECT status FROM loan_applications WHERE id = ?')
        .bind(applicationId).first()
      throw new ApiError(application
        ? 'Only pending loan applications can be edited.'
        : 'Loan application was not found.', application ? 409 : 404)
    }
    return json({ message: 'Loan application updated.' })
  }

  const deleteApplication = path.match(/^\/admin\/loan-applications\/(\d+)$/)
  if (deleteApplication && method === 'DELETE') {
    const applicationId = Number(deleteApplication[1])
    const result = await db.prepare("DELETE FROM loan_applications WHERE id = ? AND status IN ('pending', 'rejected')")
      .bind(applicationId).run()
    if (!result.meta.changes) {
      const application = await db.prepare('SELECT status FROM loan_applications WHERE id = ?')
        .bind(applicationId).first()
      if (!application) throw new ApiError('Loan application was not found.', 404)
      throw new ApiError('An approved or disbursed application cannot be deleted.')
    }
    return json({ message: 'Loan application deleted.' })
  }

  const applicationDecision = path.match(/^\/admin\/loan-applications\/(\d+)\/decision$/)
  if (applicationDecision && method === 'POST') {
    const applicationId = Number(applicationDecision[1])
    const decision = (await readJson(request)).decision
    if (!['approve', 'reject'].includes(decision)) {
      throw new ApiError('Choose approve or reject for this loan application.')
    }
    const application = await db.prepare(`
      SELECT id, member_id AS memberId, requested_amount AS requestedAmount, status
      FROM loan_applications WHERE id = ?
    `).bind(applicationId).first()
    if (!application) throw new ApiError('Loan application was not found.', 404)
    if (application.status !== 'pending') throw new ApiError('This loan application has already been reviewed.', 409)
    if (decision === 'reject') {
      await db.prepare("UPDATE loan_applications SET status = 'rejected' WHERE id = ? AND status = 'pending'")
        .bind(applicationId).run()
      return json({ message: 'Loan application rejected.', status: 'rejected' })
    }

    const result = await db.prepare(`
      UPDATE loan_applications SET status = 'approved'
      WHERE id = ? AND status = 'pending'
        AND requested_amount <= MAX(0,
          COALESCE((SELECT SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END)
            FROM savings_transactions WHERE member_id = ?), 0)
          - COALESCE((SELECT SUM(outstanding_balance)
            FROM member_loans WHERE member_id = ? AND outstanding_balance > 0), 0)
          - COALESCE((SELECT SUM(requested_amount * 1.1) FROM loan_applications
            WHERE member_id = ? AND status IN ('pending', 'approved') AND id != ?), 0)
        ) * 0.9
    `).bind(applicationId, application.memberId, application.memberId,
      application.memberId, applicationId).run()
    if (!result.meta.changes) {
      throw new ApiError('Approval blocked: available savings changed or this application was already reviewed.', 409)
    }
    return json({
      message: 'Loan application approved. It is now waiting for funds to be disbursed.',
      status: 'approved',
    })
  }

  const disbursement = path.match(/^\/admin\/loan-applications\/(\d+)\/disbursement$/)
  if (disbursement && method === 'POST') {
    const applicationId = Number(disbursement[1])
    const application = await db.prepare(`
      SELECT loan_applications.id AS id, loan_applications.member_id AS memberId,
        loan_applications.requested_amount AS requestedAmount,
        loan_applications.repayment_months AS repaymentMonths,
        loan_applications.status AS status,
        payout_bank_name AS payoutBankName, payout_bank_branch AS payoutBankBranch,
        payout_account_name AS payoutAccountName, payout_account_number AS payoutAccountNumber,
        full_name AS fullName
      FROM loan_applications JOIN members ON members.id = loan_applications.member_id
      WHERE loan_applications.id = ?
    `).bind(applicationId).first()
    if (!application) throw new ApiError('Loan application was not found.', 404)
    if (application.status !== 'approved') {
      throw new ApiError('Only approved applications waiting for disbursement can be marked as disbursed.', 409)
    }
    if (!application.payoutBankName || !application.payoutAccountNumber) {
      throw new ApiError('This application has no complete bank account. Ask the member to update their account details.')
    }
    const reference = `LN-${Date.now()}-${applicationId}-${randomBytes(3).toString('hex').toUpperCase()}`
    const totalRepayable = Math.round(application.requestedAmount * 1.1 * 100) / 100
    const accountLastFour = application.payoutAccountNumber.slice(-4)
    const disbursementMessage = `Funds have been disbursed to ${application.payoutBankName} account ending ${accountLastFour}. Please allow 2–3 business days for the funds to reflect. Thank you for your patience.`
    const pendingRows = await db.prepare(`
      SELECT id, remaining_amount AS remainingAmount, paid_at AS paidAt
      FROM unallocated_loan_payments
      WHERE member_id = ? AND remaining_amount > 0
      ORDER BY paid_at ASC, id ASC
    `).bind(application.memberId).all()
    let loanBalance = totalRepayable
    const pendingAllocations = []
    for (const payment of pendingRows.results) {
      if (loanBalance <= 0) break
      const allocated = Math.min(loanBalance, Number(payment.remainingAmount))
      if (allocated <= 0) continue
      loanBalance = Math.max(0, Math.round((loanBalance - allocated) * 100) / 100)
      pendingAllocations.push({
        id: payment.id,
        paidAt: payment.paidAt,
        originalRemainingAmount: Number(payment.remainingAmount),
        remainingAmount: Math.round((Number(payment.remainingAmount) - allocated) * 100) / 100,
        allocated,
      })
    }
    const loanStatus = loanBalance === 0 ? 'paid' : 'active'
    const statements = [
      db.prepare(`
        INSERT INTO member_loans (
          member_id, loan_reference, principal_amount, interest_rate, repayment_months,
          total_repayable, outstanding_balance, status, issued_at, security_type
        )
        SELECT ?, ?, ?, 10, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'savings'
        FROM loan_applications
        WHERE id = ? AND status = 'approved'
          AND ? <= MAX(0,
            COALESCE((SELECT SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END)
              FROM savings_transactions WHERE member_id = ?), 0)
            - COALESCE((SELECT SUM(outstanding_balance)
              FROM member_loans WHERE member_id = ? AND outstanding_balance > 0), 0)
            - COALESCE((SELECT SUM(requested_amount * 1.1) FROM loan_applications
              WHERE member_id = ? AND status IN ('pending', 'approved') AND id != ?), 0)
          ) * 0.9
      `).bind(application.memberId, reference, application.requestedAmount,
        application.repaymentMonths, totalRepayable, loanBalance, loanStatus,
        applicationId, application.requestedAmount, application.memberId,
        application.memberId, application.memberId, applicationId),
      db.prepare(`
        UPDATE loan_applications SET status = 'disbursed', disbursed_at = CURRENT_TIMESTAMP,
          disbursed_loan_reference = ?, disbursement_message = ?
        WHERE id = ? AND status = 'approved'
          AND EXISTS (SELECT 1 FROM member_loans WHERE loan_reference = ?)
      `).bind(reference, disbursementMessage, applicationId, reference),
    ]
    for (const payment of pendingAllocations) {
      statements.push(db.prepare(`
        INSERT INTO loan_repayments (loan_id, admin_id, amount, description, paid_at)
        SELECT l.id, ?, ?, 'Loan repayment', ? FROM member_loans l
        WHERE l.loan_reference = ? AND EXISTS (
          SELECT 1 FROM unallocated_loan_payments p
          WHERE p.id = ? AND p.remaining_amount = ?
        )
      `).bind(session.adminId, payment.allocated, payment.paidAt, reference,
        payment.id, payment.originalRemainingAmount))
      statements.push(db.prepare(`
        UPDATE unallocated_loan_payments SET remaining_amount = ?
        WHERE id = ? AND remaining_amount = ?
      `).bind(payment.remainingAmount, payment.id, payment.originalRemainingAmount))
    }
    const result = await db.batch(statements)
    if (!result[0].meta.changes || !result[1].meta.changes) {
      throw new ApiError('Disbursement blocked: available savings changed or this application was already disbursed.', 409)
    }
    return json({
      message: `${disbursementMessage} Loan reference: ${reference}.${pendingAllocations.length ? ` ${pendingAllocations.length} pending repayment(s) were applied automatically.` : ''}`,
      status: 'disbursed',
      reference,
      disbursementMessage,
    })
  }
  return null
}
