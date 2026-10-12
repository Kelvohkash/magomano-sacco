import { Hamburger } from 'lucide-react';

interface MobileAdminTopbarProps {
  signedInAdmin: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onToggleMenu: () => void;
}

export function MobileAdminTopbar({
  signedInAdmin,
  isRefreshing,
  onRefresh,
  onLogout,
  onToggleMenu,
}: MobileAdminTopbarProps) {
  return (
    <header className="mobile-admin-topbar">
      <div className="mobile-admin-topbar-left">
        <button className="mobile-admin-menu-btn" onClick={onToggleMenu} aria-label="Open menu">
          <Hamburger size={24} />
        </button>
        <a className="mobile-admin-topbar-brand" href="/" aria-label="Magomano SACCO core administration">
          <div className="mobile-admin-brand-icon">
            {/* Use same landmark icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9L12 3L21 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="mobile-admin-brand-titles">
            <span className="mobile-brand-title-main">MAGOMANO SACCO</span>
            <span className="mobile-brand-title-badge">ADMINISTRATION CONSOLE</span>
          </div>
        </a>
      </div>
      <div className="mobile-admin-topbar-right">
        <button
          type="button"
          className="mobile-admin-header-refresh-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh SACCO data"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V9L15 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M4 12H9V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M20 12H15V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 20V15L9 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2 12C2 6.48 6.48 2 12 2S22 6.48 22 12C22 17.52 17.52 22 12 22S2 17.52 2 12Z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span>Refresh</span>
        </button>

        <div className="mobile-admin-user-pill">
          <div className="mobile-admin-user-avatar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 9V7C9 5.34 10.34 4 12 4S15 5.34 15 7V9H9Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="mobile-admin-user-details">
            <strong className="mobile-admin-user-name">{signedInAdmin}</strong>
            <small className="mobile-admin-user-role">System Administrator</small>
          </div>
        </div>

        <button
          type="button"
          className="mobile-admin-header-logout-btn"
          onClick={onLogout}
          title="Sign out of administration"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 17V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M16 13L20 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 9L8 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}