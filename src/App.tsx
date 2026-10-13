import { useCallback, useEffect, useState } from 'react'
import { AdminPortal } from './components/admin/AdminPortal'
import { MobileAdminPortal } from './components/admin/MobileAdminPortal'
import { AuthScreen } from './components/auth/AuthScreen'
import { MemberPortal } from './components/member/MemberPortal'
import { useAdminOperations } from './hooks/useAdminOperations'
import { useAuthSession } from './hooks/useAuthSession'
import { useMemberOperations } from './hooks/useMemberOperations'
import { useAppearance } from './hooks/useAppearance'
import './App.css'
import './Portal.css'
import './Admin.css'

function App() {
  const member = useMemberOperations()
  const admin = useAdminOperations()
  const appearance = useAppearance(member.dashboard?.member.national_id)
  const { refreshDashboard, resetMemberState } = member
  const { setSignedInAdmin, refreshAdminData, resetAdminState } = admin

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const onMemberAuthenticated = useCallback(async () => {
    await refreshDashboard()
  }, [refreshDashboard])

  const onAdminAuthenticated = useCallback(
    async (adminName: string) => {
      setSignedInAdmin(adminName)
      await refreshAdminData()
    },
    [setSignedInAdmin, refreshAdminData],
  )

  const onLogoutCompleted = useCallback(() => {
    resetMemberState()
    resetAdminState()
  }, [resetMemberState, resetAdminState])

  const auth = useAuthSession({
    onMemberAuthenticated,
    onAdminAuthenticated,
    onLogoutCompleted,
  })

  if (member.dashboard) {
    return (
      <MemberPortal
        dashboard={member.dashboard}
        view={member.memberView}
        setView={member.setMemberView}
        menuOpen={member.menuOpen}
        setMenuOpen={member.setMenuOpen}
        loanAmount={member.loanAmount}
        setLoanAmount={member.setLoanAmount}
        repaymentMonths={member.repaymentMonths}
        setRepaymentMonths={member.setRepaymentMonths}
        loanPurpose={member.loanPurpose}
        setLoanPurpose={member.setLoanPurpose}
        loanMessage={member.loanMessage}
        loanMessageSuccess={member.loanMessageSuccess}
        loanSubmitting={member.loanSubmitting}
        onLoanApplication={member.handleLoanApplication}
        onLogout={auth.handleLogout}
        forceLightAppearance={appearance.forceLight}
        onToggleLightAppearance={appearance.toggleForceLight}
      />
    )
  }

  if (admin.signedInAdmin) {
    return isMobile ? (
      <MobileAdminPortal
        signedInAdmin={admin.signedInAdmin}
        view={admin.adminView}
        setView={admin.setAdminView}
        summary={admin.adminSummary}
        statementRefreshKey={admin.adminStatementRefreshKey}
        members={admin.adminMembers}
        applications={admin.adminApplications}
        openLoans={admin.adminOpenLoans}
        memberId={admin.adminMemberId}
        setMemberId={admin.setAdminMemberId}
        amount={admin.adminAmount}
        setAmount={admin.setAdminAmount}
        description={admin.adminDescription}
        setDescription={admin.setAdminDescription}
        message={admin.adminMessage}
        messageSuccess={admin.adminMessageSuccess}
        submitting={admin.adminSubmitting}
        reviewingId={admin.adminReviewingId}
        repaymentLoanId={admin.repaymentLoanId}
        setRepaymentLoanId={admin.setRepaymentLoanId}
        repaymentAmount={admin.repaymentAmount}
        setRepaymentAmount={admin.setRepaymentAmount}
        repaymentDescription={admin.repaymentDescription}
        setRepaymentDescription={admin.setRepaymentDescription}
        onLogout={auth.handleLogout}
        onSavingsEntry={admin.handleAdminSavingsEntry}
        onLoanRepayment={admin.handleLoanRepayment}
        onReviewMember={admin.reviewMemberAccount}
        onSetMemberRole={admin.setMemberRole}
        onResetMemberPassword={admin.resetMemberPassword}
        onDeleteMember={admin.deleteMember}
        onReviewLoan={admin.reviewLoanApplication}
        onUpdateLoanApplication={admin.updateLoanApplication}
        onDeleteLoanApplication={admin.deleteLoanApplication}
        onUpdateMember={admin.updateMemberDetails}
        terms={admin.adminTerms}
        setTerms={admin.setAdminTerms}
        termsUpdatedAt={admin.adminTermsUpdatedAt}
        onSaveTerms={admin.saveTerms}
        onRefresh={admin.refreshAdminData}
      />
    ) : (
      <AdminPortal
        signedInAdmin={admin.signedInAdmin}
        view={admin.adminView}
        setView={admin.setAdminView}
        summary={admin.adminSummary}
        statementRefreshKey={admin.adminStatementRefreshKey}
        members={admin.adminMembers}
        applications={admin.adminApplications}
        openLoans={admin.adminOpenLoans}
        memberId={admin.adminMemberId}
        setMemberId={admin.setAdminMemberId}
        amount={admin.adminAmount}
        setAmount={admin.setAdminAmount}
        description={admin.adminDescription}
        setDescription={admin.setAdminDescription}
        message={admin.adminMessage}
        messageSuccess={admin.adminMessageSuccess}
        submitting={admin.adminSubmitting}
        reviewingId={admin.adminReviewingId}
        repaymentLoanId={admin.repaymentLoanId}
        setRepaymentLoanId={admin.setRepaymentLoanId}
        repaymentAmount={admin.repaymentAmount}
        setRepaymentAmount={admin.setRepaymentAmount}
        repaymentDescription={admin.repaymentDescription}
        setRepaymentDescription={admin.setRepaymentDescription}
        onLogout={auth.handleLogout}
        onSavingsEntry={admin.handleAdminSavingsEntry}
        onLoanRepayment={admin.handleLoanRepayment}
        onReviewMember={admin.reviewMemberAccount}
        onSetMemberRole={admin.setMemberRole}
        onResetMemberPassword={admin.resetMemberPassword}
        onDeleteMember={admin.deleteMember}
        onReviewLoan={admin.reviewLoanApplication}
        onUpdateLoanApplication={admin.updateLoanApplication}
        onDeleteLoanApplication={admin.deleteLoanApplication}
        onUpdateMember={admin.updateMemberDetails}
        terms={admin.adminTerms}
        setTerms={admin.setAdminTerms}
        termsUpdatedAt={admin.adminTermsUpdatedAt}
        onSaveTerms={admin.saveTerms}
        onRefresh={admin.refreshAdminData}
      />
    )
  }

  return (
    <AuthScreen
      key={auth.mode}
      mode={auth.mode}
      nationalId={auth.nationalId}
      setNationalId={auth.setNationalId}
      adminUsername={auth.adminUsername}
      setAdminUsername={auth.setAdminUsername}
      registration={auth.registrationForm}
      setRegistration={auth.setRegistrationForm}
      terms={auth.registrationTerms}
      termsVersion={auth.registrationTermsVersion}
      termsLoading={auth.registrationTermsLoading}
      termsError={auth.registrationTermsError}
      password={auth.password}
      setPassword={auth.setPassword}
      confirmPassword={auth.confirmPassword}
      setConfirmPassword={auth.setConfirmPassword}
      showPassword={auth.showPassword}
      setShowPassword={auth.setShowPassword}
      isSubmitting={auth.isSubmitting}
      message={auth.message}
      isSuccess={auth.isSuccess}
      onSubmit={auth.handleSubmit}
      onChangeMode={auth.changeMode}
    />
  )
}

export default App
