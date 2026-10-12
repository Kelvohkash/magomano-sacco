import { ApiError, json, readJson, sha256 } from './shared.js'

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
    const amount = Math.round(Number(row?.amount) * 100) / 100
    const description = typeof row?.description === 'string' ? row.description.trim() : ''
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
      throw new ApiError(`Row ${rowNumber}: amount must be greater than zero.`)
    }
    if (description.length > 120) throw new ApiError(`Row ${rowNumber}: description must be 120 characters or fewer.`)
    const date = normalizeImportDate(row?.date, rowNumber)
    if (kind === 'savings') {
      const nationalId = typeof row?.nationalId === 'string' ? row.nationalId.trim() : ''
      const entryType = typeof row?.entryType === 'string' && row.entryType.trim()
        ? row.entryType.trim().toLowerCase()
        : 'deposit'
      if (!/^\d{6,12}$/.test(nationalId)) throw new ApiError(`Row ${rowNumber}: invalid National ID.`)
      if (entryType !== 'deposit') {
        throw new ApiError(`Row ${rowNumber}: savings entries can only be deposits. Members use loans for borrowing.`)
      }
      return { nationalId, entryType, amount, description, date, rowNumber }
    }
    const loanReference = typeof row?.loanReference === 'string' ? row.loanReference.trim() : ''
    if (!loanReference) throw new ApiError(`Row ${rowNumber}: loanReference is required.`)
    return { loanReference, amount, description, date, rowNumber }
  })
  const contentHash = await sha256(JSON.stringify({ type: kind, rows }))
  const prior = await db.prepare('SELECT id FROM bulk_import_batches WHERE content_hash = ?')
    .bind(contentHash).first()
  if (prior) throw new ApiError(`This ${kind === 'savings' ? 'savings' : 'repayment'} file has already been imported.`, 409)

  const statements = [
    db.prepare(`
      INSERT INTO bulk_import_batches (import_type, content_hash, imported_rows, imported_by)
      VALUES (?, ?, ?, ?)
    `).bind(kind, contentHash, rows.length, session.adminId),
  ]
  if (kind === 'savings') {
    for (const row of rows) {
      const member = await db.prepare(`
        SELECT id FROM members WHERE national_id = ? COLLATE NOCASE AND account_status = 'approved'
      `).bind(row.nationalId).first()
      if (!member) throw new ApiError(`Row ${row.rowNumber}: no approved member has National ID ${row.nationalId}.`)
      statements.push(db.prepare(`
        INSERT INTO savings_transactions (member_id, entry_type, amount, description, occurred_at)
        VALUES (?, 'deposit', ?, ?, ?)
      `).bind(member.id, row.amount, row.description || 'Savings deposit', `${row.date} 12:00:00`))
    }
  } else {
    const balances = new Map()
    for (const row of rows) {
      let loan = balances.get(row.loanReference)
      if (!loan) {
        loan = await db.prepare(`
          SELECT id, outstanding_balance AS balance FROM member_loans WHERE loan_reference = ?
        `).bind(row.loanReference).first()
        if (!loan) throw new ApiError(`Row ${row.rowNumber}: loan ${row.loanReference} was not found.`)
        balances.set(row.loanReference, loan)
      }
      if (row.amount > loan.balance + 0.001) {
        throw new ApiError(`Row ${row.rowNumber}: repayment exceeds the remaining balance for loan ${row.loanReference}.`)
      }
      loan.balance = Math.max(0, Math.round((loan.balance - row.amount) * 100) / 100)
      statements.push(db.prepare(`
        INSERT INTO loan_repayments (loan_id, admin_id, amount, description, paid_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(loan.id, session.adminId, row.amount, row.description || 'Loan repayment', `${row.date} 12:00:00`))
      statements.push(db.prepare(`
        UPDATE member_loans SET outstanding_balance = ?, status = ? WHERE id = ?
      `).bind(loan.balance, loan.balance === 0 ? 'paid' : 'active', loan.id))
    }
  }
  try {
    const results = await db.batch(statements)
    const batchId = results[0].meta.last_row_id
    return json({
      message: `Imported ${rows.length} ${kind === 'savings' ? 'savings entries' : 'loan repayments'}.`,
      batchId,
      importedRows: rows.length,
    }, 201)
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed')) {
      throw new ApiError(`This ${kind === 'savings' ? 'savings' : 'repayment'} file has already been imported.`, 409)
    }
    throw error
  }
}
