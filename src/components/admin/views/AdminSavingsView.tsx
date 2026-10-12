import { WalletCards } from 'lucide-react'
import { AdminStatementPanel } from '../../AdminStatementPanel'

export function AdminSavingsView({ statementRefreshKey, onRecordsChanged }: { statementRefreshKey: number; onRecordsChanged: () => Promise<void> }) {
  return (
    <div className="admin-view-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">Savings Ledger</h1>
          <p className="view-page-desc">Review member deposits and edit a saved entry from its details panel.</p>
        </div>
        <span className="view-intro-icon"><WalletCards size={20} /></span>
      </div>
      <AdminStatementPanel type="savings" title="Savings Deposits" refreshKey={statementRefreshKey} onRecordsChanged={onRecordsChanged} />
    </div>
  )
}
