import type { Dispatch, SetStateAction } from 'react'
import { Clock3, FileText, HandCoins, Landmark, LogOut, Menu, Moon, RefreshCw, Sun, UserRound, Wallet, X } from 'lucide-react'
import type { MemberView } from '../../types'

interface MemberHeaderProps {
  firstName: string
  view: MemberView
  setView: Dispatch<SetStateAction<MemberView>>
  menuOpen: boolean
  setMenuOpen: Dispatch<SetStateAction<boolean>>
  onLogout: () => void
  forceLightAppearance: boolean
  onToggleLightAppearance: () => void
  isSyncing?: boolean
  syncError?: string
  onSync?: () => void
}

export function MemberHeader({
  firstName,
  view,
  setView,
  menuOpen,
  setMenuOpen,
  onLogout,
  forceLightAppearance,
  onToggleLightAppearance,
  isSyncing = false,
  syncError = '',
  onSync,
}: MemberHeaderProps) {
  const appearanceLabel = forceLightAppearance ? 'dark mode' : 'light mode'
  const AppearanceIcon = forceLightAppearance ? Moon : Sun
  const appearanceAction = `Switch to ${appearanceLabel}`

  return (
    <header className="dashboard-header">
      <a className="dashboard-brand brand" href="/" aria-label="Magomano County Sacco dashboard">
        <span className="brand-mark">
          <Landmark size={21} strokeWidth={1.8} />
        </span>
        <span className="brand-name">
          Magomano<span>County Sacco</span>
        </span>
      </a>

      <nav className="member-desktop-nav" aria-label="Member sections">
        <button
          type="button"
          aria-current={view === 'overview' ? 'page' : undefined}
          className={view === 'overview' ? 'active' : ''}
          onClick={() => setView('overview')}
        >
          <Wallet size={17} /> Overview
        </button>
        <button
          type="button"
          aria-current={view === 'apply-loan' ? 'page' : undefined}
          className={view === 'apply-loan' ? 'active' : ''}
          onClick={() => setView('apply-loan')}
        >
          <HandCoins size={17} /> Apply for a loan
        </button>
        <button
          type="button"
          aria-current={view === 'loan-status' ? 'page' : undefined}
          className={view === 'loan-status' ? 'active' : ''}
          onClick={() => setView('loan-status')}
        >
          <Clock3 size={17} /> Loan application status
        </button>
        <button
          type="button"
          aria-current={view === 'account-info' ? 'page' : undefined}
          className={view === 'account-info' ? 'active' : ''}
          onClick={() => setView('account-info')}
        >
          <UserRound size={17} /> Account info
        </button>
        <button
          type="button"
          aria-current={view === 'terms' ? 'page' : undefined}
          className={view === 'terms' ? 'active' : ''}
          onClick={() => setView('terms')}
        >
          <FileText size={17} /> Terms
        </button>
      </nav>

      <div className="member-greeting">
        <span className="member-avatar">{firstName.slice(0, 1).toUpperCase()}</span>
        <span>{firstName}</span>
        <button
          type="button"
          className="member-theme-toggle"
          aria-label={appearanceAction}
          aria-pressed={forceLightAppearance}
          title={appearanceAction}
          onClick={onToggleLightAppearance}
        >
          <AppearanceIcon size={17} /> <span>{appearanceLabel}</span>
        </button>
        <button type="button" className="admin-signout member-desktop-signout" onClick={onLogout}>
          <LogOut size={16} /> Sign out
        </button>
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {menuOpen && (
        <nav className="dashboard-menu" aria-label="Member menu">
          <button type="button" onClick={() => { setView('overview'); setMenuOpen(false) }}>
            <Wallet size={17} /> Overview
          </button>
          <button type="button" onClick={() => { setView('apply-loan'); setMenuOpen(false) }}>
            <HandCoins size={17} /> Apply loan
          </button>
          <button type="button" onClick={() => { setView('loan-status'); setMenuOpen(false) }}>
            <Clock3 size={17} /> Loan application status
          </button>
          <button type="button" onClick={() => { setView('account-info'); setMenuOpen(false) }}>
            <UserRound size={17} /> Account info
          </button>
          <button type="button" onClick={() => { setView('terms'); setMenuOpen(false) }}>
            <FileText size={17} /> Terms and conditions
          </button>
          <button
            type="button"
            className="member-menu-sync-btn"
            disabled={isSyncing}
            onClick={() => {
              if (onSync) onSync()
            }}
          >
            <RefreshCw size={17} className={isSyncing ? 'spin-icon' : ''} />
            <span>{isSyncing ? 'Syncing records…' : 'Sync SACCO records'}</span>
          </button>
          {syncError && (
            <div className="member-menu-sync-error" role="alert">
              {syncError}
            </div>
          )}
          <button
            type="button"
            className="member-theme-menu-item"
            aria-pressed={forceLightAppearance}
            onClick={onToggleLightAppearance}
          >
            <AppearanceIcon size={17} /> {appearanceLabel}
          </button>
          <button type="button" onClick={onLogout}>
            <LogOut size={17} /> Sign out
          </button>
        </nav>
      )}
    </header>
  )
}

