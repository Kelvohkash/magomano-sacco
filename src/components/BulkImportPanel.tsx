import { useState, type ChangeEvent } from 'react'
import Papa from 'papaparse'
import { Download, FileSpreadsheet, FileUp } from 'lucide-react'
import { currency } from '../format'

interface SavingsImportRow {
  nationalId: string
  entryType: string
  amount: string
  description: string
  date: string
}

interface RepaymentImportRow {
  loanReference: string
  amount: string
  description: string
  date: string
}

type ImportKind = 'savings' | 'repayments'
type CsvRow = SavingsImportRow & RepaymentImportRow

interface BulkImportPanelProps {
  onImported: () => Promise<void>
}

const columns: Record<ImportKind, string[]> = {
  savings: ['nationalId', 'amount', 'description', 'date'],
  repayments: ['loanReference', 'amount', 'description', 'date'],
}

function validateRows(kind: ImportKind, rows: CsvRow[]) {
  return rows.flatMap((row, index) => {
    const rowNumber = index + 2
    const amount = Number(row.amount)
    const errors: string[] = []
    if (!Number.isFinite(amount) || amount <= 0) errors.push(`Row ${rowNumber}: amount must be greater than zero.`)
    const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? new Date(`${row.date}T00:00:00Z`) : null
    if (!dateValue || Number.isNaN(dateValue.getTime()) || dateValue.toISOString().slice(0, 10) !== row.date) {
      errors.push(`Row ${rowNumber}: date must be YYYY-MM-DD.`)
    }
    if (kind === 'savings') {
      if (!/^\d{6,12}$/.test(row.nationalId)) errors.push(`Row ${rowNumber}: enter a valid National ID.`)
      if (row.entryType && row.entryType.toLowerCase() !== 'deposit') errors.push(`Row ${rowNumber}: savings can only be deposited. Members use loans for borrowing.`)
    } else if (!row.loanReference.trim()) {
      errors.push(`Row ${rowNumber}: loanReference is required.`)
    }
    if (row.description.length > 120) errors.push(`Row ${rowNumber}: description must be 120 characters or fewer.`)
    return errors
  })
}

export function BulkImportPanel({ onImported }: BulkImportPanelProps) {
  const [kind, setKind] = useState<ImportKind>('savings')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<CsvRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [messageSuccess, setMessageSuccess] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const requiredColumns = columns[kind]
  const isPreviewValid = rows.length > 0 && errors.length === 0

  function selectImportKind(nextKind: ImportKind) {
    setKind(nextKind)
    setFileName('')
    setRows([])
    setErrors([])
    setMessage('')
  }

  function downloadTemplate() {
    const csv = Papa.unparse({ fields: requiredColumns, data: [] })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `magomano-${kind}-template.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setMessage('')
    setRows([])
    setErrors([])
    if (!file) return
    setFileName(file.name)

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const headers = result.meta.fields ?? []
        const missingColumns = requiredColumns.filter((column) => !headers.includes(column))
        const parseErrors = result.errors.map((error) => `CSV parse error: ${error.message}`)
        if (missingColumns.length) parseErrors.push(`Missing columns: ${missingColumns.join(', ')}.`)
        if (!result.data.length) parseErrors.push('The selected CSV contains no data rows.')
        if (result.data.length > 400) parseErrors.push('A batch cannot contain more than 400 data rows.')

        const cleanRows = result.data.map((row) => ({
          nationalId: row.nationalId?.trim() ?? '',
          entryType: kind === 'savings' ? (row.entryType?.trim() || 'deposit') : '',
          amount: row.amount?.trim() ?? '',
          description: row.description?.trim() ?? '',
          date: row.date?.trim() ?? '',
          loanReference: row.loanReference?.trim() ?? '',
        }))
        setRows(cleanRows)
        setErrors([...parseErrors, ...validateRows(kind, cleanRows)])
      },
      error: (error) => setErrors([error.message]),
    })
  }

  async function confirmImport() {
    if (!isPreviewValid) return
    setIsUploading(true)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/imports/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not import this CSV file.')
      setMessage(result.message ?? `Imported ${rows.length} rows.`)
      setMessageSuccess(true)
      setRows([])
      setFileName('')
      await onImported()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to import this CSV file.')
      setMessageSuccess(false)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="bulk-import">
      <div className="bulk-import-mode" role="group" aria-label="Statement type">
        <button type="button" className={kind === 'savings' ? 'active' : ''} aria-pressed={kind === 'savings'} onClick={() => selectImportKind('savings')}>Savings statements</button>
        <button type="button" className={kind === 'repayments' ? 'active' : ''} aria-pressed={kind === 'repayments'} onClick={() => selectImportKind('repayments')}>Loan repayments</button>
      </div>

      <div className="bulk-import-guidance">
        <FileSpreadsheet size={19} />
        <div>
          <strong>{kind === 'savings' ? 'Savings statement CSV' : 'Loan repayment CSV'}</strong>
          <span>{kind === 'savings'
            ? 'Required columns: nationalId, amount, description, date. Every savings entry is a deposit.'
            : 'Required columns: loanReference, amount, description, date.'}</span>
        </div>
        <button type="button" className="template-button" onClick={downloadTemplate}><Download size={16} /> Template</button>
      </div>

      <label className="csv-dropzone">
        <FileUp size={22} />
        <span>{fileName || 'Choose a CSV file to preview'}</span>
        <small>CSV only · up to 400 rows · date format YYYY-MM-DD</small>
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
      </label>

      {rows.length > 0 && (
        <section className="bulk-preview" aria-label="Import preview">
          <div className="bulk-preview-heading">
            <div><strong>Preview</strong><span>{rows.length} rows found</span></div>
            <span className={isPreviewValid ? 'preview-valid' : 'preview-invalid'}>{isPreviewValid ? 'Ready to import' : `${errors.length} issue${errors.length === 1 ? '' : 's'}`}</span>
          </div>
          {errors.length > 0 && <ul className="bulk-errors">{errors.slice(0, 8).map((error) => <li key={error}>{error}</li>)}{errors.length > 8 && <li>And {errors.length - 8} more issues.</li>}</ul>}
          <div className="admin-table-wrap">
            <table className="admin-table bulk-preview-table">
              <thead><tr>{requiredColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 8).map((row, index) => (
                <tr key={`${row.date}-${index}`}>
                  {requiredColumns.map((column) => <td key={column}>{column === 'amount' ? currency.format(Number(row.amount) || 0) : row[column as keyof CsvRow]}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
          {rows.length > 8 && <p className="bulk-preview-more">Showing first 8 rows.</p>}
          <button type="button" className="submit-button bulk-confirm" onClick={confirmImport} disabled={!isPreviewValid || isUploading}>
            <span>{isUploading ? 'Importing batch…' : `Confirm import of ${rows.length} rows`}</span>
            {!isUploading && <Download size={17} />}
          </button>
        </section>
      )}

      {message && <p className={`form-message ${messageSuccess ? 'success' : 'error'}`} role="status">{message}</p>}
      <p className="bulk-atomic-note">The server validates the entire batch and posts it in one transaction. If any row fails, none of the rows are applied. Re-uploading the same file is blocked.</p>
    </section>
  )
}
