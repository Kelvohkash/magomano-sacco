import { AdminSidebar } from './AdminSidebar';
import type { Dispatch, SetStateAction } from 'react';
import type { AdminView } from '../../types';

interface MobileAdminSidebarProps {
  currentView: AdminView;
  setView: Dispatch<SetStateAction<AdminView>>;
  pendingMembersCount: number;
  pendingApplicationsCount: number;
  onClose: () => void;
  sidebarOpen: boolean;
}

export function MobileAdminSidebar({
  currentView,
  setView,
  pendingMembersCount,
  pendingApplicationsCount,
  onClose,
  sidebarOpen,
}: MobileAdminSidebarProps) {
  return (
    <div className={`mobile-admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h3>Magomano Admin</h3>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          ×
        </button>
      </div>
      <AdminSidebar
        currentView={currentView}
        setView={setView}
        pendingMembersCount={pendingMembersCount}
        pendingApplicationsCount={pendingApplicationsCount}
      />
    </div>
  );
}