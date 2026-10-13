import type { Dispatch, FormEvent, FormEventHandler, SetStateAction } from 'react'
import { useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCcw, WalletCards } from 'lucide-react'
import { MobileAdminTopbar } from './MobileAdminTopbar'
import { MobileAdminBottomNav } from './MobileAdminBottomNav'
import { MobileAdminDrawer } from './MobileAdminDrawer'
import { AdminDashboardView } from './views/AdminDashboardView'
import { AdminMembersView } from './views/AdminMembersView'
import { AdminLoansView } from './views/AdminLoansView'
import { AdminRepaymentsView } from './views/AdminRepaymentsView'
import { AdminSavingsView } from './views/AdminSavingsView'
import { AdminTermsView } from './views/AdminTermsView'
import { AdminBulkImportView } from './views/AdminBulkImportView'
import { MemberProfileDrawer } from './modals/MemberProfileDrawer'
import { MemberEditModal } from './modals/MemberEditModal'
import { LoanDocumentModal } from './loan-document/LoanDocumentModal'
import { useAdminPortalState } from '../../hooks/useAdminPortalState'
import { useMobileBackHandler } from '../../hooks/useMobileBackHandler'
import type {
  AdminLoanApplication,
  AdminMember,
  AdminOpenLoan,
  AdminSummary,
  AdminView,
  MemberProfileUpdate,
} from '../../types'

export interface MobileAdminPortalProps {
  signedInAdmin: string
  view: AdminView
  setView: Dispatch<SetStateAction<AdminView>>
  summary: AdminSummary | null
  statementRefreshKey: number
  members: AdminMember[]
  applications: AdminLoanApplication[]
  openLoans: AdminOpenLoan[]
  memberId: string
  setMemberId: Dispatch<SetStateAction<string>>
  amount: string
  setAmount: Dispatch<SetStateAction<string>>
  description: string
  setDescription: Dispatch<SetStateAction<string>>
  message: string
  messageSuccess: boolean
  submitting: boolean
  reviewingId: string | null
  repaymentLoanId: string
  setRepaymentLoanId: Dispatch<SetStateAction<string>>
  repaymentAmount: string
  setRepaymentAmount: Dispatch<SetStateAction<string>>
  repaymentDescription: string
  setRepaymentDescription: Dispatch<SetStateAction<string>>
  onLogout: () => void
  onSavingsEntry: FormEventHandler<HTMLFormElement>
  onLoanRepayment: FormEventHandler<HTMLFormElement>
  onReviewMember: (memberId: number, decision: 'approve' | 'reject') => void
  onSetMemberRole: (memberId: number, role: AdminMember['memberRole']) => void
  onResetMemberPassword: (memberId: number) => void
  onDeleteMember: (memberId: number) => Promise<boolean>
  onReviewLoan: (applicationId: number, decision: 'approve' | 'reject') => void
  onUpdateLoanApplication: (
    applicationId: number,
    details: Pick<AdminLoanApplication, 'requestedAmount' | 'repaymentMonths' | 'purpose'>,
  ) => Promise<boolean>
  onDeleteLoanApplication: (applicationId: number) => Promise<boolean>
  onUpdateMember: (memberId: number, updates: MemberProfileUpdate) => Promise<boolean>
  terms: string
  setTerms: Dispatch<SetStateAction<string>>
  termsUpdatedAt?: string | null
  onSaveTerms: (terms: string) => Promise<boolean>
  onRefresh: () => Promise<void>
}

