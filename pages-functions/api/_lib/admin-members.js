import { ApiError, json, readJson } from './shared.js'

export async function handleAdminMembers(path, request, session, db) {
  const method = request.method
  if (path === '/admin/members' && method === 'GET') {
    const [members, contactRows, activeLoanRows] = await Promise.all([
      db.prepare(`
      SELECT m.id, m.national_id AS nationalId, m.full_name AS fullName,
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
        m.next_kin_phone AS nextKinPhone, m.member_role AS memberRole,
        (SELECT accepted_at FROM member_terms_acceptances ta WHERE ta.member_id = m.id) AS termsAcceptedAt,
        COALESCE(SUM(CASE WHEN s.entry_type = 'deposit' THEN s.amount ELSE -s.amount END), 0) AS savingsBalance,
        (SELECT COALESCE(SUM(l.outstanding_balance), 0) FROM member_loans l
          WHERE l.member_id = m.id AND l.outstanding_balance > 0) AS activeLoanBalance,
        (SELECT COALESCE(SUM(a.requested_amount), 0) FROM loan_applications a
          WHERE a.member_id = m.id AND a.status = 'pending') AS pendingLoanAmount,
        EXISTS (SELECT 1 FROM admins a WHERE a.member_id = m.id) AS isAdmin
      FROM members m LEFT JOIN savings_transactions s ON s.member_id = m.id
      WHERE m.national_id IS NOT NULL GROUP BY m.id ORDER BY m.full_name COLLATE NOCASE
      `).all(),
      db.prepare(`
        SELECT id, member_id AS memberId, loan_reference AS reference,
          principal_amount AS principalAmount, outstanding_balance AS outstandingBalance,
          repayment_months AS repaymentMonths, status, issued_at AS issuedAt
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
          Number(member.savingsBalance) - Number(member.activeLoanBalance) - Number(member.pendingLoanAmount),
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
    const result = await db.prepare(`
      UPDATE members SET
        full_name = ?, first_name = ?, second_name = ?, last_name = ?,
        phone_number = ?, email = ?, county = ?, sub_county = ?, bank_name = ?, bank_branch = ?,
        bank_account_name = ?, bank_account_number = ?, bank_two_name = ?, bank_two_branch = ?,
        bank_two_account_name = ?, bank_two_account_number = ?, location = ?,
        marital_status = ?, next_kin_name = ?, next_kin_relationship = ?, next_kin_phone = ?
      WHERE id = ?
    `).bind(
      values.fullName, firstName, secondName, lastName, values.phoneNumber, values.email,
      values.county, values.subCounty, values.bankName, values.bankBranch,
      values.bankAccountName, values.bankAccountNumber, values.bankTwoName, values.bankTwoBranch,
      values.bankTwoAccountName, values.bankTwoAccountNumber, values.location,
      maritalStatus, values.nextKinName, values.nextKinRelationship, values.nextKinPhone,
      memberId,
    ).run()
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
  return null
}
