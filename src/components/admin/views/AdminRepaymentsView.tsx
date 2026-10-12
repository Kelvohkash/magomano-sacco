import { RefreshCcw } from 'lucide-react'
import { AdminStatementPanel } from '../../AdminStatementPanel'

export function AdminRepaymentsView({ statementRefreshKey, onRecordsChanged }: { statementRefreshKey: number; onRecordsChanged: () => Promise<void> }) {
  return (
    <div className="admin-view-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">Loan Repayments Ledger</h1>
          <p className="view-page-desc">Review posted loan repayments and edit a payment from its details panel.</p>
        </div>
        <span className="view-intro-icon"><RefreshCcw size={20} /></span>
      </div>
      <AdminStatementPanel type="repayments" title="Loan Repayments" refreshKey={statementRefreshKey} onRecordsChanged={onRecordsChanged} />
    </div>
  )
}
