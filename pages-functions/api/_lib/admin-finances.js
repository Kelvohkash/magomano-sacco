import { ApiError, json, readJson } from './shared.js'

export async function handleAdminFinances(path, request, session, db) {
  const method = request.method
  if (path === '/admin/repayments' && method === 'GET') {
    const loans = await db.prepare(`
      SELECT l.id, l.loan_reference AS reference, l.principal_amount AS principalAmount,
        l.total_repayable AS totalRepayable, l.outstanding_balance AS outstandingBalance,
        l.repayment_months AS repaymentMonths, l.security_type AS securityType,
        l.status, l.issued_at AS issuedAt,
        m.national_id AS nationalId, m.full_name AS fullName
      FROM member_loans l JOIN members m ON m.id = l.member_id
      WHERE l.outstanding_balance > 0 ORDER BY l.issued_at ASC, l.id ASC
    `).all()
    return json({ loans: loans.results })
  }

  if (path === '/admin/repayments' && method === 'POST') {
    const body = await readJson(request)
    const loanId = Number(body.loanId)
    const amount = Math.round(Number(body.amount) * 100) / 100
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!Number.isInteger(loanId) || !Number.isFinite(amount) || amount <= 0) {
      throw new ApiError('Select a loan and enter a repayment amount greater than zero.')
    }
    if (description.length > 120) throw new ApiError('Description must be 120 characters or fewer.')
    const loan = await db.prepare('SELECT id, outstanding_balance AS balance FROM member_loans WHERE id = ?')
      .bind(loanId).first()
    if (!loan) throw new ApiError('Loan was not found.', 404)
    if (amount > loan.balance + 0.001) {
      throw new ApiError(`Payment exceeds the outstanding balance of ${Number(loan.balance).toFixed(2)}.`)
    }
    const balance = Math.max(0, Math.round((loan.balance - amount) * 100) / 100)
    const results = await db.batch([
      db.prepare(`
        INSERT INTO loan_repayments (loan_id, admin_id, amount, description)
        SELECT ?, ?, ?, ? WHERE (SELECT outstanding_balance FROM member_loans WHERE id = ?) >= ?
      `).bind(loanId, session.adminId, amount, description, loanId, amount - 0.001),
      db.prepare(`
        UPDATE member_loans SET outstanding_balance = ?, status = ?
        WHERE id = ? AND outstanding_balance >= ?
      `).bind(balance, balance === 0 ? 'paid' : 'active', loanId, amount - 0.001),
    ])
    if (!results[0].meta.changes || !results[1].meta.changes) {
      throw new ApiError('Payment exceeds the current outstanding balance.', 409)
    }
    return json({ message: 'Loan repayment recorded.', outstandingBalance: balance }, 201)
  }

  const editRepayment = path.match(/^\/admin\/repayments\/(\d+)$/)
  if (editRepayment && method === 'PUT') {
    const repaymentId = Number(editRepayment[1])
    const body = await readJson(request)
    const amount = Math.round(Number(body.amount) * 100) / 100
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) throw new ApiError('Enter a valid repayment amount.')
    if (description.length > 120) throw new ApiError('Description must be 120 characters or fewer.')
    const repayment = await db.prepare(`
      SELECT r.id, r.loan_id AS loanId, r.amount, l.outstanding_balance AS outstandingBalance
      FROM loan_repayments r JOIN member_loans l ON l.id = r.loan_id WHERE r.id = ?
    `).bind(repaymentId).first()
    if (!repayment) throw new ApiError('Repayment record was not found.', 404)
    const nextBalance = Math.round((repayment.outstandingBalance + repayment.amount - amount) * 100) / 100
    if (nextBalance < -0.001) throw new ApiError('Repayment amount cannot exceed the loan total.')
    const balance = Math.max(0, nextBalance)
    const results = await db.batch([
      db.prepare(`UPDATE member_loans SET outstanding_balance = ?, status = ?
        WHERE id = ? AND outstanding_balance = ? AND EXISTS (
          SELECT 1 FROM loan_repayments WHERE id = ? AND amount = ?
        )`).bind(balance, balance === 0 ? 'paid' : 'active', repayment.loanId, repayment.outstandingBalance, repaymentId, repayment.amount),
      db.prepare(`UPDATE loan_repayments SET amount = ?, description = ?
        WHERE id = ? AND amount = ? AND EXISTS (
          SELECT 1 FROM member_loans WHERE id = ? AND outstanding_balance = ?
        )`).bind(amount, description, repaymentId, repayment.amount, repayment.loanId, balance),
    ])
    if (!results[0].meta.changes || !results[1].meta.changes) throw new ApiError('This repayment changed while you were editing it. Reload and try again.', 409)
    return json({ message: 'Repayment record updated.', outstandingBalance: balance })
  }

  if (path === '/admin/dividends' && method === 'GET') {
    const payments = await db.prepare(`
      SELECT d.id, d.financial_period AS financialPeriod, d.amount, d.description,
        d.paid_at AS paidAt, m.national_id AS nationalId, m.full_name AS fullName
      FROM dividend_payments d JOIN members m ON m.id = d.member_id
      ORDER BY d.paid_at DESC, d.id DESC LIMIT 100
    `).all()
    return json({ payments: payments.results })
  }

  if (path === '/admin/dividends' && method === 'POST') {
    const body = await readJson(request)
    const memberId = Number(body.memberId)
    const amount = Number(body.amount)
    const financialPeriod = typeof body.financialPeriod === 'string' ? body.financialPeriod.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!Number.isInteger(memberId) || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
      throw new ApiError('Select a member and enter a dividend amount greater than zero.')
    }
    if (financialPeriod.length < 2 || financialPeriod.length > 24 || description.length > 120) {
      throw new ApiError('Enter a valid financial period and a description up to 120 characters.')
    }
    const result = await db.prepare(`
      INSERT INTO dividend_payments (member_id, financial_period, amount, description)
      SELECT id, ?, ?, ? FROM members WHERE id = ? AND account_status = 'approved'
    `).bind(financialPeriod, amount, description, memberId).run()
    if (!result.meta.changes) throw new ApiError('Approved member account was not found.', 404)
    return json({ message: 'Dividend payment recorded.' }, 201)
  }

  const editDividend = path.match(/^\/admin\/dividends\/(\d+)$/)
  if (editDividend && method === 'PUT') {
    const dividendId = Number(editDividend[1])
    const body = await readJson(request)
    const amount = Math.round(Number(body.amount) * 100) / 100
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) throw new ApiError('Enter a valid dividend amount.')
    if (description.length > 120) throw new ApiError('Description must be 120 characters or fewer.')
    const result = await db.prepare('UPDATE dividend_payments SET amount = ?, description = ? WHERE id = ?')
      .bind(amount, description, dividendId).run()
    if (!result.meta.changes) throw new ApiError('Dividend record was not found.', 404)
    return json({ message: 'Dividend record updated.' })
  }

  const deleteDividend = path.match(/^\/admin\/dividends\/(\d+)$/)
  if (deleteDividend && method === 'DELETE') {
    const result = await db.prepare('DELETE FROM dividend_payments WHERE id = ?').bind(Number(deleteDividend[1])).run()
    if (!result.meta.changes) throw new ApiError('Dividend record was not found.', 404)
    return json({ message: 'Dividend record deleted.' })
  }

  if (path === '/admin/savings' && method === 'POST') {
    const body = await readJson(request)
    const memberId = Number(body.memberId)
    const entryType = body.entryType
    const amount = Number(body.amount)
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!Number.isInteger(memberId) || entryType !== 'deposit') {
      throw new ApiError('Savings entries can only be deposits. Members use loans for borrowing.')
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
      throw new ApiError('Enter an amount greater than zero.')
    }
    if (description.length > 120) throw new ApiError('Description must be 120 characters or fewer.')
    const member = await db.prepare('SELECT id FROM members WHERE id = ?').bind(memberId).first()
    if (!member) throw new ApiError('Member account was not found.', 404)
    await db.prepare(`
      INSERT INTO savings_transactions (member_id, entry_type, amount, description)
      VALUES (?, 'deposit', ?, ?)
    `).bind(memberId, amount, description || 'Savings deposit').run()
    const balance = await db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END), 0) AS balance
      FROM savings_transactions WHERE member_id = ?
    `).bind(memberId).first()
    return json({ message: 'Savings entry recorded.', balance: balance.balance }, 201)
  }

  const editSavings = path.match(/^\/admin\/savings\/(\d+)$/)
  if (editSavings && method === 'PUT') {
    const savingsId = Number(editSavings[1])
    const body = await readJson(request)
    const amount = Math.round(Number(body.amount) * 100) / 100
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) throw new ApiError('Enter a valid savings amount.')
    if (description.length > 120) throw new ApiError('Description must be 120 characters or fewer.')
    const result = await db.prepare(`UPDATE savings_transactions SET amount = ?, description = ?
      WHERE id = ? AND entry_type = 'deposit'`).bind(amount, description, savingsId).run()
    if (!result.meta.changes) {
      const record = await db.prepare('SELECT id FROM savings_transactions WHERE id = ?').bind(savingsId).first()
      throw new ApiError(record ? 'Only deposit records can be edited here.' : 'Savings record was not found.', record ? 409 : 404)
    }
    return json({ message: 'Savings record updated.' })
  }

  const deleteSavings = path.match(/^\/admin\/savings\/(\d+)$/)
  if (deleteSavings && method === 'DELETE') {
    const result = await db.prepare("DELETE FROM savings_transactions WHERE id = ? AND entry_type = 'deposit'")
      .bind(Number(deleteSavings[1])).run()
    if (!result.meta.changes) {
      const record = await db.prepare('SELECT id FROM savings_transactions WHERE id = ?')
        .bind(Number(deleteSavings[1])).first()
      throw new ApiError(record ? 'Only deposit records can be deleted here.' : 'Savings record was not found.', record ? 409 : 404)
    }
    return json({ message: 'Savings record deleted.' })
  }
  return null
}
