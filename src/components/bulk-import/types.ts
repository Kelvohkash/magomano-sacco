export interface SavingsImportRow {
  memberIdentifier: string
  nationalId: string
  entryType: string
  amount: string
  description: string
  date: string
}

export interface RepaymentImportRow {
  memberIdentifier: string
  loanReference: string
  amount: string
  description: string
  date: string
}

export interface MemberImportRow {
  saccoNumber: string
  fullName: string
  nationalId: string
}

export type ImportKind = 'members' | 'savings' | 'repayments'
export type CsvRow = SavingsImportRow & RepaymentImportRow & MemberImportRow

export const importColumns: Record<ImportKind, string[]> = {
  members: ['saccoNumber', 'fullName', 'nationalId'],
  savings: ['memberIdentifier', 'amount', 'description', 'date'],
  repayments: ['memberIdentifier', 'amount', 'description', 'date'],
}
