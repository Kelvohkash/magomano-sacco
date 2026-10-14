import { Landmark, Menu, RefreshCcw } from 'lucide-react'

interface MobileAdminTopbarProps {
  signedInAdmin: string
  isRefreshing: boolean
  pendingCount?: number
  onRefresh: () => void
  onToggleMenu: () => void
}

export function MobileAdminTopbar({
  signedInAdmin,
  isRefreshing,
  pendingCount = 0,
  onRefresh,
  onToggleMenu,
}: MobileAdminTopbarProps) {
  // Extract initial for avatar
  const initial = signedInAdmin.trim().charAt(0).toUpperCase() || 'A'

  return (
    <header className="mobile-admin-topbar">
      <div className="mobile-admin-topbar-left">
        <button
          type="button"
          className="mobile-admin-icon-btn menu-btn"
          onClick={onToggleMenu}
          aria-label="Open administration menu"
        >
          <Menu size={22} />
          {pendingCount > 0 && <span className="mobile-admin-btn-badge" />}
        </button>

        <a className="mobile-admin-brand" href="/" aria-label="Magomano County Sacco core administration">
          <div className="mobile-admin-brand-crest">
            <Landmark size={18} strokeWidth={2.4} />
          </div>
          <div className="mobile-admin-brand-meta">
            <span className="mobile-brand-title">MAGOMANO</span>
            <span className="mobile-brand-tag">ADMIN</span>
          </div>
        </a>
      </div>

      <div className="mobile-admin-topbar-right">
        <button
          type="button"
          className={`mobile-admin-icon-btn refresh-btn ${isRefreshing ? 'is-spinning' : ''}`}
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh SACCO data"
          title="Refresh SACCO records"
        >
          <RefreshCcw size={18} className={isRefreshing ? 'spin-icon' : ''} />
        </button>

        <button
          type="button"
          className="mobile-admin-avatar-btn"
          onClick={onToggleMenu}
          aria-label={`Admin account: ${signedInAdmin}`}
          title={`Signed in as ${signedInAdmin}`}
        >
          <span className="mobile-admin-avatar-initial">{initial}</span>
          <span className="mobile-admin-avatar-online" />
        </button>
      </div>
    </header>
  )
}