import type { Dispatch, SetStateAction } from 'react'
import {
  Bell,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  HandCoins,
  LayoutDashboard,
  RefreshCcw,
  ShieldAlert,
  UsersRound,
  WalletCards,
} from 'lucide-react'
import { AnimatedFigure } from '../AnimatedFigure'
import type { AdminView } from '../../types'

interface AdminSidebarProps {
  currentView: AdminView
  setView: Dispatch<SetStateAction<AdminView>>
  pendingMembersCount: number
  pendingApplicationsCount: number
  pendingAuthorizationsCount?: number
}

interface NavItem {
  section: AdminView
  label: string
  Icon: typeof LayoutDashboard
  badge?: number
}

export function AdminSidebar({
  currentView,
  setView,
  pendingMembersCount,
  pendingApplicationsCount,
  pendingAuthorizationsCount = 0,
}: AdminSidebarProps) {
  const navigationItems: NavItem[] = [
    { section: 'overview', label: 'Dashboard', Icon: LayoutDashboard },
    { section: 'members', label: 'Members Directory', Icon: UsersRound, badge: pendingMembersCount },
    { section: 'authorizations', label: 'Profile Authorizations', Icon: ShieldAlert, badge: pendingAuthorizationsCount },
    { section: 'loans', label: 'Loan Applications', Icon: FileText, badge: pendingApplicationsCount },
    { section: 'repayments', label: 'Repayments', Icon: RefreshCcw },
    { section: 'savings', label: 'Savings Ledger', Icon: WalletCards },
    { section: 'charges', label: 'Admin Charges', Icon: HandCoins },
    { section: 'notifications', label: 'Push Notifications', Icon: Bell },
    { section: 'bulk', label: 'Bulk Statements', Icon: FileSpreadsheet },
    { section: 'terms', label: 'Terms & Conditions', Icon: FileText },
  ]

  return (
    <aside className="admin-navbar">
      <div className="admin-nav-group-label">OPERATIONS &amp; LEDGERS</div>
      <nav className="admin-nav-menu" aria-label="Admin modules">
        {navigationItems.map(({ section, label, Icon, badge }) => (
          <button
            key={section}
            type="button"
            aria-current={currentView === section ? 'page' : undefined}
            className={`admin-nav-link ${currentView === section ? 'active' : ''}`}
            onClick={() => setView(section)}
          >
            <div className="nav-icon-wrap">
              <Icon size={18} />
            </div>
            <span className="nav-label">{label}</span>
            {typeof badge === 'number' && badge > 0 && (
              <span className="nav-badge-pill" title={`${badge} pending review`}>
                <AnimatedFigure value={badge} format="number" />
              </span>
            )}
            {currentView === section && <ChevronRight size={14} className="active-arrow" />}
          </button>
        ))}
      </nav>

    </aside>
  )
}
