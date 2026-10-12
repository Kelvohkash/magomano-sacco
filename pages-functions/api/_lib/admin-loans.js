import { ApiError, json, readJson } from './shared.js'

export async function handleAdminLoans(path, request, session, db) {
  const method = request.method
  if (path === '/admin/loan-applications' && method === 'GET') {
    const applications = await db.prepare(`
      SELECT a.id, a.requested_amount AS requestedAmount,
        a.repayment_months AS repaymentMonths, a.purpose, a.status,
        a.security_type AS securityType,
        a.applied_at AS appliedAt, m.national_id AS nationalId, m.full_name AS fullName,
        a.payout_bank_name AS payoutBankName, a.payout_bank_branch AS payoutBankBranch,
        a.payout_account_name AS payoutAccountName, a.payout_account_number AS payoutAccountNumber,
        a.electronic_signature_name AS electronicSignatureName,
        a.electronically_signed_at AS electronicallySignedAt
      FROM loan_applications a JOIN members m ON m.id = a.member_id
      ORDER BY CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END, a.applied_at DESC, a.id DESC
      LIMIT 100
    `).all()
    return json({ applications: applications.results })
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
    const result = await db.prepare("DELETE FROM loan_applications WHERE id = ? AND status != 'approved'")
      .bind(applicationId).run()
    if (!result.meta.changes) {
      const application = await db.prepare('SELECT status FROM loan_applications WHERE id = ?')
        .bind(applicationId).first()
      if (!application) throw new ApiError('Loan application was not found.', 404)
      throw new ApiError('An approved application cannot be deleted because its loan has already been issued.')
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
      SELECT id, member_id AS memberId, requested_amount AS requestedAmount,
        repayment_months AS repaymentMonths, status
      FROM loan_applications WHERE id = ?
    `).bind(applicationId).first()
    if (!application) throw new ApiError('Loan application was not found.', 404)
    if (application.status !== 'pending') throw new ApiError('This loan application has already been reviewed.', 409)
    if (decision === 'reject') {
      await db.prepare("UPDATE loan_applications SET status = 'rejected' WHERE id = ? AND status = 'pending'")
        .bind(applicationId).run()
      return json({ message: 'Loan application rejected.', status: 'rejected' })
    }

    const reference = `LN-${Date.now()}-${applicationId}`
    const totalRepayable = Math.round(application.requestedAmount * 1.1 * 100) / 100
    const statements = [
      db.prepare(`
        INSERT INTO member_loans (
          member_id, loan_reference, principal_amount, interest_rate, repayment_months,
          total_repayable, outstanding_balance, status, issued_at, security_type
        )
        SELECT ?, ?, ?, 10, ?, ?, ?, 'active', CURRENT_TIMESTAMP, 'savings'
        FROM loan_applications
        WHERE id = ? AND status = 'pending'
          AND ? <= MAX(0,
            COALESCE((SELECT SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END)
              FROM savings_transactions WHERE member_id = ?), 0)
            - COALESCE((SELECT SUM(outstanding_balance)
              FROM member_loans WHERE member_id = ? AND outstanding_balance > 0), 0)
            - COALESCE((SELECT SUM(requested_amount) FROM loan_applications
              WHERE member_id = ? AND status = 'pending' AND id != ?), 0)
          )
      `).bind(application.memberId, reference, application.requestedAmount,
        application.repaymentMonths, totalRepayable, totalRepayable,
        applicationId, application.requestedAmount, application.memberId,
        application.memberId, application.memberId, applicationId),
      db.prepare(`
        UPDATE loan_applications SET status = 'approved'
        WHERE id = ? AND status = 'pending'
          AND EXISTS (SELECT 1 FROM member_loans WHERE loan_reference = ?)
      `).bind(applicationId, reference),
    ]
    const result = await db.batch(statements)
    if (!result[0].meta.changes || !result[1].meta.changes) {
      throw new ApiError('Approval blocked: available savings changed or this application was already reviewed.', 409)
    }
    return json({ message: `Loan approved and issued as ${reference}.`, status: 'approved' })
  }
  return null
}
