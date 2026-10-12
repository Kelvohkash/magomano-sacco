import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

export interface StatementFilterValues {
  search: string
  from: string
  to: string
  status: string
}

interface StatementFilterPopoverProps {
  label: string
  filters: StatementFilterValues
  onApply: (filters: StatementFilterValues) => void
  statusOptions?: { value: string; label: string }[]
  searchPlaceholder?: string
}

export function StatementFilterPopover({
  label,
  filters,
  onApply,
  statusOptions,
  searchPlaceholder = 'Description or reference',
}: StatementFilterPopoverProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(filters)
  const [error, setError] = useState('')
  const activeFilterCount = Number(Boolean(filters.search.trim()))
    + Number(Boolean(filters.from))
    + Number(Boolean(filters.to))
    + Number(Boolean(filters.status))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  function openDialog() {
    setDraft(filters)
    setError('')
    setIsOpen(true)
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (draft.from && draft.to && draft.from > draft.to) {
      setError('The start date must be on or before the end date.')
      return
    }
    onApply(draft)
    setIsOpen(false)
  }

  function clearDraft() {
    setDraft({ search: '', from: '', to: '', status: '' })
    setError('')
  }

  return (
    <div className="statement-filter-control">
      <button
        type="button"
        className={`statement-filter-trigger${activeFilterCount ? ' has-filters' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={openDialog}
      >
        <SlidersHorizontal size={15} />
        <span>Filter</span>
        {activeFilterCount > 0 && <span className="statement-filter-count">{activeFilterCount}</span>}
      </button>
      <dialog
        ref={dialogRef}
        className="statement-filter-dialog"
        aria-label={`Filter ${label}`}
        onClose={() => setIsOpen(false)}
      >
        <form onSubmit={applyFilters}>
          <header className="statement-filter-dialog-heading">
            <div>
              <span>REFINE RESULTS</span>
              <h2>Filter {label}</h2>
            </div>
            <button type="button" className="statement-filter-close" aria-label="Close filters" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </header>
          <div className="statement-filter-fields">
            <label className="statement-filter-search">
              <span>Search</span>
              <input
                type="search"
                value={draft.search}
                onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))}
                placeholder={searchPlaceholder}
              />
            </label>
            <label>
              <span>From</span>
              <input type="date" value={draft.from} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={draft.to} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} />
            </label>
            {statusOptions && (
              <label className="statement-filter-status">
                <span>Status</span>
                <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                  <option value="">All statuses</option>
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            )}
          </div>
          {error && <p className="statement-filter-error" role="alert">{error}</p>}
          <footer className="statement-filter-actions">
            <button type="button" className="statement-filter-reset" onClick={clearDraft}>Clear all</button>
            <button type="submit" className="statement-filter-apply">Apply filters</button>
          </footer>
        </form>
      </dialog>
    </div>
  )
}
