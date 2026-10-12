import type { Dispatch, SetStateAction } from 'react'
import type { AdminView } from '../../types'
import { MobileAdminDrawer } from './MobileAdminDrawer'

export interface MobileAdminSidebarProps {
  currentView: AdminView
  setView: Dispatch<SetStateAction<AdminView>>
  pendingMembersCount: number
  pendingApplicationsCount: number
  onClose: () => void
  sidebarOpen: boolean
  signedInAdmin?: string
  isRefreshing?: boolean
  onRefresh?: () => void
  onLogout?: () => void
}

export function MobileAdminSidebar({
  currentView,
  setView,
  pendingMembersCount,
  pendingApplicationsCount,
  onClose,
  sidebarOpen,
  signedInAdmin = 'Administrator',
  isRefreshing = false,
  onRefresh = () => {},
  onLogout = () => {},
}: MobileAdminSidebarProps) {
  return (
    <MobileAdminDrawer
      currentView={currentView}
      setView={setView}
      pendingMembersCount={pendingMembersCount}
      pendingApplicationsCount={pendingApplicationsCount}
      signedInAdmin={signedInAdmin}
      isRefreshing={isRefreshing}
      isOpen={sidebarOpen}
      onClose={onClose}
      onRefresh={onRefresh}
      onLogout={onLogout}
    />
  )
}