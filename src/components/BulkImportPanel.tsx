import { useState, type ChangeEvent } from 'react'
import Papa from 'papaparse'
import { Download, FileSpreadsheet, FileUp } from 'lucide-react'
import { readJsonResponse, requestErrorMessage } from '../networkErrors'
import { BulkImportPreview } from './bulk-import/BulkImportPreview'
import { normalizeRows, validateRows } from './bulk-import/csv'
import { importColumns, type CsvRow, type ImportKind } from './bulk-import/types'

function parseStatementDate(value: string) {
  const text = value.trim()
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const separated = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!iso && !separated) return ''
  let year: number
  let month: number
  let day: number
  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else {
    let first = Number(separated?.[1])
    let second = Number(separated?.[2])
    year = Number(separated?.[3])
    if (first > 12) [day, month] = [first, second]
    else [month, day] = [first, second]
  }
  const candidate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const parsed = new Date(`${candidate}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === candidate ? candidate : ''
}

function parseStatementAmount(cells: string[]) {
  const candidates = cells.map((cell) => cell.trim()).filter(Boolean)
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const current = candidates[index].replace(/^(?:Ksh\.?|KES|\$)\s*/i, '').replace(/,/g, '')
    if (!/^\d+(?:\.\d{1,2})?$/.test(current)) continue
    let amount = Number(current)
    const previous = candidates[index - 1]?.trim()
    if (previous && /^\d{1,3}$/.test(previous) && /^\d{3}(?:\.\d{1,2})?$/.test(current)) {
      amount = Number(`${previous}${current}`)
    }
    if (Number.isFinite(amount) && amount > 0) return String(amount)
  }
  return ''
}

function parseSaccoNumber(cells: string[]) {
  for (const cell of cells) {
    const match = cell.match(/([A-Za-z]+\s*\/\s*\d+)/)
    if (match) return match[1].replace(/\s/g, '').toUpperCase()
  }
  return ''
}

interface BulkImportPanelProps {
  onImported: () => Promise<void>
}

export function BulkImportPanel({ onImported }: BulkImportPanelProps) {
  const [kind, setKind] = useState<ImportKind>('members')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<CsvRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [messageSuccess, setMessageSuccess] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [skippedRows, setSkippedRows] = useState(0)

  const requiredColumns = importColumns[kind]
  const isPreviewValid = rows.length > 0 && errors.length === 0

  function selectImportKind(nextKind: ImportKind) {
    setKind(nextKind)
    setFileName('')
    setRows([])
    setErrors([])
    setMessage('')
    setSkippedRows(0)
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
    setSkippedRows(0)
    if (!file) return
    setFileName(file.name)

    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (result) => {
        const rawRows = result.data.map((row) => row.map((cell) => String(cell ?? '').replace(/^\uFEFF/, '').trim()))
        const hasStatementRows = rawRows.some((row) => row.some((cell) => parseStatementDate(cell))
          && parseSaccoNumber(row).length > 0
          && parseStatementAmount(row).length > 0)

        if (hasStatementRows) {
          setKind('savings')
          const convertedRows = rawRows.flatMap((row): CsvRow[] => {
            const date = row.map(parseStatementDate).find(Boolean) ?? ''
            const memberIdentifier = parseSaccoNumber(row)
            const amount = parseStatementAmount(row)
            if (!date || !memberIdentifier || !amount) return []
            return [{
              memberIdentifier,
              nationalId: '',
              saccoNumber: '',
              fullName: '',
              entryType: 'deposit',
              amount,
              description: 'Savings',
              date,
              loanReference: '',
            }]
          })
          setRows(normalizeRows('savings', convertedRows))
          setSkippedRows(rawRows.length - convertedRows.length)
          setErrors(validateRows('savings', convertedRows))
          return
        }

        const [headerRow = [], ...dataRows] = rawRows
        const headers = headerRow.map((header) => header.trim())
        const parsedRows = dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as unknown as CsvRow)
        const missingColumns = requiredColumns.filter((column) => !headers.includes(column))
        const parseErrors = result.errors.map((error) => `CSV parse error: ${error.message}`)
        if (missingColumns.length) parseErrors.push(`Missing columns: ${missingColumns.join(', ')}.`)
        if (!parsedRows.length) parseErrors.push('The selected CSV contains no data rows.')
        if (parsedRows.length > 400) parseErrors.push('A batch cannot contain more than 400 data rows.')

        const cleanRows = normalizeRows(kind, parsedRows)
        setRows(cleanRows)
        setErrors([...parseErrors, ...validateRows(kind, cleanRows)])
      },
      error: (error) => setErrors([error.message]),
    })
  }

  async function confirmImport() {
    if (!isPreviewValid) return
    if (!window.confirm(`Import ${rows.length} ${kind} rows? Rows already recorded will be rejected or skipped according to the import result.`)) return
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
        <button type="button" className={kind === 'members' ? 'active' : ''} aria-pressed={kind === 'members'} onClick={() => selectImportKind('members')}>Member accounts</button>
        <button type="button" className={kind === 'savings' ? 'active' : ''} aria-pressed={kind === 'savings'} onClick={() => selectImportKind('savings')}>Savings statements</button>
        <button type="button" className={kind === 'repayments' ? 'active' : ''} aria-pressed={kind === 'repayments'} onClick={() => selectImportKind('repayments')}>Loan repayments</button>
      </div>

      <div className="bulk-import-guidance">
        <FileSpreadsheet size={19} />
        <div>
          <strong>{kind === 'members' ? 'Member accounts CSV' : kind === 'savings' ? 'Savings statement CSV' : 'Loan repayment CSV'}</strong>
          <span>{kind === 'members'
            ? 'Required columns: saccoNumber, fullName, nationalId. National ID may be blank.'
            : kind === 'savings'
              ? 'Required columns: memberIdentifier, amount, description, date. Use SACCO number or National ID.'
              : 'Required columns: memberIdentifier, amount, description, date. Payments go to each member’s oldest open loan first.'}</span>
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

      {skippedRows > 0 && <p className="bulk-atomic-note">{skippedRows} row{skippedRows === 1 ? '' : 's'} skipped because no valid date, SACCO number and amount were found.</p>}

      {message && <p className={`form-message ${messageSuccess ? 'success' : 'error'}`} role="status">{message}</p>}
      <p className="bulk-atomic-note">The server validates the entire batch and posts it in one transaction. If any row fails, none of the rows are applied. Re-uploading the same file is blocked.</p>
    </section>
  )
}
