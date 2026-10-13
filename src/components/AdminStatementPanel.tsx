import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Eye, Pencil, Trash2, X } from 'lucide-react'
import { StatementFilterPopover, type StatementFilterValues } from './StatementFilterPopover'
import { currency, formatDate } from '../format'
import { readJsonResponse, requestErrorMessage } from '../networkErrors'

type StatementType = 'savings' | 'loans' | 'repayments' | 'dividends' | 'applications'
type StatementRow = Record<string, string | number | null>
interface StatementCache { items: StatementRow[]; total: number; latestId: number }

function cacheKeyFor(type: StatementType, page: number, filters: StatementFilterValues) {
  return `magomano-admin-statement:${type}:${page}:${filters.search.trim()}:${filters.from}:${filters.to}:${filters.status}`
}

function readStatementCache(key: string): StatementCache | null {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as StatementCache : null
  } catch { return null }
}

function writeStatementCache(key: string, value: StatementCache) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Cache is optional when storage is unavailable. */ }
}

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

export function AdminStatementPanel({ type, title, refreshKey, onRecordsChanged }: { type: StatementType; title: string; refreshKey: number; onRecordsChanged?: () => Promise<void> }) {
  const initialKey = cacheKeyFor(type, 1, { search: '', from: '', to: '', status: '' })
  const initialCache = readStatementCache(initialKey)
  const [items, setItems] = useState<StatementRow[]>(initialCache?.items ?? [])
  const [total, setTotal] = useState(initialCache?.total ?? 0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(!initialCache)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<StatementFilterValues>({ search: '', from: '', to: '', status: '' })
  const [viewingRowId, setViewingRowId] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<StatementRow | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    let active = true
    const key = cacheKeyFor(type, page, filters)
    const cached = readStatementCache(key)
    const params = new URLSearchParams({ type, page: String(page) })
    if (filters.search.trim()) params.set('search', filters.search.trim())
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (filters.status) params.set('status', filters.status)
    if (page === 1 && cached && ['savings', 'repayments', 'dividends'].includes(type)) {
      params.set('afterId', String(cached.latestId))
    }
    if (cached) {
      setItems(cached.items)
      setTotal(cached.total)
      setLoading(false)
    } else setLoading(true)
    fetch(`/api/admin/statements?${params}`)
      .then(async (response) => {
        const result = await readJsonResponse<{ items?: StatementRow[]; total?: number; latestId?: number; delta?: boolean; error?: string }>(response)
        if (!response.ok) throw new Error(result.error ?? 'Could not load this statement.')
        if (active) {
          let nextItems = result.items ?? []
          if (result.delta && cached) {
            const byId = new Map([...cached.items, ...nextItems].map((item) => [String(item.id), item]))
            const dateKey = ({ savings: 'occurredAt', repayments: 'paidAt', dividends: 'paidAt' } as const)[type as 'savings' | 'repayments' | 'dividends']
            nextItems = [...byId.values()].sort((left, right) =>
              String(right[dateKey] ?? '').localeCompare(String(left[dateKey] ?? '')) || Number(right.id) - Number(left.id),
            ).slice(0, 10)
          }
          const nextCache = { items: nextItems, total: result.total ?? 0, latestId: result.latestId ?? cached?.latestId ?? 0 }
          writeStatementCache(key, nextCache)
          setItems(nextItems)
          setTotal(nextCache.total)
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cached ? '' : requestErrorMessage(cause, 'Could not load this statement.'))
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

  function beginEdit(item: StatementRow) {
    setEditingRow(item)
    setEditAmount(String(item.amount ?? ''))
    setEditDescription(String(item.description ?? ''))
    setEditError('')
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingRow) return
    if (!window.confirm(`Save changes to this ${type === 'savings' ? 'savings' : 'dividend'} record?`)) return
    setSavingEdit(true)
    setEditError('')
    try {
      const response = await fetch(`/api/admin/${type}/${editingRow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: editAmount, description: editDescription }),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not update this record.')
      const nextItems = items.map((item) => String(item.id) === String(editingRow.id)
        ? { ...item, amount: Number(editAmount), description: editDescription }
        : item)
      setItems(nextItems)
      writeStatementCache(cacheKeyFor(type, page, filters), { items: nextItems, total, latestId: readStatementCache(cacheKeyFor(type, page, filters))?.latestId ?? 0 })
      setEditingRow(null)
      void onRecordsChanged?.()
    } catch (cause) {
      setEditError(requestErrorMessage(cause, 'Could not update this record.'))
    } finally {
      setSavingEdit(false)
    }
  }

  async function deleteRecord(item: StatementRow) {
    if (!window.confirm(`Delete this ${type === 'savings' ? 'savings' : 'dividend'} record for ${String(item.fullName ?? 'this member')}? This cannot be undone.`)) return
    setError('')
    try {
      const response = await fetch(`/api/admin/${type}/${item.id}`, { method: 'DELETE' })
      const result = await readJsonResponse<{ error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not delete this record.')
      const nextItems = items.filter((row) => String(row.id) !== String(item.id))
      const nextTotal = Math.max(0, total - 1)
      setItems(nextItems)
      setTotal(nextTotal)
      const key = cacheKeyFor(type, page, filters)
      writeStatementCache(key, { items: nextItems, total: nextTotal, latestId: readStatementCache(key)?.latestId ?? 0 })
      void onRecordsChanged?.()
    } catch (cause) {
      setError(requestErrorMessage(cause, 'Could not delete this record.'))
    }
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
              ? [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'disbursed', label: 'Disbursed' }]
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
                  <td><div className="statement-row-actions">
                    <button type="button" className="table-action-button" onClick={() => setViewingRowId(viewingRowId === String(item.id) ? null : String(item.id))}><Eye size={14} /> {viewingRowId === String(item.id) ? 'Hide' : 'View'}</button>
                    {['savings', 'repayments', 'dividends'].includes(type) && <button type="button" className="table-action-button" onClick={() => beginEdit(item)} aria-label={`Edit ${type} record`}><Pencil size={14} /> Edit</button>}
                    {(type === 'savings' || type === 'dividends') && <button type="button" className="table-action-button danger statement-delete-button" onClick={() => void deleteRecord(item)} aria-label={`Delete ${type} record`}><Trash2 size={14} /> Delete</button>}
                  </div></td>
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
      {editingRow && ['savings', 'repayments', 'dividends'].includes(type) && (
        <div className="member-details-drawer-backdrop statement-edit-backdrop" onClick={() => setEditingRow(null)}>
          <aside className="member-details-drawer statement-edit-drawer" onClick={(event) => event.stopPropagation()} aria-label={`Edit ${type} record`}>
            <div className="drawer-header">
              <div className="drawer-member-title">
                <div className="drawer-avatar"><Pencil size={18} /></div>
                <div><h2>Edit {type === 'savings' ? 'savings' : type === 'repayments' ? 'repayment' : 'dividend'} record</h2><span className="drawer-id">{String(editingRow.fullName ?? '')} · {String(editingRow.nationalId ?? '')}</span></div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setEditingRow(null)} aria-label="Close editor"><X size={18} /></button>
            </div>
            <form className="statement-edit-form" onSubmit={(event) => void saveEdit(event)}>
              <label htmlFor="statement-edit-amount">{type === 'savings' ? 'Deposit amount (KES)' : type === 'repayments' ? 'Repayment amount (KES)' : 'Dividend amount (KES)'}
                <input id="statement-edit-amount" type="number" min="0.01" step="0.01" required value={editAmount} onChange={(event) => setEditAmount(event.target.value)} />
              </label>
              <label htmlFor="statement-edit-description">{type === 'savings' ? 'Deposit reference' : 'Payment reference / note'}
                <input id="statement-edit-description" type="text" maxLength={120} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
              </label>
              {editError && <p className="statement-edit-error" role="alert">{editError}</p>}
              <div className="statement-edit-actions"><button type="button" className="statement-edit-cancel" onClick={() => setEditingRow(null)}>Cancel</button><button type="submit" className="submit-button" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save changes'}</button></div>
            </form>
          </aside>
        </div>
      )}
    </section>
  )
}
