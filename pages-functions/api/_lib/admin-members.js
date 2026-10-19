import { randomBytes } from 'node:crypto'
import { ApiError, hashPassword, json, readJson } from './shared.js'

export async function handleAdminMembers(path, request, session, db) {
  const method = request.method
  const passwordReset = path.match(/^\/admin\/members\/(\d+)\/password-reset$/)
  if (passwordReset && method === 'POST') {
    const memberId = Number(passwordReset[1])
    const member = await db.prepare('SELECT id FROM members WHERE id = ?').bind(memberId).first()
    if (!member) throw new ApiError('Member account was not found.', 404)
    const salt = randomBytes(16).toString('hex')
    const passwordHash = hashPassword('1234', salt)
    await db.batch([
      db.prepare('UPDATE members SET password_salt = ?, password_hash = ? WHERE id = ?')
        .bind(salt, passwordHash, memberId),
      db.prepare('UPDATE admins SET password_salt = ?, password_hash = ? WHERE member_id = ?')
        .bind(salt, passwordHash, memberId),
      db.prepare(`DELETE FROM sessions WHERE token_hash != ? AND (
        member_id = ? OR admin_id IN (SELECT id FROM admins WHERE member_id = ?)
      )`).bind(session.tokenHash, memberId, memberId),
    ])
    return json({ message: 'Member password reset to 1234. Other sessions were signed out.' })
  }

  if (path === '/admin/members' && method === 'POST') {
    const body = await readJson(request)
    const saccoNumber = typeof body.saccoNumber === 'string' ? body.saccoNumber.trim().toUpperCase() : ''
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : ''
    const nationalId = typeof body.nationalId === 'string' ? body.nationalId.trim() : ''
    const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim() : ''
    const workBranch = typeof body.workBranch === 'string' ? body.workBranch.trim() : ''
    if (!/^[A-Z]+\/\d+$/.test(saccoNumber)) throw new ApiError('SACCO number must look like A/005.')
    if (fullName.length < 2 || fullName.length > 100) throw new ApiError('Enter a member name up to 100 characters.')
    if (nationalId && !/^\d{6,12}$/.test(nationalId)) throw new ApiError('National ID must be blank or 6 to 12 digits.')
    if (jobTitle.length > 100) throw new ApiError('Job title must be 100 characters or fewer.')
    if (workBranch.length > 100) throw new ApiError('Work branch must be 100 characters or fewer.')
    const nameParts = fullName.split(/\s+/)
    const firstName = nameParts.shift() ?? ''
    const lastName = nameParts.length > 1 ? nameParts.pop() ?? '' : ''
    const secondName = nameParts.join(' ')
    const salt = randomBytes(16).toString('hex')
    const passwordHash = hashPassword('Magomano1234', salt)
    try {
      await db.prepare(`
        INSERT INTO members (
          sacco_number, national_id, full_name, first_name, second_name, last_name,
          job_title, work_branch, account_status, password_salt, password_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
      `).bind(saccoNumber, nationalId, fullName, firstName, secondName, lastName, jobTitle, workBranch, salt, passwordHash).run()
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new ApiError('That SACCO number or National ID is already assigned to another member.', 409)
      }
      throw error
    }
    return json({ message: `${fullName} was added. Their temporary password is Magomano1234.` }, 201)
  }

  if (path === '/admin/members' && method === 'GET') {
    const [members, activeLoanRows, contactRows] = await Promise.all([
      db.prepare(`
      SELECT m.id, m.sacco_number AS saccoNumber, m.national_id AS nationalId, m.full_name AS fullName,
        m.first_name AS firstName, m.second_name AS secondName, m.last_name AS lastName,
        m.phone_number AS phoneNumber, m.account_status AS accountStatus,
        m.email, m.county, m.sub_county AS subCounty,
        m.bank_name AS bankName, m.bank_branch AS bankBranch,
        m.bank_account_name AS bankAccountName, m.bank_account_number AS bankAccountNumber,
        m.bank_two_name AS bankTwoName, m.bank_two_branch AS bankTwoBranch,
        m.bank_two_account_name AS bankTwoAccountName,
        m.bank_two_account_number AS bankTwoAccountNumber,
        m.location, m.marital_status AS maritalStatus,
        m.next_kin_name AS nextKinName, m.next_kin_relationship AS nextKinRelationship,
        m.next_kin_phone AS nextKinPhone, m.job_title AS jobTitle,
        m.work_branch AS workBranch, m.member_role AS memberRole,
        (SELECT accepted_at FROM member_terms_acceptances ta WHERE ta.member_id = m.id) AS termsAcceptedAt,
        COALESCE(SUM(CASE WHEN s.entry_type = 'deposit' THEN s.amount ELSE -s.amount END), 0) AS savingsBalance,
        (SELECT COALESCE(SUM(l.outstanding_balance), 0) FROM member_loans l
          WHERE l.member_id = m.id AND l.outstanding_balance > 0) AS activeLoanBalance,
        (SELECT COALESCE(SUM(a.requested_amount * 1.1), 0) FROM loan_applications a
          WHERE a.member_id = m.id AND a.status IN ('pending', 'approved')) AS pendingLoanAmount,
        (SELECT COALESCE(SUM(p.remaining_amount), 0) FROM unallocated_loan_payments p
          WHERE p.member_id = m.id AND p.remaining_amount > 0) AS pendingLoanPayment,
        EXISTS (SELECT 1 FROM admins a WHERE a.member_id = m.id) AS isAdmin
      FROM members m LEFT JOIN savings_transactions s ON s.member_id = m.id
      WHERE m.national_id IS NOT NULL GROUP BY m.id ORDER BY m.full_name COLLATE NOCASE
      `).all(),
      db.prepare(`
        SELECT id, member_id AS memberId, loan_reference AS reference,
          principal_amount AS principalAmount, outstanding_balance AS outstandingBalance,
          CASE WHEN legacy_imported = 1 THEN NULL ELSE repayment_months END AS repaymentMonths,
          status, CASE WHEN legacy_imported = 1 THEN NULL ELSE issued_at END AS issuedAt,
          legacy_imported AS legacyImported
        FROM member_loans WHERE outstanding_balance > 0
        ORDER BY member_id, issued_at DESC, id DESC
      `).all(),
      db.prepare(`
        SELECT c.member_id AS memberId, c.id, c.full_name AS fullName,
          c.relationship, c.phone_number AS phoneNumber
        FROM member_contacts c JOIN members m ON m.id = c.member_id
        WHERE m.national_id IS NOT NULL ORDER BY c.member_id, c.created_at, c.id
      `).all(),
    ])
    const contactsByMember = new Map()
    const loansByMember = new Map()
    for (const loan of activeLoanRows.results) {
      const loans = loansByMember.get(loan.memberId) ?? []
      loans.push({
        id: loan.id,
        reference: loan.reference,
        principalAmount: loan.principalAmount,
        outstandingBalance: loan.outstandingBalance,
        repaymentMonths: loan.repaymentMonths,
        status: loan.status,
        issuedAt: loan.issuedAt,
        legacyImported: Boolean(loan.legacyImported),
      })
      loansByMember.set(loan.memberId, loans)
    }
    for (const contact of contactRows.results) {
      const contacts = contactsByMember.get(contact.memberId) ?? []
      contacts.push({
        id: contact.id,
        fullName: contact.fullName,
        relationship: contact.relationship,
        phoneNumber: contact.phoneNumber,
      })
      contactsByMember.set(contact.memberId, contacts)
    }
    return json({
      members: members.results.map((member) => ({
        ...member,
        availableBalance: Math.max(
          0,
          Math.floor((Number(member.savingsBalance) - Number(member.activeLoanBalance) - Number(member.pendingLoanAmount)) * 0.9 * 100) / 100,
        ),
        activeLoans: loansByMember.get(member.id) ?? [],
        contacts: contactsByMember.get(member.id) ?? [],
      })),
    })
  }

  const memberDetails = path.match(/^\/admin\/members\/(\d+)\/details$/)
  if (memberDetails && method === 'PUT') {
    const memberId = Number(memberDetails[1])
    const body = await readJson(request)
    const fields = [
      ['saccoNumber', 'SACCO member number', 0, 20],
      ['nationalId', 'National ID', 0, 12],
      ['fullName', 'Full name', 2, 100],
      ['phoneNumber', 'Phone number', 0, 32],
      ['bankName', 'Bank name', 0, 100],
      ['bankBranch', 'Bank branch', 0, 100],
      ['bankAccountName', 'Bank account name', 0, 100],
      ['bankAccountNumber', 'Bank account number', 0, 50],
      ['bankTwoName', 'Second bank name', 0, 100],
      ['bankTwoBranch', 'Second bank branch', 0, 100],
      ['bankTwoAccountName', 'Second bank account name', 0, 100],
      ['bankTwoAccountNumber', 'Second bank account number', 0, 50],
      ['email', 'Email', 0, 254],
      ['county', 'County', 0, 100],
      ['subCounty', 'Sub-county', 0, 100],
      ['location', 'Location', 0, 160],
      ['nextKinName', 'Next-of-kin name', 0, 100],
      ['nextKinRelationship', 'Next-of-kin relationship', 0, 60],
      ['nextKinPhone', 'Next-of-kin phone', 0, 32],
    ]
    const values = {}
    for (const [key, label, min, max] of fields) {
      if (typeof body[key] !== 'string') throw new ApiError(`${label} must be text.`)
      values[key] = body[key].trim()
      if (values[key].length < min || values[key].length > max) {
        throw new ApiError(`${label} must be ${min ? `${min} to ` : 'no more than '}${max} characters.`)
      }
    }
    let jobTitle = null
    if (body.jobTitle !== undefined) {
      if (typeof body.jobTitle !== 'string') throw new ApiError('Job title must be text.')
      jobTitle = body.jobTitle.trim()
      if (jobTitle.length > 100) throw new ApiError('Job title must be 100 characters or fewer.')
    }
    let workBranch = null
    if (body.workBranch !== undefined) {
      if (typeof body.workBranch !== 'string') throw new ApiError('Work branch must be text.')
      workBranch = body.workBranch.trim()
      if (workBranch.length > 100) throw new ApiError('Work branch must be 100 characters or fewer.')
    }
    if (values.saccoNumber && !/^[A-Za-z]+\/\d+$/.test(values.saccoNumber)) {
      throw new ApiError('SACCO member number must look like A/005.')
    }
    values.saccoNumber = values.saccoNumber ? values.saccoNumber.toUpperCase() : null
    if (values.nationalId && !/^\d{6,12}$/.test(values.nationalId)) {
      throw new ApiError('National ID must be blank or 6 to 12 digits.')
    }
    const maritalStatus = typeof body.maritalStatus === 'string' ? body.maritalStatus : ''
    if (!['', 'single', 'married', 'divorced', 'widowed', 'other'].includes(maritalStatus)) {
      throw new ApiError('Choose a valid marital status.')
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      throw new ApiError('Enter a valid email address, or leave it blank.')
    }
    const nameParts = values.fullName.split(/\s+/)
    const firstName = nameParts.shift() ?? ''
    const lastName = nameParts.length > 1 ? nameParts.pop() ?? '' : ''
    const secondName = nameParts.join(' ')
    let result
    try {
      result = await db.prepare(`
        UPDATE members SET
          sacco_number = ?, national_id = ?, full_name = ?, first_name = ?, second_name = ?, last_name = ?,
          phone_number = ?, email = ?, county = ?, sub_county = ?, bank_name = ?, bank_branch = ?,
          bank_account_name = ?, bank_account_number = ?, bank_two_name = ?, bank_two_branch = ?,
          bank_two_account_name = ?, bank_two_account_number = ?, location = ?,
          marital_status = ?, job_title = COALESCE(?, job_title),
          work_branch = COALESCE(?, work_branch),
          next_kin_name = ?, next_kin_relationship = ?, next_kin_phone = ?
        WHERE id = ?
      `).bind(
        values.saccoNumber, values.nationalId, values.fullName, firstName, secondName, lastName, values.phoneNumber, values.email,
        values.county, values.subCounty, values.bankName, values.bankBranch,
        values.bankAccountName, values.bankAccountNumber, values.bankTwoName, values.bankTwoBranch,
        values.bankTwoAccountName, values.bankTwoAccountNumber, values.location,
        maritalStatus, jobTitle, workBranch, values.nextKinName, values.nextKinRelationship, values.nextKinPhone,
        memberId,
      ).run()
    } catch (error) {
      if (String(error).includes('members_sacco_number_unique') || String(error).includes('members.sacco_number')) {
        throw new ApiError('That SACCO member number is already assigned to another member.', 409)
      }
      if (String(error).includes('members_national_id_unique') || String(error).includes('members.national_id')) {
        throw new ApiError('That National ID is already assigned to another member.', 409)
      }
      throw error
    }
    if (!result.meta.changes) {
      const member = await db.prepare('SELECT id FROM members WHERE id = ?').bind(memberId).first()
      if (!member) throw new ApiError('Member account was not found.', 404)
    }
    return json({ message: 'Member details updated.' })
  }

  const memberRole = path.match(/^\/admin\/members\/(\d+)\/role$/)
  if (memberRole && method === 'PUT') {
    const memberId = Number(memberRole[1])
    const role = (await readJson(request)).role
    if (!['member', 'signatory'].includes(role)) {
      throw new ApiError('Choose member or signatory for this account.')
    }
    const result = await db.prepare('UPDATE members SET member_role = ? WHERE id = ?')
      .bind(role, memberId).run()
    if (!result.meta.changes) {
      const member = await db.prepare('SELECT id FROM members WHERE id = ?').bind(memberId).first()
      if (!member) throw new ApiError('Member account was not found.', 404)
    }
    return json({ message: `Member role changed to ${role}.`, role })
  }

  const deleteMember = path.match(/^\/admin\/members\/(\d+)$/)
  const terminateMember = path.match(/^\/admin\/members\/(\d+)\/terminate$/)
  const terminationOverview = path.match(/^\/admin\/members\/(\d+)\/termination-overview$/)
  if (terminationOverview && method === 'GET') {
    const memberId = Number(terminationOverview[1])
    const [member, termination, savingsRows, loanRows, repaymentRows] = await Promise.all([
      db.prepare(`SELECT id, sacco_number AS saccoNumber, national_id AS nationalId,
        full_name AS fullName, phone_number AS phoneNumber, created_at AS joinedAt, account_status AS accountStatus
        FROM members WHERE id = ? AND account_status = 'terminated'`).bind(memberId).first(),
      db.prepare(`SELECT savings_applied AS savingsApplied, loan_balance_settled AS loanBalanceSettled,
        payout_amount AS payoutAmount, remaining_loan_due AS remainingLoanDue,
        savings_before AS savingsBefore, charges_json AS chargesJson, settled_at AS settledAt
        FROM member_terminations WHERE member_id = ? ORDER BY settled_at DESC, id DESC LIMIT 1`).bind(memberId).first(),
      db.prepare(`SELECT id, entry_type AS entryType, amount, description, occurred_at AS occurredAt
        FROM savings_transactions WHERE member_id = ? ORDER BY occurred_at, id`).bind(memberId).all(),
      db.prepare(`SELECT id, loan_reference AS reference, principal_amount AS principalAmount,
        total_repayable AS totalRepayable, issued_at AS issuedAt
        FROM member_loans l WHERE l.member_id = ? ORDER BY l.issued_at, l.id`).bind(memberId).all(),
      db.prepare(`SELECT r.id, l.loan_reference AS loanReference,
        r.amount, r.description, r.paid_at AS paidAt
        FROM loan_repayments r JOIN member_loans l ON l.id = r.loan_id
        WHERE l.member_id = ? ORDER BY r.paid_at, r.id`).bind(memberId).all(),
    ])
    if (!member || !termination) throw new ApiError('Terminated member settlement was not found.', 404)

    const statementEntries = [
      ...loanRows.results.map((loan) => ({
        occurredAt: loan.issuedAt,
        description: `Loan issued — ${loan.reference} (principal ${Number(loan.principalAmount).toFixed(2)})`,
        debit: Number(loan.totalRepayable),
        credit: 0,
        sortPriority: 0,
        sortId: Number(loan.id),
      })),
      ...repaymentRows.results.map((repayment) => ({
        occurredAt: repayment.paidAt,
        description: `Loan repayment — ${repayment.loanReference}${repayment.description ? `: ${repayment.description}` : ''}`,
        debit: 0,
        credit: Number(repayment.amount),
        sortPriority: 1,
        sortId: Number(repayment.id),
      })),
      ...savingsRows.results.map((entry) => ({
        occurredAt: entry.occurredAt,
        description: entry.description || (entry.entryType === 'deposit' ? 'Savings deposit' : 'Savings withdrawal'),
        debit: entry.entryType === 'withdrawal' ? Number(entry.amount) : 0,
        credit: entry.entryType === 'deposit' ? Number(entry.amount) : 0,
        sortPriority: entry.entryType === 'withdrawal' ? 2 : 1,
        sortId: Number(entry.id),
      })),
    ].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)
      || left.sortPriority - right.sortPriority
      || left.sortId - right.sortId)

    let balance = 0
    const ledger = statementEntries.map((entry) => {
      balance = Math.round((balance + entry.credit - entry.debit) * 100) / 100
      return {
        occurredAt: entry.occurredAt,
        description: entry.description,
        debit: entry.debit,
        credit: entry.credit,
        balance,
      }
    })
    return json({
      member,
      termination: {
        ...termination,
        savingsApplied: Number(termination.savingsApplied),
        loanBalanceSettled: Number(termination.loanBalanceSettled),
        payoutAmount: Number(termination.payoutAmount),
        remainingLoanDue: Number(termination.remainingLoanDue),
        savingsBefore: Number(termination.savingsBefore),
        charges: JSON.parse(termination.chargesJson),
      },
      ledger,
    })
  }
  if (terminateMember && method === 'POST') {
    const memberId = Number(terminateMember[1])
    const body = await readJson(request)
    if (body.charges !== undefined && !Array.isArray(body.charges)) {
      throw new ApiError('Termination charges must be a list.')
    }
    const charges = (body.charges ?? []).map((charge) => {
      const description = typeof charge?.description === 'string' ? charge.description.trim() : ''
      const amount = Number(charge?.amount)
      if (!description || description.length > 120 || !Number.isFinite(amount) || amount <= 0) {
        throw new ApiError('Each termination charge needs a description and a positive amount.')
      }
      const roundedAmount = Math.round(amount * 100) / 100
      if (roundedAmount <= 0) throw new ApiError('Termination charge amounts must be at least 0.01.')
      return { description, amount: roundedAmount }
    })
    if (charges.length > 20) throw new ApiError('A termination can include at most 20 custom charges.')
    const member = await db.prepare("SELECT id, full_name AS fullName FROM members WHERE id = ? AND account_status = 'approved'")
      .bind(memberId).first()
    if (!member) throw new ApiError('Active member account was not found.', 404)
    const [savingsRow, loans] = await Promise.all([
      db.prepare(`SELECT COALESCE(SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE -amount END), 0) AS balance
        FROM savings_transactions WHERE member_id = ?`).bind(memberId).first(),
      db.prepare(`SELECT id, outstanding_balance AS balance FROM member_loans
        WHERE member_id = ? AND outstanding_balance > 0 ORDER BY issued_at, id`).bind(memberId).all(),
    ])
    const savings = Math.max(0, Math.round(Number(savingsRow.balance) * 100) / 100)
    const totalDue = Math.round(loans.results.reduce((sum, loan) => sum + Number(loan.balance), 0) * 100) / 100
    let toApply = Math.min(savings, totalDue)
    const allocations = loans.results.map((loan) => {
      const paid = Math.min(toApply, Number(loan.balance))
      toApply = Math.round((toApply - paid) * 100) / 100
      return { id: loan.id, balance: Number(loan.balance), paid, remaining: Math.round((Number(loan.balance) - paid) * 100) / 100 }
    }).filter((loan) => loan.paid > 0)
    const applied = Math.round(allocations.reduce((sum, loan) => sum + loan.paid, 0) * 100) / 100
    const chargesTotal = Math.round(charges.reduce((sum, charge) => sum + charge.amount, 0) * 100) / 100
    const savingsAvailableAfterLoans = Math.round((savings - applied) * 100) / 100
    if (chargesTotal > savingsAvailableAfterLoans) {
      throw new ApiError('Custom charges cannot exceed the member savings remaining after loan settlement.')
    }
    const payout = Math.round((savingsAvailableAfterLoans - chargesTotal) * 100) / 100
    const remainingDue = Math.round((totalDue - applied) * 100) / 100
    const settlementKey = randomBytes(16).toString('hex')
    const hasSettlementRecord = 'EXISTS (SELECT 1 FROM member_terminations WHERE member_id = ? AND settlement_key = ?)'
    const settlementRecordValues = [memberId, settlementKey]
    const statements = [db.prepare(`INSERT INTO member_terminations
      (member_id, savings_applied, loan_balance_settled, payout_amount, remaining_loan_due,
        savings_before, charges_json, settlement_key, admin_id)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT account_status FROM members WHERE id = ?) = 'approved'
      AND (SELECT COALESCE(SUM(CASE WHEN entry_type='deposit' THEN amount ELSE -amount END),0)
        FROM savings_transactions WHERE member_id = ?) = ?
      AND (SELECT COALESCE(SUM(outstanding_balance), 0) FROM member_loans
        WHERE member_id = ? AND outstanding_balance > 0) = ?`).bind(
      memberId, applied, applied, payout, remainingDue, savings, JSON.stringify(charges), settlementKey,
      session.adminId, memberId, memberId, savingsRow.balance, memberId, totalDue)]
    for (const loan of allocations) {
      statements.push(db.prepare(`INSERT INTO loan_repayments (loan_id, admin_id, amount, description)
        SELECT ?, ?, ?, 'Member termination settlement' WHERE EXISTS (
          SELECT 1 FROM member_loans WHERE id = ? AND outstanding_balance = ?
        ) AND ${hasSettlementRecord}`).bind(loan.id, session.adminId, loan.paid, loan.id, loan.balance, ...settlementRecordValues))
      statements.push(db.prepare(`UPDATE member_loans SET outstanding_balance = ?, status = ?
        WHERE id = ? AND outstanding_balance = ? AND ${hasSettlementRecord}`)
        .bind(loan.remaining, loan.remaining === 0 ? 'paid' : 'active', loan.id, loan.balance, ...settlementRecordValues))
    }
    if (savings > 0) statements.push(db.prepare(`INSERT INTO savings_transactions (member_id, entry_type, amount, description)
      SELECT ?, 'withdrawal', ?, 'Member termination: savings applied to outstanding loans'
      WHERE ? > 0 AND ${hasSettlementRecord}`).bind(memberId, applied, applied, ...settlementRecordValues))
    for (const charge of charges) {
      statements.push(db.prepare(`INSERT INTO savings_transactions (member_id, entry_type, amount, description)
        SELECT ?, 'withdrawal', ?, ? WHERE ${hasSettlementRecord}`)
        .bind(memberId, charge.amount, `Termination charge: ${charge.description}`, ...settlementRecordValues))
    }
    if (payout > 0) statements.push(db.prepare(`INSERT INTO savings_transactions (member_id, entry_type, amount, description)
      SELECT ?, 'withdrawal', ?, 'Member termination payout' WHERE ${hasSettlementRecord}`)
      .bind(memberId, payout, ...settlementRecordValues))
    statements.push(db.prepare(`UPDATE members SET account_status = 'terminated'
      WHERE id = ? AND account_status = 'approved' AND ${hasSettlementRecord}`)
      .bind(memberId, ...settlementRecordValues))
    statements.push(db.prepare("UPDATE loan_applications SET status = 'rejected' WHERE member_id = ? AND status IN ('pending', 'approved') AND (SELECT account_status FROM members WHERE id = ?) = 'terminated'")
      .bind(memberId, memberId))
    statements.push(db.prepare("DELETE FROM sessions WHERE member_id = ? AND (SELECT account_status FROM members WHERE id = ?) = 'terminated'").bind(memberId, memberId))
    await db.batch(statements)
    const updated = await db.prepare("SELECT account_status FROM members WHERE id = ?").bind(memberId).first()
    if (updated?.account_status !== 'terminated') throw new ApiError('Settlement changed before completion. Refresh and retry.', 409)
    return json({
      message: `${member.fullName} terminated. ${payout.toFixed(2)} paid out after ${chargesTotal.toFixed(2)} in custom charges; ${remainingDue.toFixed(2)} loan balance remains due.`,
      savingsApplied: applied,
      chargesTotal,
      payoutAmount: payout,
      remainingLoanDue: remainingDue,
    })
  }
  if (deleteMember && method === 'DELETE') {
    const memberId = Number(deleteMember[1])
    const member = await db.prepare('SELECT full_name AS fullName FROM members WHERE id = ?')
      .bind(memberId).first()
    if (!member) throw new ApiError('Member account was not found.', 404)
    const result = await db.prepare(`
      DELETE FROM members WHERE id = ?
        AND NOT EXISTS (SELECT 1 FROM savings_transactions WHERE member_id = members.id)
        AND NOT EXISTS (SELECT 1 FROM member_loans WHERE member_id = members.id)
        AND NOT EXISTS (SELECT 1 FROM loan_applications WHERE member_id = members.id)
        AND NOT EXISTS (SELECT 1 FROM dividend_payments WHERE member_id = members.id)
        AND NOT EXISTS (SELECT 1 FROM admins WHERE member_id = members.id)
    `).bind(memberId).run()
    if (!result.meta.changes) {
      throw new ApiError('This account has financial, loan, or administrator history and cannot be deleted.')
    }
    return json({ message: `${member.fullName} was deleted.` })
  }

  const promoteMember = path.match(/^\/admin\/members\/(\d+)\/promote$/)
  if (promoteMember && method === 'POST') {
    if (session.adminRole !== 'superadmin') {
      throw new ApiError('Only the super administrator can promote members.', 403)
    }
    const memberId = Number(promoteMember[1])
    const member = await db.prepare(`
      SELECT id, national_id AS nationalId, full_name AS fullName,
        password_salt AS passwordSalt, password_hash AS passwordHash
      FROM members WHERE id = ?
    `).bind(memberId).first()
    if (!member) throw new ApiError('Member account was not found.', 404)
    if (!member.nationalId) throw new ApiError('This account cannot be promoted because it has no National ID.')
    const existingPromotion = await db.prepare('SELECT id FROM admins WHERE member_id = ?')
      .bind(memberId).first()
    if (existingPromotion) throw new ApiError('This account is already an administrator.', 409)
    try {
      const result = await db.prepare(`
        INSERT INTO admins (username, display_name, password_salt, password_hash, role, member_id)
        VALUES (?, ?, ?, ?, 'admin', ?)
      `).bind(member.nationalId, member.fullName, member.passwordSalt, member.passwordHash, memberId).run()
      if (!result.meta.changes) throw new ApiError('Could not promote this account.', 500)
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') throw error
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new ApiError('An administrator already uses this National ID as a username.', 409)
      }
      throw error
    }
    return json({ message: `${member.fullName} is now an administrator.` }, 201)
  }

  const memberDecision = path.match(/^\/admin\/members\/(\d+)\/decision$/)
  if (memberDecision && method === 'POST') {
    const memberId = Number(memberDecision[1])
    const decision = (await readJson(request)).decision
    if (!['approve', 'reject'].includes(decision)) {
      throw new ApiError('Choose approve or reject for this member account.')
    }
    const nextStatus = decision === 'approve' ? 'approved' : 'rejected'
    const result = await db.prepare(`
      UPDATE members SET account_status = ? WHERE id = ? AND account_status = 'pending'
    `).bind(nextStatus, memberId).run()
    if (!result.meta.changes) {
      const member = await db.prepare('SELECT id FROM members WHERE id = ?').bind(memberId).first()
      throw new ApiError(member ? 'This account has already been reviewed.' : 'Member account was not found.', member ? 409 : 404)
    }
    return json({ message: `Member account ${nextStatus}.`, status: nextStatus })
  }
  // GET /admin/profile-changes — list pending profile change requests
  if (path === '/admin/profile-changes' && method === 'GET') {
    const rows = await db.prepare(`
      SELECT p.id, p.member_id AS memberId, m.full_name AS memberName,
        m.sacco_number AS saccoNumber, p.changes_json AS changesJson,
        p.status, p.submitted_at AS submittedAt
      FROM pending_profile_changes p
      JOIN members m ON m.id = p.member_id
      WHERE p.status = 'pending'
      ORDER BY p.submitted_at DESC
    `).all()
    return json({
      changes: rows.results.map((r) => ({ ...r, changes: JSON.parse(r.changesJson), changesJson: undefined }))
    })
  }

  // POST /admin/profile-changes/:id/approve
  const approveMatch = path.match(/^\/admin\/profile-changes\/(\d+)\/approve$/)
  if (approveMatch && method === 'POST') {
    const changeId = Number(approveMatch[1])
    const row = await db.prepare(`SELECT * FROM pending_profile_changes WHERE id=? AND status='pending'`).bind(changeId).first()
    if (!row) throw new ApiError('Pending change not found.', 404)
    const changes = JSON.parse(row.changes_json)
    await db.prepare(`UPDATE members SET phone_number=?, email=?, job_title=?, work_branch=?, county=?, sub_county=?, location=?,
      bank_name=?, bank_branch=?, bank_account_name=?, bank_account_number=?,
      bank_two_name=?, bank_two_branch=?, bank_two_account_name=?, bank_two_account_number=?,
      next_kin_name=?, next_kin_relationship=?, next_kin_phone=? WHERE id=?`
    ).bind(
      changes.phoneNumber, changes.email, changes.jobTitle ?? '', changes.workBranch ?? '', changes.county, changes.subCounty, changes.location,
      changes.bankName, changes.bankBranch, changes.bankAccountName, changes.bankAccountNumber,
      changes.bankTwoName, changes.bankTwoBranch, changes.bankTwoAccountName, changes.bankTwoAccountNumber,
      changes.nextKinName, changes.nextKinRelationship, changes.nextKinPhone,
      row.member_id
    ).run()
    await db.prepare(`UPDATE pending_profile_changes SET status='approved', reviewed_at=datetime('now') WHERE id=?`)
      .bind(changeId).run()
    return json({ message: 'Profile change approved and applied to member account.' })
  }

  // POST /admin/profile-changes/:id/reject
  const rejectMatch = path.match(/^\/admin\/profile-changes\/(\d+)\/reject$/)
  if (rejectMatch && method === 'POST') {
    const changeId = Number(rejectMatch[1])
    const body2 = await readJson(request)
    const note = typeof body2.note === 'string' ? body2.note.trim() : ''
    const result = await db.prepare(`UPDATE pending_profile_changes SET status='rejected', reviewed_at=datetime('now'), admin_note=? WHERE id=? AND status='pending'`)
      .bind(note, changeId).run()
    if (!result.meta.changes) throw new ApiError('Pending change not found.', 404)
    return json({ message: 'Profile change rejected.' })
  }

  return null
}
