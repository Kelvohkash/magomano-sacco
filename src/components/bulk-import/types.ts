export interface SavingsImportRow {
  nationalId: string
  entryType: string
  amount: string
  description: string
  date: string
}

export interface RepaymentImportRow {
  loanReference: string
  amount: string
  description: string
  date: string
}

export type ImportKind = 'savings' | 'repayments'
export type CsvRow = SavingsImportRow & RepaymentImportRow

export const importColumns: Record<ImportKind, string[]> = {
  savings: ['nationalId', 'amount', 'description', 'date'],
  repayments: ['loanReference', 'amount', 'description', 'date'],
}
