import { useState, type ChangeEvent } from 'react'
import Papa from 'papaparse'
import { Download, FileSpreadsheet, FileUp } from 'lucide-react'
import { readJsonResponse, requestErrorMessage } from '../networkErrors'
import { BulkImportPreview } from './bulk-import/BulkImportPreview'
import { normalizeRows, validateRows } from './bulk-import/csv'
import { importColumns, type CsvRow, type ImportKind } from './bulk-import/types'

interface BulkImportPanelProps {
  onImported: () => Promise<void>
}

export function BulkImportPanel({ onImported }: BulkImportPanelProps) {
  const [kind, setKind] = useState<ImportKind>('savings')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<CsvRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [messageSuccess, setMessageSuccess] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const requiredColumns = importColumns[kind]
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

        const cleanRows = normalizeRows(kind, result.data)
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
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not import this CSV file.')
      setMessage(result.message ?? `Imported ${rows.length} rows.`)
      setMessageSuccess(true)
      setRows([])
      setFileName('')
      await onImported()
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to import this CSV file.'))
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

      {rows.length > 0 && <BulkImportPreview
        rows={rows}
        columns={requiredColumns}
        errors={errors}
        isValid={isPreviewValid}
        isUploading={isUploading}
        onConfirm={confirmImport}
      />}

      {message && <p className={`form-message ${messageSuccess ? 'success' : 'error'}`} role="status">{message}</p>}
      <p className="bulk-atomic-note">The server validates the entire batch and posts it in one transaction. If any row fails, none of the rows are applied. Re-uploading the same file is blocked.</p>
    </section>
  )
}