export function MobileAdminPortal({
  signedInAdmin,
  view,
  setView,
  summary,
  statementRefreshKey,
  members,
  applications,
  message,
  messageSuccess,
  reviewingId,
  onLogout,
  onReviewMember,
  onSetMemberRole,
  onResetMemberPassword,
  onDeleteMember,
  onReviewLoan,
  onUpdateLoanApplication,
  onDeleteLoanApplication,
  onUpdateMember,
  terms,
  setTerms,
  termsUpdatedAt,
  onSaveTerms,
  onRefresh,
}: MobileAdminPortalProps) {
  const ui = useAdminPortalState(
    members,
    applications,
    onUpdateLoanApplication,
    onUpdateMember,
    onDeleteMember,
    onDeleteLoanApplication,
    onRefresh,
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function saveTerms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    ui.setTermsSaving(true)
    ui.setTermsMessage('')
    if (await onSaveTerms(terms)) {
      ui.setTermsMessage('Terms and conditions published successfully.')
    }
    ui.setTermsSaving(false)
  }

  // Back Button Navigation & Double-Back to Exit
  let activeModalClose: (() => void) | null = null
  if (ui.viewingApplicationId !== null) {
    activeModalClose = () => {
      ui.setViewingApplicationId(null)
      ui.setEditingApplicationId(null)
    }
  } else if (ui.viewingMemberId !== null) {
    activeModalClose = () => ui.setViewingMemberId(null)
  } else if (ui.editingMemberId !== null) {
    activeModalClose = () => ui.setEditingMemberId(null)
  } else if (drawerOpen) {
    activeModalClose = () => setDrawerOpen(false)
  }

  const isRoot = view === 'overview' && activeModalClose === null

  const { showExitToast } = useMobileBackHandler({
    activeModalClose,
    currentView: view,
    onGoToRoot: () => setView('overview'),
    isRoot,
  })

  const totalPending = ui.pendingMembers.length + ui.pendingApplications.length

  return (
    <div className="mobile-admin-root-layout">
      {showExitToast && (
        <div className="mobile-exit-toast" role="status" aria-live="polite">
          Swipe back again to exit
        </div>
      )}

      {/* Top Header */}
      <MobileAdminTopbar
        signedInAdmin={signedInAdmin}
        isRefreshing={ui.isRefreshing}
        pendingCount={totalPending}
        onRefresh={() => void ui.handleRefreshClick()}
        onToggleMenu={() => setDrawerOpen(true)}
      />

      {/* Segmented ledger switcher when looking at financial ledgers */}
      {(view === 'repayments' || view === 'savings') && (
        <div className="mobile-admin-ledger-bar">
          <div className="mobile-ledger-segmented-control" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'repayments'}
              className={`mobile-ledger-tab-btn ${view === 'repayments' ? 'is-active' : ''}`}
              onClick={() => setView('repayments')}
            >
              <RefreshCcw size={14} />
              <span>Loan Repayments</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'savings'}
              className={`mobile-ledger-tab-btn ${view === 'savings' ? 'is-active' : ''}`}
              onClick={() => setView('savings')}
            >
              <WalletCards size={14} />
              <span>Savings Deposits</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Scrollable Viewport */}
      <main className="mobile-admin-viewport">
        {message && (
          <div
            className={`admin-banner-alert ${messageSuccess ? 'alert-success' : 'alert-error'}`}
            role="status"
          >
            {messageSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="banner-alert-text">{message}</span>
          </div>
        )}

        {view === 'overview' && (
          <AdminDashboardView
            summary={summary}
            approvedMembersCount={ui.approvedMembers.length}
            pendingMembers={ui.pendingMembers}
            pendingApplications={ui.pendingApplications}
            setView={setView}
            setMemberFilter={ui.setMemberFilter}
            setLoanFilter={ui.setLoanFilter}
          />
        )}

        {view === 'members' && (
          <AdminMembersView
            members={members}
            filteredMembers={ui.filteredMembers}
            memberSearch={ui.memberSearch}
            setMemberSearch={ui.setMemberSearch}
            memberFilter={ui.memberFilter}
            setMemberFilter={ui.setMemberFilter}
            pendingMembersCount={ui.pendingMembers.length}
            approvedMembersCount={ui.approvedMembers.length}
            signatoriesCount={ui.signatories.length}
            viewingMemberId={ui.viewingMemberId}
            setViewingMemberId={ui.setViewingMemberId}
            beginMemberEdit={ui.beginMemberEdit}
            onReviewMember={onReviewMember}
            removeMember={ui.removeMember}
            reviewingId={reviewingId}
          />
        )}

        {view === 'loans' && (
          <AdminLoansView
            applications={applications}
            filteredApplications={ui.filteredApplications}
            pendingApplicationsCount={ui.pendingApplications.length}
            loanSearch={ui.loanSearch}
            setLoanSearch={ui.setLoanSearch}
            loanFilter={ui.loanFilter}
            setLoanFilter={ui.setLoanFilter}
            setViewingApplicationId={ui.setViewingApplicationId}
            setEditingApplicationId={ui.setEditingApplicationId}
            beginApplicationEdit={ui.beginApplicationEdit}
            onReviewLoan={onReviewLoan}
            removeApplication={ui.removeApplication}
            reviewingId={reviewingId}
          />
        )}

        {view === 'repayments' && (
          <AdminRepaymentsView
            statementRefreshKey={statementRefreshKey}
            onRecordsChanged={onRefresh}
          />
        )}

        {view === 'savings' && (
          <AdminSavingsView
            statementRefreshKey={statementRefreshKey}
            onRecordsChanged={onRefresh}
          />
        )}

        {view === 'bulk' && <AdminBulkImportView onImported={onRefresh} />}

        {view === 'terms' && (
          <AdminTermsView
            terms={terms}
            setTerms={setTerms}
            termsUpdatedAt={termsUpdatedAt}
            termsSaving={ui.termsSaving}
            termsMessage={ui.termsMessage}
            setTermsMessage={ui.setTermsMessage}
            onSaveTerms={saveTerms}
          />
        )}
      </main>

      {/* Bottom Navigation Dock */}
      <MobileAdminBottomNav
        currentView={view}
        setView={setView}
        pendingMembersCount={ui.pendingMembers.length}
        pendingApplicationsCount={ui.pendingApplications.length}
        onOpenMore={() => setDrawerOpen(true)}
      />

      {/* Slide-over Drawer Menu */}
      <MobileAdminDrawer
        currentView={view}
        setView={setView}
        pendingMembersCount={ui.pendingMembers.length}
        pendingApplicationsCount={ui.pendingApplications.length}
        signedInAdmin={signedInAdmin}
        isRefreshing={ui.isRefreshing}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={() => void ui.handleRefreshClick()}
        onLogout={onLogout}
      />

      {/* Modals & Profile Sheets */}
      {ui.viewingMember && (
        <MemberProfileDrawer
          member={ui.viewingMember}
          onClose={() => ui.setViewingMemberId(null)}
          onReviewMember={onReviewMember}
          onSetMemberRole={onSetMemberRole}
          onResetMemberPassword={onResetMemberPassword}
          onEditMember={(m) => {
            ui.beginMemberEdit(m)
            ui.setViewingMemberId(null)
          }}
          onDeleteMember={ui.removeMember}
          reviewingId={reviewingId}
        />
      )}

      {ui.editingMember && (
        <MemberEditModal
          member={ui.editingMember}
          memberForm={ui.memberForm}
          setMemberForm={ui.setMemberForm}
          onSave={ui.saveMemberDetails}
          onClose={() => ui.setEditingMemberId(null)}
          saving={ui.memberSaving}
          isReviewing={reviewingId === `member-details-${ui.editingMember.id}`}
        />
      )}

      {ui.viewingApplication && (
        <LoanDocumentModal
          application={ui.viewingApplication}
          member={ui.viewingApplicationMember}
          signatories={ui.signatories}
          isEditing={ui.editingApplicationId === ui.viewingApplication.id}
          setIsEditing={(editing) => {
            if (editing) ui.beginApplicationEdit(ui.viewingApplication!)
            else ui.setEditingApplicationId(null)
          }}
          applicationForm={ui.applicationForm}
          setApplicationForm={ui.setApplicationForm}
          onSaveApplication={ui.saveApplication}
          saving={reviewingId === `edit-loan-${ui.viewingApplication.id}`}
          onClose={() => {
            ui.setViewingApplicationId(null)
            ui.setEditingApplicationId(null)
          }}
          onApprove={() => onReviewLoan(ui.viewingApplication!.id, 'approve')}
          onReject={() => onReviewLoan(ui.viewingApplication!.id, 'reject')}
          isActionLoading={reviewingId === `loan-${ui.viewingApplication.id}`}
        />
      )}
    </div>
  )
}
