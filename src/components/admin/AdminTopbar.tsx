import { Landmark, LogOut, RefreshCcw, User } from 'lucide-react'

interface AdminTopbarProps {
  signedInAdmin: string
  isRefreshing: boolean
  onRefresh: () => void
  onLogout: () => void
}

export function AdminTopbar({
  signedInAdmin,
  isRefreshing,
  onRefresh,
  onLogout,
}: AdminTopbarProps) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <a className="admin-topbar-brand" href="/" aria-label="Magomano County Sacco administration">
          <div className="admin-brand-icon">
            <Landmark size={20} strokeWidth={2.2} />
          </div>
          <div className="admin-brand-titles">
            <span className="brand-title-main">MAGOMANO COUNTY SACCO</span>
            <span className="brand-title-badge">ADMINISTRATION PORTAL</span>
          </div>
        </a>
        <div className="admin-system-status">
          <span className="status-indicator-dot" />
          <span>Server Active</span>
        </div>
      </div>

      <div className="admin-topbar-right">
        <button
          type="button"
          className="admin-header-refresh-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh SACCO data"
        >
          <RefreshCcw size={15} className={isRefreshing ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>

        <div className="admin-user-pill">
          <div className="admin-user-avatar">
            <User size={15} />
          </div>
          <div className="admin-user-details">
            <strong className="admin-user-name">{signedInAdmin}</strong>
            <small className="admin-user-role">System Administrator</small>
          </div>
        </div>

        <button
          type="button"
          className="admin-header-logout-btn"
          onClick={onLogout}
          title="Sign out of administration"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  )
}

