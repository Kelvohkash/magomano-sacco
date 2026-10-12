import { Download } from 'lucide-react'
import { currency } from '../../format'
import type { CsvRow } from './types'

interface BulkImportPreviewProps {
  rows: CsvRow[]
  columns: string[]
  errors: string[]
  isValid: boolean
  isUploading: boolean
  onConfirm: () => void
}

export function BulkImportPreview({ rows, columns, errors, isValid, isUploading, onConfirm }: BulkImportPreviewProps) {
  return (
    <section className="bulk-preview" aria-label="Import preview">
      <div className="bulk-preview-heading">
        <div><strong>Preview</strong><span>{rows.length} rows found</span></div>
        <span className={isValid ? 'preview-valid' : 'preview-invalid'}>{isValid ? 'Ready to import' : `${errors.length} issue${errors.length === 1 ? '' : 's'}`}</span>
      </div>
      {errors.length > 0 && <ul className="bulk-errors">{errors.slice(0, 8).map((error) => <li key={error}>{error}</li>)}{errors.length > 8 && <li>And {errors.length - 8} more issues.</li>}</ul>}
      <div className="admin-table-wrap">
        <table className="admin-table bulk-preview-table">
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{rows.slice(0, 8).map((row, index) => (
            <tr key={`${row.date}-${index}`}>
              {columns.map((column) => <td key={column}>{column === 'amount' ? currency.format(Number(row.amount) || 0) : row[column as keyof CsvRow]}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {rows.length > 8 && <p className="bulk-preview-more">Showing first 8 rows.</p>}
      <button type="button" className="submit-button bulk-confirm" onClick={onConfirm} disabled={!isValid || isUploading}>
        <span>{isUploading ? 'Importing batch…' : `Confirm import of ${rows.length} rows`}</span>
        {!isUploading && <Download size={17} />}
      </button>
    </section>
  )
}
