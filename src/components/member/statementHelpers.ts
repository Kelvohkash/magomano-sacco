import type { StatementFilterValues } from '../StatementFilterPopover'

export interface StatementState<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string
  filters: StatementFilterValues
}

export function statementUrl(
  type: 'savings' | 'loans' | 'repayments',
  page: number,
  filters: StatementFilterValues,
): string {
  const params = new URLSearchParams({ type, page: String(page) })
  if (filters.search.trim()) params.set('search', filters.search.trim())
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.status) params.set('status', filters.status)
  return `/api/member/transactions?${params}`
}

export function applicationUrl(
  page: number,
  filters: StatementFilterValues,
): string {
  const params = new URLSearchParams({ page: String(page) })
  if (filters.search.trim()) params.set('search', filters.search.trim())
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.status) params.set('status', filters.status)
  return `/api/member/loan-applications?${params}`
}

