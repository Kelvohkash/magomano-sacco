import type { Dispatch, SetStateAction } from 'react'
import {
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react'
import type { AdminView } from '../../types'
import { usePwaInstall } from '../../hooks/usePwaInstall'

interface MobileAdminDrawerProps {
  currentView: AdminView
  setView: Dispatch<SetStateAction<AdminView>>
  pendingMembersCount: number
  pendingApplicationsCount: number
  signedInAdmin: string
  isRefreshing: boolean
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
  onLogout: () => void
}

interface NavItem {
  section: AdminView
  label: string
  subtitle: string
  Icon: typeof LayoutDashboard
  badge?: number
}

export function MobileAdminDrawer({
  currentView,
  setView,
  pendingMembersCount,
  pendingApplicationsCount,
  signedInAdmin,
  isRefreshing,
  isOpen,
  onClose,
  onRefresh,
  onLogout,
}: MobileAdminDrawerProps) {
  const { canInstall, triggerInstall } = usePwaInstall()
  if (!isOpen) return null

  const navItems: NavItem[] = [
    {
      section: 'overview',
      label: 'Financial Dashboard',
      subtitle: 'Overview, totals & priority queues',
      Icon: LayoutDashboard,
    },
    {
      section: 'members',
      label: 'Members Directory',
      subtitle: 'Accounts, approvals & governance',
      Icon: UsersRound,
      badge: pendingMembersCount,
    },
    {
      section: 'loans',
      label: 'Loan Applications',
      subtitle: 'Credit requests & official agreements',
      Icon: FileText,
      badge: pendingApplicationsCount,
    },
    {
      section: 'repayments',
      label: 'Loan Repayments Ledger',
      subtitle: 'Recorded member loan payoffs',
      Icon: RefreshCcw,
    },
    {
      section: 'savings',
      label: 'Savings Deposits Ledger',
      subtitle: 'Monthly member savings history',
      Icon: WalletCards,
    },
    {
      section: 'charges',
      label: 'Admin Charges',
      subtitle: 'Issue and review member charges',
      Icon: HandCoins,
    },
    {
      section: 'bulk',
      label: 'Bulk CSV Statement Import',
      subtitle: 'Import batches of member records',
      Icon: FileSpreadsheet,
    },
    {
      section: 'terms',
      label: 'Terms & Conditions Editor',
      subtitle: 'Update member contract terms',
      Icon: ShieldCheck,
    },
  ]

  const initial = signedInAdmin.trim().charAt(0).toUpperCase() || 'A'

  function handleSelect(view: AdminView) {
    setView(view)
    onClose()
  }

  return (
    <div className="mobile-admin-drawer-backdrop" onClick={onClose}>
      <aside
        className="mobile-admin-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        aria-label="Administration menu"
      >
        {/* Drawer Header */}
        <div className="drawer-panel-header">
          <div className="drawer-brand-identity">
            <div className="drawer-crest">
              <Landmark size={20} />
            </div>
            <div>
              <h2 className="drawer-title">MAGOMANO SACCO</h2>
              <span className="drawer-subtitle">ADMINISTRATION CONSOLE</span>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Admin Profile Card */}
        <div className="drawer-profile-card">
          <div className="drawer-avatar-wrap">
            <span className="drawer-avatar-initial">{initial}</span>
            <span className="drawer-avatar-dot" />
          </div>
          <div className="drawer-profile-info">
            <strong className="drawer-admin-name">{signedInAdmin}</strong>
            <span className="drawer-admin-role">System Administrator</span>
            <span className="drawer-session-badge">Verified Session</span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="drawer-nav-container">
          <div className="drawer-nav-section-label">MANAGEMENT &amp; LEDGERS</div>
          <nav className="drawer-nav-list">
            {navItems.map(({ section, label, subtitle, Icon, badge }) => {
              const isActive = currentView === section
              return (
                <button
                  key={section}
                  type="button"
                  className={`drawer-nav-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleSelect(section)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="drawer-nav-icon">
                    <Icon size={18} />
                  </div>
                  <div className="drawer-nav-text">
                    <span className="drawer-nav-label">{label}</span>
                    <span className="drawer-nav-sub">{subtitle}</span>
                  </div>
                  {typeof badge === 'number' && badge > 0 && (
                    <span className="drawer-nav-badge">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                  <ChevronRight size={16} className="drawer-nav-arrow" />
                </button>
              )
            })}
          </nav>
        </div>

        {/* Drawer Actions Footer */}
        <div className="drawer-footer-actions">
          {canInstall && (
            <button
              type="button"
              className="drawer-install-btn"
              onClick={() => void triggerInstall()}
            >
              <Download size={16} />
              <span>Install Magomano App</span>
            </button>
          )}

          <button
            type="button"
            className={`drawer-refresh-btn ${isRefreshing ? 'is-spinning' : ''}`}
            onClick={() => {
              onRefresh()
            }}
            disabled={isRefreshing}
          >
            <RefreshCcw size={16} className={isRefreshing ? 'spin-icon' : ''} />
            <span>{isRefreshing ? 'Refreshing records...' : 'Sync SACCO Records'}</span>
          </button>

          <button
            type="button"
            className="drawer-logout-btn"
            onClick={() => {
              onClose()
              onLogout()
            }}
          >
            <LogOut size={16} />
            <span>Sign out of Console</span>
          </button>

          <div className="drawer-legal-note">
            <span>Magomano County Sacco Core Banking Platform</span>
          </div>
        </div>
      </aside>
    </div>
  )
}
