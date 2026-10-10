import { Fragment, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye } from 'lucide-react'
import { StatementFilterPopover, type StatementFilterValues } from './StatementFilterPopover'
import { currency, formatDate } from '../format'

type StatementType = 'savings' | 'loans' | 'repayments' | 'dividends' | 'applications'
type StatementRow = Record<string, string | number | null>

const columns: Record<StatementType, { key: string; label: string }[]> = {
  savings: [
    { key: 'occurredAt', label: 'Date' },
    { key: 'fullName', label: 'Member' },
    { key: 'nationalId', label: 'National ID' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Deposit' },
  ],
  loans: [
    { key: 'issuedAt', label: 'Date issued' },
    { key: 'fullName', label: 'Member' },
    { key: 'nationalId', label: 'National ID' },
    { key: 'reference', label: 'Loan reference' },
    { key: 'principalAmount', label: 'Principal' },
    { key: 'outstandingBalance', label: 'Outstanding' },
    { key: 'securityType', label: 'Security' },
    { key: 'status', label: 'Status' },
  ],
  repayments: [
    { key: 'paidAt', label: 'Date' },
    { key: 'fullName', label: 'Member' },
    { key: 'nationalId', label: 'National ID' },
    { key: 'loanReference', label: 'Loan reference' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount paid' },
  ],
  dividends: [
    { key: 'paidAt', label: 'Date' },
    { key: 'fullName', label: 'Member' },
    { key: 'nationalId', label: 'National ID' },
    { key: 'financialPeriod', label: 'Financial period' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount' },
  ],
  applications: [
    { key: 'appliedAt', label: 'Date applied' },
    { key: 'fullName', label: 'Member' },
    { key: 'nationalId', label: 'National ID' },
    { key: 'purpose', label: 'Purpose' },
    { key: 'requestedAmount', label: 'Requested' },
    { key: 'securityType', label: 'Security' },
    { key: 'status', label: 'Status' },
  ],
}

export function AdminStatementPanel({ type, title, refreshKey }: { type: StatementType; title: string; refreshKey: number }) {
  const [items, setItems] = useState<StatementRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<StatementFilterValues>({ search: '', from: '', to: '', status: '' })
  const [viewingRowId, setViewingRowId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ type, page: String(page) })
    if (filters.search.trim()) params.set('search', filters.search.trim())
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (filters.status) params.set('status', filters.status)
    fetch(`/api/admin/statements?${params}`)
      .then(async (response) => {
        const result = await response.json() as { items?: StatementRow[]; total?: number; error?: string }
        if (!response.ok) throw new Error(result.error ?? 'Could not load this statement.')
        if (active) {
          setItems(result.items ?? [])
          setTotal(result.total ?? 0)
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load this statement.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [type, page, filters.search, filters.from, filters.to, filters.status, refreshKey])

  function updateFilter(nextFilters: StatementFilterValues) {
    setLoading(true)
    setError('')
    setPage(1)
    setFilters(nextFilters)
  }

  function changePage(nextPage: number) {
    setLoading(true)
    setError('')
    setPage(nextPage)
  }

  const pageSize = 10
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <section className="admin-record-list admin-statement-panel" aria-label={title}>
      <div className="admin-list-heading admin-statement-heading">
        <div className="admin-statement-title">
          <h2>{title}</h2>
          <span>{loading ? 'Loading…' : `${total} records`}</span>
        </div>
        <StatementFilterPopover
          label={title}
          filters={filters}
          onApply={updateFilter}
          searchPlaceholder="Name, ID, reference…"
          statusOptions={type === 'loans'
            ? [{ value: 'active', label: 'Active' }, { value: 'paid', label: 'Paid' }]
            : type === 'applications'
              ? [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]
              : undefined}
        />
      </div>
      {error && <p className="statement-error" role="alert">{error}</p>}
      {items.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr>{columns[type].map((column) => <th key={column.key}>{column.label}</th>)}<th>Actions</th></tr></thead>
            <tbody>{items.map((item) => (
              <Fragment key={String(item.id)}>
                <tr>
                  {columns[type].map(({ key }) => {
                    const value = item[key]
                    const isDate = ['occurredAt', 'issuedAt', 'paidAt', 'appliedAt'].includes(key)
                    const isAmount = ['amount', 'principalAmount', 'outstandingBalance', 'requestedAmount'].includes(key)
                    return <td key={key}>{value == null ? '—' : isDate ? formatDate(String(value)) : isAmount ? currency.format(Number(value)) : String(value)}</td>
                  })}
                  <td><button type="button" className="table-action-button" onClick={() => setViewingRowId(viewingRowId === String(item.id) ? null : String(item.id))}><Eye size={14} /> {viewingRowId === String(item.id) ? 'Hide' : 'View'}</button></td>
                </tr>
                {viewingRowId === String(item.id) && <tr className="admin-table-detail-row"><td colSpan={columns[type].length + 1}>
                  <div className="member-table-details">{Object.entries(item).map(([key, value]) => <p key={key}><strong>{key}</strong> {value == null || value === '' ? '—' : String(value)}</p>)}</div>
                </td></tr>}
              </Fragment>
            ))}</tbody>
          </table>
        </div>
      ) : !loading && !error ? <p className="admin-empty">{filters.search || filters.from || filters.to || filters.status ? 'No records match these filters.' : 'No records have been recorded yet.'}</p> : null}
      {(total > pageSize || loading) && (
        <div className="statement-pagination" aria-label={`${title} pagination`}>
          <span>{loading ? 'Loading records…' : `Showing ${first}–${last} of ${total}`}</span>
          <div>
            <button type="button" disabled={loading || page <= 1} onClick={() => changePage(page - 1)}><ArrowLeft size={15} /> Previous</button>
            <span className="statement-page-number">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
            <button type="button" disabled={loading || last >= total} onClick={() => changePage(page + 1)}>Next <ArrowRight size={15} /></button>
          </div>
        </div>
      )}
    </section>
  )
}
