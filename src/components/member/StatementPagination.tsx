import { ArrowLeft, ArrowRight } from 'lucide-react'

interface StatementPaginationProps {
  label: string
  page: number
  pageSize: number
  total: number
  loading: boolean
  onPageChange: (page: number) => void
}

export function StatementPagination({
  label,
  page,
  pageSize,
  total,
  loading,
  onPageChange,
}: StatementPaginationProps) {
  if (total <= pageSize && !loading) return null
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="statement-pagination" aria-label={`${label} pagination`}>
      <span>{loading ? 'Loading transactions…' : `Showing ${first}–${last} of ${total}`}</span>
      <div>
        <button
          type="button"
          aria-label={`Previous ${label} page`}
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ArrowLeft size={15} /> Previous
        </button>
        <span className="statement-page-number">
          Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <button
          type="button"
          aria-label={`Next ${label} page`}
          disabled={loading || last >= total}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

