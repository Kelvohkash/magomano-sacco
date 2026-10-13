import type { ImportKind, CsvRow } from './types'

export function validateRows(kind: ImportKind, rows: CsvRow[]) {
  return rows.flatMap((row, index) => {
    const rowNumber = index + 2
    if (kind === 'members') {
      const errors: string[] = []
      if (!/^[A-Za-z]+\/\d+$/.test(row.saccoNumber)) errors.push(`Row ${rowNumber}: enter a SACCO number such as A/005.`)
      if (row.fullName.trim().length < 2 || row.fullName.trim().length > 100) errors.push(`Row ${rowNumber}: enter a member name up to 100 characters.`)
      if (row.nationalId && !/^\d{6,12}$/.test(row.nationalId)) errors.push(`Row ${rowNumber}: National ID must be blank or 6 to 12 digits.`)
      return errors
    }
    const amount = Number(row.amount)
    const errors: string[] = []
    if (!Number.isFinite(amount) || amount <= 0) errors.push(`Row ${rowNumber}: amount must be greater than zero.`)
    const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? new Date(`${row.date}T00:00:00Z`) : null
    if (!dateValue || Number.isNaN(dateValue.getTime()) || dateValue.toISOString().slice(0, 10) !== row.date) {
      errors.push(`Row ${rowNumber}: date must be YYYY-MM-DD.`)
    }
    if (kind === 'savings') {
      if (!/^\d{6,12}$/.test(row.memberIdentifier) && !/^[A-Za-z]+\/\d+$/.test(row.memberIdentifier)) {
        errors.push(`Row ${rowNumber}: enter a SACCO number or National ID.`)
      }
      if (row.entryType && row.entryType.toLowerCase() !== 'deposit') errors.push(`Row ${rowNumber}: savings can only be deposited. Members use loans for borrowing.`)
    } else if (!/^\d{6,12}$/.test(row.memberIdentifier) && !/^[A-Za-z]+\/\d+$/.test(row.memberIdentifier)) {
      errors.push(`Row ${rowNumber}: enter a SACCO number or National ID.`)
    }
    if (row.description.length > 120) errors.push(`Row ${rowNumber}: description must be 120 characters or fewer.`)
    return errors
  })
}

export function normalizeRows(kind: ImportKind, rows: CsvRow[]): CsvRow[] {
  return rows.map((row) => ({
    nationalId: row.nationalId?.trim() ?? '',
    saccoNumber: row.saccoNumber?.trim().toUpperCase() ?? '',
    fullName: row.fullName?.trim() ?? '',
    memberIdentifier: row.memberIdentifier?.trim() ?? '',
    entryType: kind === 'savings' ? (row.entryType?.trim() || 'deposit') : '',
    amount: row.amount?.trim() ?? '',
    description: row.description?.trim() ?? '',
    date: row.date?.trim() ?? '',
    loanReference: row.loanReference?.trim() ?? '',
  }))
}
