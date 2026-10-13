import { RefreshCcw } from 'lucide-react'
import type { FormEventHandler } from 'react'
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
          <label>Loan<select value={repaymentLoanId} onChange={(event) => setRepaymentLoanId(event.target.value)} required><option value="">Choose an outstanding loan</option>{openLoans.map((loan) => <option key={loan.id} value={loan.id}>{loan.fullName} · {loan.reference} · due {Number(loan.outstandingBalance).toFixed(2)}</option>)}</select></label>
          <label>Payment amount<input type="number" min="0.01" step="0.01" value={repaymentAmount} onChange={(event) => setRepaymentAmount(event.target.value)} required /></label>
          <label>Description<input maxLength={120} value={repaymentDescription} onChange={(event) => setRepaymentDescription(event.target.value)} placeholder="Loan repayment" /></label>
        </div>
        <div className="modal-actions-bar"><button className="submit-button" type="submit" disabled={submitting || openLoans.length === 0}>{submitting ? 'Recording…' : 'Record payment'}</button></div>
      </form>
      <AdminStatementPanel type="repayments" title="Loan Repayments" refreshKey={statementRefreshKey} onRecordsChanged={onRecordsChanged} />
    </div>
  )
}
