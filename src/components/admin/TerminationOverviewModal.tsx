import { useEffect, useState } from 'react'
import { Download, LoaderCircle, Printer, X } from 'lucide-react'
import { currency, formatDate } from '../../format'

interface TerminationReport {
  member: {
    saccoNumber: string | null
    nationalId: string
    fullName: string
    phoneNumber: string
    joinedAt: string
  }
  termination: {
    savingsApplied: number
    loanBalanceSettled: number
    payoutAmount: number
    remainingLoanDue: number
    savingsBefore: number
    settledAt: string
    charges: { description: string; amount: number }[]
  }
  ledger: {
    description: string
    occurredAt: string
    debit: number
    credit: number
    balance: number
  }[]
}

interface TerminationOverviewModalProps {
  memberId: number
  onClose: () => void
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] ?? character)
}

function downloadExcel(report: TerminationReport) {
  const cells = (values: (string | number)[]) => `<Row>${values.map((value) => {
    const type = typeof value === 'number' ? 'Number' : 'String'
    return `<Cell><Data ss:Type="${type}">${typeof value === 'number' ? value : escapeXml(value)}</Data></Cell>`
  }).join('')}</Row>`
  const sheet = (name: string, rows: string[]) => `<Worksheet ss:Name="${escapeXml(name)}"><Table>${rows.join('')}</Table></Worksheet>`
  const totals = report.ledger.reduce((sum, entry) => ({
    debit: sum.debit + entry.debit,
    credit: sum.credit + entry.credit,
  }), { debit: 0, credit: 0 })
  const sheets = [
    sheet('Termination statement', [
      cells(['MEMBER TERMINATION STATEMENT']),
      cells(['Member', report.member.fullName]),
      cells(['SACCO number', report.member.saccoNumber || '']),
      cells(['National ID', report.member.nationalId]),
      cells(['Phone', report.member.phoneNumber]),
      cells(['Joined', report.member.joinedAt]),
      cells(['Terminated', report.termination.settledAt]),
      cells(['Savings before settlement', report.termination.savingsBefore]),
      cells(['Savings applied to loans', report.termination.savingsApplied]),
      cells(['Loan balance settled', report.termination.loanBalanceSettled]),
      cells(['Payout (withdrawal, no interest)', report.termination.payoutAmount]),
      cells(['Remaining loan due', report.termination.remainingLoanDue]),
      cells(['']),
      cells(['Date', 'Description', 'Debit', 'Credit', 'Balance']),
      ...report.ledger.map((entry) => cells([
        entry.occurredAt,
        entry.description,
        entry.debit,
        entry.credit,
        entry.balance,
      ])),
      cells([
        '',
        'Totals',
        Math.round(totals.debit * 100) / 100,
        Math.round(totals.credit * 100) / 100,
        report.ledger[report.ledger.length - 1]?.balance ?? 0,
      ]),
    ]),
  ]
  const spreadsheet = `<?xml version="1.0" encoding="UTF-8"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      ${sheets.join('')}
    </Workbook>`
  const url = URL.createObjectURL(new Blob([spreadsheet], { type: 'application/vnd.ms-excel;charset=utf-8' }))
  const link = document.createElement('a')
  const fileMember = report.member.fullName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  link.href = url
  link.download = `${fileMember || 'member'}-termination-statement.xls`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function TerminationOverviewModal({ memberId, onClose }: TerminationOverviewModalProps) {
  const [report, setReport] = useState<TerminationReport | null>(null)
  const [error, setError] = useState('')
  const statementTotals = report?.ledger.reduce((sum, entry) => ({
    debit: sum.debit + entry.debit,
    credit: sum.credit + entry.credit,
  }), { debit: 0, credit: 0 })

  useEffect(() => {
    const controller = new AbortController()
    async function loadReport() {
      try {
        const response = await fetch(`/api/admin/members/${memberId}/termination-overview`, { signal: controller.signal })
        const result = await response.json() as TerminationReport & { error?: string }
        if (!response.ok) throw new Error(result.error ?? 'Could not load the member termination overview.')
        setReport(result)
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load the member termination overview.')
        }
      }
    }
    void loadReport()
    return () => controller.abort()
  }, [memberId])

  return (
    <div className="termination-overview-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="termination-overview-modal" role="dialog" aria-modal="true" aria-labelledby="termination-overview-title">
        <header className="termination-overview-header">
          <div>
            <p className="termination-overview-eyebrow">MEMBER ACCOUNT HISTORY</p>
            <h2 id="termination-overview-title">{report?.member.fullName ?? 'Member overview'}</h2>
            {report && <p>{report.member.saccoNumber || 'No SACCO number'} · Terminated {formatDate(report.termination.settledAt)}</p>}
          </div>
          <div className="termination-overview-actions">
            {report && <>
              <button type="button" className="table-btn-view" onClick={() => window.print()}><Printer size={15} /> Save PDF</button>
              <button type="button" className="table-btn-view" onClick={() => downloadExcel(report)}><Download size={15} /> Download Excel</button>
            </>}
            <button type="button" className="termination-overview-close" onClick={onClose} aria-label="Close member overview"><X size={19} /></button>
          </div>
        </header>

        <div className="termination-overview-body">
          {error && <p className="termination-overview-error" role="alert">{error}</p>}
          {!report && !error && <p className="termination-overview-loading"><LoaderCircle size={17} /> Loading member history…</p>}
          {report && <>
            <section className="termination-report-section">
              <h3>Member details</h3>
              <dl className="termination-member-details">
                <div><dt>SACCO number</dt><dd>{report.member.saccoNumber || '—'}</dd></div>
                <div><dt>National ID</dt><dd>{report.member.nationalId || '—'}</dd></div>
                <div><dt>Phone</dt><dd>{report.member.phoneNumber || '—'}</dd></div>
                <div><dt>Joined</dt><dd>{formatDate(report.member.joinedAt)}</dd></div>
              </dl>
            </section>

            <section className="termination-report-section">
              <h3>Final settlement</h3>
              <dl className="termination-settlement-summary">
                <div><dt>Savings before settlement</dt><dd>{currency.format(report.termination.savingsBefore)}</dd></div>
                <div><dt>Savings applied to loans</dt><dd>{currency.format(report.termination.savingsApplied)}</dd></div>
                <div><dt>Custom admin charges</dt><dd>{currency.format(report.termination.charges.reduce((sum, charge) => sum + charge.amount, 0))}</dd></div>
                <div><dt>Paid out (withdrawal; no interest)</dt><dd>{currency.format(report.termination.payoutAmount)}</dd></div>
                <div><dt>Loan balance remaining</dt><dd>{currency.format(report.termination.remainingLoanDue)}</dd></div>
              </dl>
              {report.termination.charges.length > 0 && (
                <ul className="termination-charge-list">
                  {report.termination.charges.map((charge, index) => (
                    <li key={`${charge.description}-${index}`}><span>{charge.description}</span><strong>{currency.format(charge.amount)}</strong></li>
                  ))}
                </ul>
              )}
            </section>

            <section className="termination-report-section">
              <h3>Member transaction statement</h3>
              <div className="termination-report-table-wrap">
                <table className="termination-report-table">
                  <thead><tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                  <tbody>
                    {report.ledger.map((entry, index) => (
                      <tr key={`${entry.occurredAt}-${index}`}>
                        <td>{formatDate(entry.occurredAt)}</td>
                        <td>{entry.description}</td>
                        <td>{entry.debit ? currency.format(entry.debit) : '—'}</td>
                        <td>{entry.credit ? currency.format(entry.credit) : '—'}</td>
                        <td>{currency.format(entry.balance)}</td>
                      </tr>
                    ))}
                    {!report.ledger.length && <tr><td colSpan={5}>No member financial transactions recorded.</td></tr>}
                    <tr className="termination-statement-totals">
                      <td colSpan={2}>Totals</td>
                      <td>{currency.format(statementTotals?.debit ?? 0)}</td>
                      <td>{currency.format(statementTotals?.credit ?? 0)}</td>
                      <td>{currency.format(report.ledger[report.ledger.length - 1]?.balance ?? 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </>}
        </div>
      </section>
    </div>
  )
}
