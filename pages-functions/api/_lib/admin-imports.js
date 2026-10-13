import { randomBytes } from 'node:crypto'
import { ApiError, hashPassword, json, readJson, sha256 } from './shared.js'

const MAX_IMPORT_ROWS = 400

function normalizeImportDate(value, rowNumber) {
  const date = typeof value === 'string' ? value.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(`Row ${rowNumber}: date must use YYYY-MM-DD.`)
  }
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ApiError(`Row ${rowNumber}: date must be a valid calendar date.`)
  }
  return date
}

export async function importRows(request, session, db, kind) {
  const rawRows = (await readJson(request)).rows
  if (!Array.isArray(rawRows) || rawRows.length === 0 || rawRows.length > MAX_IMPORT_ROWS) {
    throw new ApiError(`Upload between 1 and ${MAX_IMPORT_ROWS} rows per batch.`)
  }
  const rows = rawRows.map((row, index) => {
    const rowNumber = index + 2
    if (kind === 'members') {
      const saccoNumber = typeof row?.saccoNumber === 'string' ? row.saccoNumber.trim().toUpperCase() : ''
      const fullName = typeof row?.fullName === 'string' ? row.fullName.trim() : ''
      const nationalId = typeof row?.nationalId === 'string' ? row.nationalId.trim() : ''
      if (!/^[A-Z]+\/\d+$/.test(saccoNumber)) throw new ApiError(`Row ${rowNumber}: SACCO number must look like A/005.`)
      if (fullName.length < 2 || fullName.length > 100) throw new ApiError(`Row ${rowNumber}: enter a member name (up to 100 characters).`)
      if (nationalId && !/^\d{6,12}$/.test(nationalId)) throw new ApiError(`Row ${rowNumber}: National ID must be blank or 6 to 12 digits.`)
      return { saccoNumber, fullName, nationalId, rowNumber }
    }
    const amount = Math.round(Number(row?.amount) * 100) / 100
    const description = typeof row?.description === 'string' ? row.description.trim() : ''
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
      throw new ApiError(`Row ${rowNumber}: amount must be greater than zero.`)
    }
    if (description.length > 120) throw new ApiError(`Row ${rowNumber}: description must be 120 characters or fewer.`)
    const date = normalizeImportDate(row?.date, rowNumber)
    if (kind === 'savings') {
      const memberIdentifier = typeof row?.memberIdentifier === 'string'
        ? row.memberIdentifier.trim()
        : (typeof row?.nationalId === 'string' ? row.nationalId.trim() : '')
      const entryType = typeof row?.entryType === 'string' && row.entryType.trim()
        ? row.entryType.trim().toLowerCase()
        : 'deposit'
      if (!/^\d{6,12}$/.test(memberIdentifier) && !/^[A-Za-z]+\/\d+$/.test(memberIdentifier)) {
        throw new ApiError(`Row ${rowNumber}: enter a SACCO number or National ID.`)
      }
      if (entryType !== 'deposit') {
        throw new ApiError(`Row ${rowNumber}: savings entries can only be deposits. Members use loans for borrowing.`)
      }
      return { memberIdentifier, entryType, amount, description, date, rowNumber }
    }
    const memberIdentifier = typeof row?.memberIdentifier === 'string'
      ? row.memberIdentifier.trim()
      : (typeof row?.loanReference === 'string' ? row.loanReference.trim() : '')
    if (!/^\d{6,12}$/.test(memberIdentifier) && !/^[A-Za-z]+\/\d+$/.test(memberIdentifier)) {
      throw new ApiError(`Row ${rowNumber}: enter a SACCO number or National ID.`)
    }
    return { memberIdentifier, amount, description, date, rowNumber }
  })
  const contentHash = await sha256(JSON.stringify({ type: kind, rows }))
  if (kind === 'members') {
    const prior = await db.prepare('SELECT id FROM member_import_batches WHERE content_hash = ?')
      .bind(contentHash).first()
    if (prior) throw new ApiError('This member file has already been imported.', 409)
    const temporaryPassword = 'Magomano1234'
    const statements = [db.prepare(`
      INSERT INTO member_import_batches (content_hash, imported_rows, imported_by)
      VALUES (?, ?, ?)
    `).bind(contentHash, rows.length, session.adminId)]
    for (const row of rows) {
      const salt = randomBytes(16).toString('hex')
      const passwordHash = hashPassword(temporaryPassword, salt)
      const nameParts = row.fullName.split(/\s+/)
      const firstName = nameParts.shift() ?? ''
      const lastName = nameParts.length > 1 ? nameParts.pop() ?? '' : ''
      const secondName = nameParts.join(' ')
      statements.push(db.prepare(`
        INSERT INTO members (
          sacco_number, national_id, full_name, first_name, second_name, last_name,
          account_status, password_salt, password_hash
        ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?)
      `).bind(row.saccoNumber, row.nationalId, row.fullName, firstName, secondName, lastName, salt, passwordHash))
    }
    try {
      await db.batch(statements)
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new ApiError('A SACCO number or National ID in this file is already assigned. No rows were imported.', 409)
      }
      throw error
    }
    return json({
      message: `Imported ${rows.length} member accounts. Shared temporary password: ${temporaryPassword}`,
      importedRows: rows.length,
      temporaryPassword,
    }, 201)
  }
  if (!['savings', 'repayments'].includes(kind)) throw new ApiError('Choose a member, savings, or loan repayment import.')
  const prior = await db.prepare('SELECT id FROM bulk_import_batches WHERE content_hash = ?')
    .bind(contentHash).first()
  if (prior) throw new ApiError(`This ${kind === 'savings' ? 'savings' : 'loan repayment'} file has already been imported.`, 409)

  const importType = kind
  const memberIdCache = new Map()
  const candidates = []
  for (const row of rows) {
    let memberId = memberIdCache.get(row.memberIdentifier)
    if (!memberId) {
      const member = await db.prepare(`
        SELECT id FROM members
        WHERE (sacco_number = ? COLLATE NOCASE OR national_id = ? COLLATE NOCASE)
          AND account_status = 'approved'
      `).bind(row.memberIdentifier, row.memberIdentifier).first()
      if (!member) {
        throw new ApiError(
          `Import rejected. Row ${row.rowNumber}: no approved member has identifier ${row.memberIdentifier}. No rows were imported.`,
          409,
        )
      }
      memberId = member.id
      memberIdCache.set(row.memberIdentifier, memberId)
    }
    const rowHash = await sha256(JSON.stringify([importType, memberId, row.date, row.amount]))
    candidates.push({ ...row, memberId, rowHash })
  }
  const existingRowHashes = new Set()
  for (let start = 0; start < candidates.length; start += 80) {
    const hashes = candidates.slice(start, start + 80).map((row) => row.rowHash)
    const placeholders = hashes.map(() => '?').join(', ')
    const result = await db.prepare(`SELECT row_hash FROM imported_transaction_rows WHERE row_hash IN (${placeholders})`)
      .bind(...hashes).all()
    for (const row of result.results) existingRowHashes.add(row.row_hash)
  }
  const seenRowHashes = new Set()
  const freshRows = []
  let skippedDuplicates = 0
  for (const row of candidates) {
    if (seenRowHashes.has(row.rowHash) || existingRowHashes.has(row.rowHash)) {
      skippedDuplicates += 1
      continue
    }
    seenRowHashes.add(row.rowHash)
    freshRows.push(row)
  }
  if (!freshRows.length) throw new ApiError('All rows in this file have already been imported.', 409)

  const statements = [db.prepare(`
    INSERT INTO bulk_import_batches (import_type, content_hash, imported_rows, imported_by)
    VALUES (?, ?, ?, ?)
  `).bind(kind, contentHash, freshRows.length, session.adminId)]
  const loanBalances = new Map()
  let savingsCount = 0
  let repaymentCount = 0
  let pendingAmount = 0
  for (const row of freshRows) {
    statements.push(db.prepare(`
      INSERT INTO imported_transaction_rows (import_type, row_hash) VALUES (?, ?)
    `).bind(importType, row.rowHash))
    if (kind === 'savings') {
      savingsCount += 1
      statements.push(db.prepare(`
        INSERT INTO savings_transactions (member_id, entry_type, amount, description, occurred_at)
        VALUES (?, 'deposit', ?, ?, ?)
      `).bind(row.memberId, row.amount, 'Savings', `${row.date} 12:00:00`))
      continue
    }
    repaymentCount += 1
    let loans = loanBalances.get(row.memberId)
    if (!loans) {
      loans = await db.prepare(`
        SELECT id, outstanding_balance AS balance FROM member_loans
        WHERE member_id = ? AND outstanding_balance > 0
        ORDER BY issued_at ASC, id ASC
      `).bind(row.memberId).all().then((result) => result.results)
      loanBalances.set(row.memberId, loans)
    }
    let unallocated = row.amount
    for (const loan of loans) {
      if (unallocated <= 0) break
      const allocation = Math.min(unallocated, Number(loan.balance))
      if (allocation <= 0) continue
      loan.balance = Math.max(0, Math.round((Number(loan.balance) - allocation) * 100) / 100)
      unallocated = Math.max(0, Math.round((unallocated - allocation) * 100) / 100)
      statements.push(db.prepare(`
        INSERT INTO loan_repayments (loan_id, admin_id, amount, description, paid_at)
        VALUES (?, ?, ?, 'Loan repayment', ?)
      `).bind(loan.id, session.adminId, allocation, `${row.date} 12:00:00`))
      statements.push(db.prepare(`
        UPDATE member_loans SET outstanding_balance = ?, status = ? WHERE id = ?
      `).bind(loan.balance, loan.balance === 0 ? 'paid' : 'active', loan.id))
    }
    if (unallocated > 0) {
      pendingAmount = Math.round((pendingAmount + unallocated) * 100) / 100
      statements.push(db.prepare(`
        INSERT INTO unallocated_loan_payments (
          member_id, admin_id, amount, remaining_amount, description, paid_at
        ) VALUES (?, ?, ?, ?, 'Loan repayment', ?)
      `).bind(row.memberId, session.adminId, unallocated, unallocated, `${row.date} 12:00:00`))
    }
  }
  try {
    const results = await db.batch(statements)
    const batchId = results[0].meta.last_row_id
    return json({
      message: `${kind === 'savings' ? `Imported ${savingsCount} savings entries.` : `Imported ${repaymentCount} loan repayments.${pendingAmount ? ` ${pendingAmount.toFixed(2)} is pending allocation to a future loan.` : ''}`}${skippedDuplicates ? ` Skipped ${skippedDuplicates} previously imported row${skippedDuplicates === 1 ? '' : 's'}.` : ''}`,
      batchId,
      importedRows: freshRows.length,
      skippedDuplicates,
      pendingAmount,
    }, 201)
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed')) {
      throw new ApiError(`This file contains a transaction row that has already been imported.`, 409)
    }
    throw error
  }
}
