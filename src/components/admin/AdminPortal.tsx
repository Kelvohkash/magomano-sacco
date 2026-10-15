import type { Dispatch, FormEvent, FormEventHandler, SetStateAction } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { AdminTopbar } from './AdminTopbar'
import { AdminSidebar } from './AdminSidebar'
import { AdminDashboardView } from './views/AdminDashboardView'
import { AdminMembersView } from './views/AdminMembersView'
import { AdminLoansView } from './views/AdminLoansView'
import { AdminRepaymentsView } from './views/AdminRepaymentsView'
import { AdminSavingsView } from './views/AdminSavingsView'
import { AdminChargesView } from './views/AdminChargesView'
import { AdminTermsView } from './views/AdminTermsView'
import { AdminBulkImportView } from './views/AdminBulkImportView'
import { MemberProfileDrawer } from './modals/MemberProfileDrawer'
import { MemberEditModal } from './modals/MemberEditModal'
import { LoanDocumentModal } from './loan-document/LoanDocumentModal'
import { useAdminPortalState } from '../../hooks/useAdminPortalState'
import type {
  AdminLoanApplication,
  AdminMember,
  AdminOpenLoan,
  AdminSummary,
  AdminView,
  AdminMemberCreate,
  AdminLoanCreate,
  MemberProfileUpdate,
  AdminPopupMessage,
  AdminPopupMessageCreate,
} from '../../types'

export interface AdminPortalProps {
  signedInAdmin: string
  view: AdminView
  setView: Dispatch<SetStateAction<AdminView>>
  summary: AdminSummary | null
  statementRefreshKey: number
  members: AdminMember[]
  applications: AdminLoanApplication[]
  openLoans: AdminOpenLoan[]
  onCreateMember: (input: AdminMemberCreate) => Promise<boolean>
  onIssueLoan: (input: AdminLoanCreate) => Promise<boolean>
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
  onDisburseLoan: (applicationId: number, bankName: string, accountNumber: string) => void
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
  maintenanceEnabled: boolean
  maintenanceMessage: string
  setMaintenanceMessage: Dispatch<SetStateAction<string>>
  onUpdateMaintenance: (enabled: boolean, message: string) => Promise<boolean>
  popupMessages: AdminPopupMessage[]
  onCreatePopupMessage: (input: AdminPopupMessageCreate) => Promise<boolean>
  onSetPopupMessageActive: (messageId: number, active: boolean) => Promise<boolean>
  onDeletePopupMessage: (messageId: number) => Promise<boolean>
  onRefresh: () => Promise<void>
}

export function AdminPortal({
  signedInAdmin, view, setView, summary, statementRefreshKey,
  members, applications, openLoans, onCreateMember, onIssueLoan,
  message, messageSuccess, reviewingId,
  onLogout,
  onReviewMember, onSetMemberRole, onResetMemberPassword, onDeleteMember,
  onReviewLoan, onDisburseLoan, onUpdateLoanApplication, onDeleteLoanApplication, onUpdateMember,
  terms, setTerms, termsUpdatedAt, onSaveTerms, onRefresh,
  maintenanceEnabled, maintenanceMessage, setMaintenanceMessage, onUpdateMaintenance,
  popupMessages, onCreatePopupMessage, onSetPopupMessageActive, onDeletePopupMessage,
  memberId, setMemberId, amount, setAmount, description, setDescription, onSavingsEntry,
  repaymentLoanId, setRepaymentLoanId, repaymentAmount, setRepaymentAmount,
  repaymentDescription, setRepaymentDescription, onLoanRepayment, submitting,
}: AdminPortalProps) {
  const ui = useAdminPortalState(
    members, applications,
    onUpdateLoanApplication, onUpdateMember, onDeleteMember, onDeleteLoanApplication,
    onRefresh,
  )

  async function saveTerms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    ui.setTermsSaving(true)
    ui.setTermsMessage('')
    if (await onSaveTerms(terms)) ui.setTermsMessage('Terms and conditions published successfully.')
    ui.setTermsSaving(false)
  }

  return (
    <div className="admin-root-layout">
      <AdminTopbar
        signedInAdmin={signedInAdmin}
        isRefreshing={ui.isRefreshing}
        onRefresh={() => void ui.handleRefreshClick()}
        onLogout={onLogout}
      />

      <div className="admin-main-container">
        <AdminSidebar
          currentView={view}
          setView={setView}
          pendingMembersCount={ui.pendingMembers.length}
          pendingApplicationsCount={ui.pendingApplications.length}
        />

        <main className="admin-viewport">
          {message && (
            <div className={`admin-banner-alert ${messageSuccess ? 'alert-success' : 'alert-error'}`} role="status">
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
              onCreateMember={onCreateMember}
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
              onRefresh={onRefresh}
            />
          )}

          {view === 'loans' && (
            <AdminLoansView
              members={members}
              onIssueLoan={onIssueLoan}
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
              onDisburseLoan={onDisburseLoan}
              removeApplication={ui.removeApplication}
              reviewingId={reviewingId}
            />
          )}

          {view === 'repayments' && (
            <AdminRepaymentsView
              statementRefreshKey={statementRefreshKey}
              onRecordsChanged={onRefresh}
              openLoans={openLoans}
              repaymentLoanId={repaymentLoanId}
              setRepaymentLoanId={setRepaymentLoanId}
              repaymentAmount={repaymentAmount}
              setRepaymentAmount={setRepaymentAmount}
              repaymentDescription={repaymentDescription}
              setRepaymentDescription={setRepaymentDescription}
              onLoanRepayment={onLoanRepayment}
              submitting={submitting}
            />
          )}

          {view === 'savings' && (
            <AdminSavingsView
              statementRefreshKey={statementRefreshKey}
              onRecordsChanged={onRefresh}
              members={members}
              memberId={memberId}
              setMemberId={setMemberId}
              amount={amount}
              setAmount={setAmount}
              description={description}
              setDescription={setDescription}
              onSavingsEntry={onSavingsEntry}
              submitting={submitting}
            />
          )}

          {view === 'charges' && <AdminChargesView members={members} onRefresh={onRefresh} />}

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
              maintenanceEnabled={maintenanceEnabled}
              maintenanceMessage={maintenanceMessage}
              setMaintenanceMessage={setMaintenanceMessage}
              onUpdateMaintenance={onUpdateMaintenance}
              maintenanceSaving={reviewingId === 'maintenance-mode'}
              members={members}
              popupMessages={popupMessages}
              onCreatePopupMessage={onCreatePopupMessage}
              onSetPopupMessageActive={onSetPopupMessageActive}
              onDeletePopupMessage={onDeletePopupMessage}
              reviewingId={reviewingId}
            />
          )}
        </main>
      </div>

      {ui.viewingMember && (
        <MemberProfileDrawer
          member={ui.viewingMember}
          onClose={() => ui.setViewingMemberId(null)}
          onReviewMember={onReviewMember}
          onSetMemberRole={onSetMemberRole}
          onResetMemberPassword={onResetMemberPassword}
          onEditMember={(m) => { ui.beginMemberEdit(m); ui.setViewingMemberId(null) }}
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
          onClose={() => { ui.setViewingApplicationId(null); ui.setEditingApplicationId(null) }}
          onApprove={() => onReviewLoan(ui.viewingApplication!.id, 'approve')}
          onReject={() => onReviewLoan(ui.viewingApplication!.id, 'reject')}
          isActionLoading={reviewingId === `loan-${ui.viewingApplication.id}`}
        />
      )}
    </div>
  )
}
