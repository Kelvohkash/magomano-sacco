import { RefreshCcw } from 'lucide-react'
import { useState, type FormEventHandler } from 'react'
import { AdminStatementPanel } from '../../AdminStatementPanel'
import type { AdminOpenLoan } from '../../../types'

interface Props {
  statementRefreshKey: number
  onRecordsChanged: () => Promise<void>
  openLoans: AdminOpenLoan[]
  repaymentLoanId: string
  setRepaymentLoanId: (value: string) => void
  repaymentAmount: string
  setRepaymentAmount: (value: string) => void
  repaymentDescription: string
  setRepaymentDescription: (value: string) => void
  onLoanRepayment: FormEventHandler<HTMLFormElement>
  submitting: boolean
}

export function AdminRepaymentsView({ statementRefreshKey, onRecordsChanged, openLoans, repaymentLoanId, setRepaymentLoanId, repaymentAmount, setRepaymentAmount, repaymentDescription, setRepaymentDescription, onLoanRepayment, submitting }: Props) {
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)
  const selectedLoan = openLoans.find((loan) => String(loan.id) === repaymentLoanId)
  const normalizedSearch = memberSearch.trim().toLocaleLowerCase()
  const matchingLoans = normalizedSearch
    ? openLoans.filter((loan) =>
      `${loan.fullName} ${loan.nationalId}`.toLocaleLowerCase().includes(normalizedSearch),
    )
    : []
  const selectedMemberLabel = selectedLoan
    ? `${selectedLoan.fullName} · ${selectedLoan.nationalId}`
    : ''

  return (
    <div className="admin-view-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">Loan Repayments Ledger</h1>
          <p className="view-page-desc">Review posted loan repayments and edit a payment from its details panel.</p>
        </div>
        <span className="view-intro-icon"><RefreshCcw size={20} /></span>
      </div>
      <form className="admin-create-panel repayment-entry-form" onSubmit={onLoanRepayment}>
        <div className="admin-create-panel-heading"><h2>Record a loan payment</h2><p>Select the loan and enter the payment received.</p></div>
        <div className="form-fields-grid">
          <div
            className="admin-search-picker"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMemberPickerOpen(false)
            }}
          >
            <label htmlFor="repayment-member-search">Search member by name or ID</label>
            <input
              id="repayment-member-search"
              type="search"
              aria-haspopup="listbox"
              aria-expanded={memberPickerOpen && Boolean(normalizedSearch)}
              aria-controls="repayment-member-results"
              value={memberSearch || selectedMemberLabel}
              onFocus={() => setMemberPickerOpen(true)}
              onChange={(event) => {
                setMemberSearch(event.target.value)
                setRepaymentLoanId('')
                setMemberPickerOpen(true)
              }}
              placeholder="Type member name or national ID"
              required={!repaymentLoanId}
            />
            {memberPickerOpen && normalizedSearch && (
              <div className="admin-search-picker-results" id="repayment-member-results" role="listbox" aria-label="Matching member loans">
                {matchingLoans.length > 0 ? matchingLoans.map((loan) => (
                  <button
                    className="admin-search-picker-option"
                    key={loan.id}
                    type="button"
                    role="option"
                    aria-selected={String(loan.id) === repaymentLoanId}
                    onClick={() => {
                      setRepaymentLoanId(String(loan.id))
                      setMemberSearch(`${loan.fullName} · ${loan.nationalId}`)
                      setMemberPickerOpen(false)
                    }}
                  >
                    <span><strong>{loan.fullName}</strong><small>ID: {loan.nationalId} · Loan: {loan.reference}</small></span>
                    <strong>Due {Number(loan.outstandingBalance).toFixed(2)}</strong>
                  </button>
                )) : <p className="admin-search-picker-empty" role="status">No outstanding loans found for that member.</p>}
              </div>
            )}
          </div>
          <label>Selected loan<input type="text" value={selectedLoan ? `${selectedLoan.reference} · due ${Number(selectedLoan.outstandingBalance).toFixed(2)}` : ''} placeholder="Search and choose a member loan" readOnly required /></label>
          <label>Payment amount<input type="number" min="0.01" step="0.01" value={repaymentAmount} onChange={(event) => setRepaymentAmount(event.target.value)} required /></label>
          <label>Description<input maxLength={120} value={repaymentDescription} onChange={(event) => setRepaymentDescription(event.target.value)} placeholder="Loan repayment" /></label>
        </div>
        <div className="modal-actions-bar"><button className="submit-button" type="submit" disabled={submitting || !repaymentLoanId}>{submitting ? 'Recording…' : 'Record payment'}</button></div>
      </form>
      <AdminStatementPanel type="repayments" title="Loan Repayments" refreshKey={statementRefreshKey} onRecordsChanged={onRecordsChanged} />
    </div>
  )
}
