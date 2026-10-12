import type { Dispatch, SetStateAction } from 'react'
import {
  FileText,
  LayoutDashboard,
  SlidersHorizontal,
  UsersRound,
  WalletCards,
} from 'lucide-react'
import type { AdminView } from '../../types'

interface MobileAdminBottomNavProps {
  currentView: AdminView
  setView: Dispatch<SetStateAction<AdminView>>
  pendingMembersCount: number
  pendingApplicationsCount: number
  onOpenMore: () => void
}

export function MobileAdminBottomNav({
  currentView,
  setView,
  pendingMembersCount,
  pendingApplicationsCount,
  onOpenMore,
}: MobileAdminBottomNavProps) {
  const isLedgerActive = currentView === 'repayments' || currentView === 'savings'
  const isMoreActive = currentView === 'bulk' || currentView === 'terms'

  return (
    <nav className="mobile-admin-bottom-nav" aria-label="Quick admin navigation">
      <button
        type="button"
        className={`mobile-nav-tab ${currentView === 'overview' ? 'is-active' : ''}`}
        onClick={() => setView('overview')}
        aria-label="Dashboard"
      >
        <div className="mobile-nav-icon-wrap">
          <LayoutDashboard size={20} />
        </div>
        <span className="mobile-nav-label">Dashboard</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-tab ${currentView === 'members' ? 'is-active' : ''}`}
        onClick={() => setView('members')}
        aria-label="Members Directory"
      >
        <div className="mobile-nav-icon-wrap">
          <UsersRound size={20} />
          {pendingMembersCount > 0 && (
            <span className="mobile-nav-badge" title={`${pendingMembersCount} pending members`}>
              {pendingMembersCount > 99 ? '99+' : pendingMembersCount}
            </span>
          )}
        </div>
        <span className="mobile-nav-label">Members</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-tab ${currentView === 'loans' ? 'is-active' : ''}`}
        onClick={() => setView('loans')}
        aria-label="Loan Applications"
      >
        <div className="mobile-nav-icon-wrap">
          <FileText size={20} />
          {pendingApplicationsCount > 0 && (
            <span className="mobile-nav-badge" title={`${pendingApplicationsCount} pending loans`}>
              {pendingApplicationsCount > 99 ? '99+' : pendingApplicationsCount}
            </span>
          )}
        </div>
        <span className="mobile-nav-label">Loans</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-tab ${isLedgerActive ? 'is-active' : ''}`}
        onClick={() => {
          if (!isLedgerActive) setView('repayments')
        }}
        aria-label="Ledgers"
      >
        <div className="mobile-nav-icon-wrap">
          <WalletCards size={20} />
        </div>
        <span className="mobile-nav-label">Ledgers</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-tab ${isMoreActive ? 'is-active' : ''}`}
        onClick={onOpenMore}
        aria-label="More administration options"
      >
        <div className="mobile-nav-icon-wrap">
          <SlidersHorizontal size={20} />
        </div>
        <span className="mobile-nav-label">More</span>
      </button>
    </nav>
  )
}

