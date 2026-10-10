import { useEffect, useState, type FormEvent } from 'react'
import { AdminPortal } from './components/AdminPortal'
import { AuthScreen } from './components/AuthScreen'
import { MemberPortal } from './components/MemberPortal'
import { currency } from './format'
import './App.css'
import './Portal.css'
import type {
  AdminDividend,
  AdminLoanApplication,
  AdminMember,
  AdminOpenLoan,
  AdminSummary,
  AdminView,
  AuthMode,
  DashboardData,
  MemberProfileUpdate,
  MemberRegistrationForm,
  MemberView,
} from './types'

const emptyRegistrationForm: MemberRegistrationForm = {
  firstName: '',
  secondName: '',
  lastName: '',
  phoneNumber: '',
  email: '',
  county: '',
  subCounty: '',
  location: '',
  bankName: '',
  bankBranch: '',
  bankAccountName: '',
  bankAccountNumber: '',
  bankTwoName: '',
  bankTwoBranch: '',
  bankTwoAccountName: '',
  bankTwoAccountNumber: '',
  contactName: '',
  contactRelationship: '',
  contactPhoneNumber: '',
  secondContactName: '',
  secondContactRelationship: '',
  secondContactPhoneNumber: '',
  acceptedTerms: false,
}

function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [nationalId, setNationalId] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [registrationForm, setRegistrationForm] = useState<MemberRegistrationForm>({ ...emptyRegistrationForm })
  const [registrationTerms, setRegistrationTerms] = useState('')
  const [registrationTermsVersion, setRegistrationTermsVersion] = useState<string | null>(null)
  const [registrationTermsLoading, setRegistrationTermsLoading] = useState(false)
  const [registrationTermsError, setRegistrationTermsError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [memberView, setMemberView] = useState<MemberView>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loanAmount, setLoanAmount] = useState('')
  const [repaymentMonths, setRepaymentMonths] = useState('12')
  const [loanPurpose, setLoanPurpose] = useState('')
  const [loanMessage, setLoanMessage] = useState('')
  const [loanMessageSuccess, setLoanMessageSuccess] = useState(false)
  const [loanSubmitting, setLoanSubmitting] = useState(false)

  const [signedInAdmin, setSignedInAdmin] = useState<string | null>(null)
  const [adminView, setAdminView] = useState<AdminView>('overview')
  const [adminMembers, setAdminMembers] = useState<AdminMember[]>([])
  const [adminApplications, setAdminApplications] = useState<AdminLoanApplication[]>([])
  const [adminOpenLoans, setAdminOpenLoans] = useState<AdminOpenLoan[]>([])
  const [adminDividends, setAdminDividends] = useState<AdminDividend[]>([])
  const [adminTerms, setAdminTerms] = useState('')
  const [adminTermsUpdatedAt, setAdminTermsUpdatedAt] = useState<string | null>(null)
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null)
  const [adminStatementRefreshKey, setAdminStatementRefreshKey] = useState(0)
  const [adminMemberId, setAdminMemberId] = useState('')
  const [adminAmount, setAdminAmount] = useState('')
  const [adminDescription, setAdminDescription] = useState('')
  const [repaymentLoanId, setRepaymentLoanId] = useState('')
  const [repaymentAmount, setRepaymentAmount] = useState('')
  const [repaymentDescription, setRepaymentDescription] = useState('')
  const [dividendAmount, setDividendAmount] = useState('')
  const [dividendPeriod, setDividendPeriod] = useState('')
  const [dividendDescription, setDividendDescription] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  const [adminMessageSuccess, setAdminMessageSuccess] = useState(false)
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const [adminReviewingId, setAdminReviewingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(async (response) => {
        const session = await response.json() as {
          authenticated: boolean
          role?: 'member' | 'admin'
          admin?: { displayName: string }
        }

        if (!session.authenticated) return
        if (session.role === 'member') await refreshDashboard()
        if (session.role === 'admin') {
          setSignedInAdmin(session.admin?.displayName ?? 'Administrator')
          await refreshAdminData()
        }
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (mode !== 'register') return
    const controller = new AbortController()
    fetch('/api/auth/terms', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { terms?: string; updatedAt?: string | null; error?: string }
        if (!response.ok) throw new Error(result.error ?? 'Could not load the SACCO terms and conditions.')
        setRegistrationTerms(result.terms ?? '')
        setRegistrationTermsVersion(result.updatedAt ?? null)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setRegistrationTermsError(error instanceof Error ? error.message : 'Could not load the SACCO terms and conditions.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setRegistrationTermsLoading(false)
      })
    return () => controller.abort()
  }, [mode])

  async function refreshDashboard() {
    const response = await fetch('/api/member/dashboard')
    const result = await response.json() as DashboardData & { error?: string }
    if (!response.ok) throw new Error(result.error ?? 'Could not load your member dashboard.')
    setDashboard(result)
  }

  async function refreshAdminData() {
    const [summaryResponse, membersResponse, applicationsResponse, dividendsResponse, repaymentsResponse, termsResponse] = await Promise.all([
      fetch('/api/admin/dashboard'),
      fetch('/api/admin/members'),
      fetch('/api/admin/loan-applications'),
      fetch('/api/admin/dividends'),
      fetch('/api/admin/repayments'),
      fetch('/api/admin/terms'),
    ])
    const [summaryResult, membersResult, applicationsResult, dividendsResult, repaymentsResult, termsResult] = await Promise.all([
      summaryResponse.json() as Promise<AdminSummary & { error?: string }>,
      membersResponse.json() as Promise<{ members?: AdminMember[]; error?: string }>,
      applicationsResponse.json() as Promise<{ applications?: AdminLoanApplication[]; error?: string }>,
      dividendsResponse.json() as Promise<{ payments?: AdminDividend[]; error?: string }>,
      repaymentsResponse.json() as Promise<{ loans?: AdminOpenLoan[]; error?: string }>,
      termsResponse.json() as Promise<{ terms?: string; updatedAt?: string | null; error?: string }>,
    ])

    if (!summaryResponse.ok || !membersResponse.ok || !applicationsResponse.ok || !dividendsResponse.ok || !repaymentsResponse.ok || !termsResponse.ok) {
      throw new Error(summaryResult.error ?? membersResult.error ?? applicationsResult.error ?? dividendsResult.error ?? repaymentsResult.error ?? termsResult.error ?? 'Could not load admin records.')
    }

    const members = membersResult.members ?? []
    const openLoans = repaymentsResult.loans ?? []
    setAdminSummary(summaryResult)
    setAdminStatementRefreshKey((version) => version + 1)
    setAdminMembers(members)
    setAdminApplications(applicationsResult.applications ?? [])
    setAdminDividends(dividendsResult.payments ?? [])
    setAdminTerms(termsResult.terms ?? '')
    setAdminTermsUpdatedAt(termsResult.updatedAt ?? null)
    setAdminOpenLoans(openLoans)
    setRepaymentLoanId((currentId) => openLoans.some((loan) => String(loan.id) === currentId)
      ? currentId
      : String(openLoans[0]?.id ?? ''))
    setAdminMemberId((currentId) => members.some((member) => String(member.id) === currentId)
      ? currentId
      : String(members[0]?.id ?? ''))
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setMessage('')
    setIsSuccess(false)
    if (nextMode === 'register') {
      setRegistrationTermsLoading(true)
      setRegistrationTermsError('')
    } else {
      setRegistrationForm({ ...emptyRegistrationForm })
      setRegistrationTermsLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'register' && !registrationTerms) {
      setIsSuccess(false)
      setMessage(registrationTermsError || 'The SACCO has not published terms and conditions yet.')
      return
    }
    if (mode === 'register' && password !== confirmPassword) {
      setIsSuccess(false)
      setMessage('The passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setIsSuccess(false)

    try {
      const isRegistering = mode === 'register'
      const isAdminLogin = mode === 'admin-login'
      const endpoint = isRegistering ? '/api/auth/register' : isAdminLogin ? '/api/admin/login' : '/api/auth/login'
      const body = isRegistering
        ? { nationalId, ...registrationForm, termsVersion: registrationTermsVersion, termsSnapshot: registrationTerms, password }
        : isAdminLogin ? { username: adminUsername, password } : { nationalId, password }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json() as {
        member?: { nationalId: string; fullName: string }
        admin?: { username: string; displayName: string; isSuperAdmin?: boolean }
        message?: string
        error?: string
      }
      if (!response.ok) {
        if (isRegistering && response.status === 409 && result.error?.includes('terms and conditions have changed')) {
          const termsResponse = await fetch('/api/auth/terms')
          const currentTerms = await termsResponse.json() as { terms?: string; updatedAt?: string | null }
          if (termsResponse.ok) {
            setRegistrationTerms(currentTerms.terms ?? '')
            setRegistrationTermsVersion(currentTerms.updatedAt ?? null)
            setRegistrationForm((current) => ({ ...current, acceptedTerms: false }))
          }
        }
        throw new Error(result.error ?? 'We could not complete your request. Please try again.')
      }

      if (isRegistering) {
        setNationalId(result.member?.nationalId ?? nationalId.trim())
        setRegistrationForm({ ...emptyRegistrationForm })
        setPassword('')
        setConfirmPassword('')
        setMode('login')
        setMessage(result.message ?? 'Your account request has been submitted for review.')
        setIsSuccess(true)
        return
      }
      if (isAdminLogin) {
        setSignedInAdmin(result.admin?.displayName ?? result.admin?.username ?? 'Administrator')
        await refreshAdminData()
        return
      }

      localStorage.removeItem('magomano-national-id')
      localStorage.removeItem('magomano-member-number')
      await refreshDashboard()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to reach the sign-in service.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLoanApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoanSubmitting(true)
    setLoanMessage('')
    setLoanMessageSuccess(false)
    try {
      const response = await fetch('/api/member/loan-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedAmount: loanAmount, repaymentMonths, purpose: loanPurpose, securityType: 'savings' }),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not submit your application.')
      setLoanMessage(result.message ?? 'Your application has been submitted for review.')
      setLoanMessageSuccess(true)
      setLoanAmount('')
      setLoanPurpose('')
      setMemberView('loan-status')
    } catch (error) {
      setLoanMessage(error instanceof Error ? error.message : 'Unable to reach the application service.')
      setLoanMessageSuccess(false)
    } finally {
      setLoanSubmitting(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setDashboard(null)
      setSignedInAdmin(null)
      setAdminMembers([])
      setAdminApplications([])
      setAdminOpenLoans([])
      setAdminDividends([])
      setAdminSummary(null)
      setAdminView('overview')
      setMemberView('overview')
      setMenuOpen(false)
      setPassword('')
      setMessage('')
      setIsSuccess(false)
    }
  }

  async function handleAdminSavingsEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAdminSubmitting(true)
    setAdminMessage('')
    try {
      const response = await fetch('/api/admin/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: adminMemberId, entryType: 'deposit', amount: adminAmount, description: adminDescription }),
      })
      const result = await response.json() as { message?: string; balance?: number; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not record the savings entry.')
      await refreshAdminData()
      setAdminMessage(`${result.message} New savings balance: ${currency.format(result.balance ?? 0)}.`)
      setAdminMessageSuccess(true)
      setAdminAmount('')
      setAdminDescription('')
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : 'Unable to reach the savings service.')
      setAdminMessageSuccess(false)
    } finally {
      setAdminSubmitting(false)
    }
  }

  async function handleLoanRepayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAdminSubmitting(true)
    setAdminMessage('')
    try {
      const response = await fetch('/api/admin/repayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: repaymentLoanId, amount: repaymentAmount, description: repaymentDescription }),
      })
      const result = await response.json() as { message?: string; outstandingBalance?: number; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not record the loan repayment.')
      await refreshAdminData()
      setAdminMessage(`${result.message} Remaining balance: ${currency.format(result.outstandingBalance ?? 0)}.`)
      setAdminMessageSuccess(true)
      setRepaymentAmount('')
      setRepaymentDescription('')
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : 'Unable to record the loan repayment.')
      setAdminMessageSuccess(false)
    } finally {
      setAdminSubmitting(false)
    }
  }

  async function reviewMemberAccount(memberId: number, decision: 'approve' | 'reject') {
    setAdminReviewingId(`member-${memberId}`)
    setAdminMessage('')
    try {
      const response = await fetch(`/api/admin/members/${memberId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not update member account status.')
      await refreshAdminData()
      setAdminMessage(result.message ?? `Member ${decision}d.`)
      setAdminMessageSuccess(true)
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : 'Unable to update member account.')
      setAdminMessageSuccess(false)
    } finally {
      setAdminReviewingId(null)
    }
  }

  async function runAdminMutation(
    path: string,
    method: 'PUT' | 'DELETE',
    body: Record<string, string | number> | undefined,
    actionId: string,
    fallbackMessage: string,
  ): Promise<boolean> {
    setAdminReviewingId(actionId)
    setAdminMessage('')
    try {
      const response = await fetch(path, {
        method,
        ...(body ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        } : {}),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? fallbackMessage)
      await refreshAdminData()
      setAdminMessage(result.message ?? fallbackMessage)
      setAdminMessageSuccess(true)
      return true
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : fallbackMessage)
      setAdminMessageSuccess(false)
      return false
    } finally {
      setAdminReviewingId(null)
    }
  }

  async function setMemberRole(memberId: number, role: AdminMember['memberRole']) {
    await runAdminMutation(`/api/admin/members/${memberId}/role`, 'PUT', { role }, `member-role-${memberId}`, 'Could not update member role.')
  }

  async function deleteMember(memberId: number) {
    return runAdminMutation(`/api/admin/members/${memberId}`, 'DELETE', undefined, `delete-member-${memberId}`, 'Could not delete this member.')
  }

  async function updateLoanApplication(applicationId: number, details: Pick<AdminLoanApplication, 'requestedAmount' | 'repaymentMonths' | 'purpose'>) {
    return runAdminMutation(`/api/admin/loan-applications/${applicationId}`, 'PUT', details, `edit-loan-${applicationId}`, 'Could not update this loan application.')
  }

  async function deleteLoanApplication(applicationId: number) {
    return runAdminMutation(`/api/admin/loan-applications/${applicationId}`, 'DELETE', undefined, `delete-loan-${applicationId}`, 'Could not delete this loan application.')
  }

  async function reviewLoanApplication(applicationId: number, decision: 'approve' | 'reject') {
    setAdminReviewingId(`loan-${applicationId}`)
    setAdminMessage('')
    try {
      const response = await fetch(`/api/admin/loan-applications/${applicationId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not update loan application.')
      await refreshAdminData()
      setAdminMessage(result.message ?? `Loan application ${decision}d.`)
      setAdminMessageSuccess(true)
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : 'Unable to update loan application.')
      setAdminMessageSuccess(false)
    } finally {
      setAdminReviewingId(null)
    }
  }

  async function updateMemberDetails(memberId: number, details: MemberProfileUpdate): Promise<boolean> {
    setAdminReviewingId(`member-details-${memberId}`)
    setAdminMessage('')
    try {
      const response = await fetch(`/api/admin/members/${memberId}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not update member details.')
      await refreshAdminData()
      setAdminMessage(result.message ?? 'Member details updated.')
      setAdminMessageSuccess(true)
      return true
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : 'Unable to update member details.')
      setAdminMessageSuccess(false)
      return false
    } finally {
      setAdminReviewingId(null)
    }
  }

  async function saveTerms(terms: string): Promise<boolean> {
    setAdminMessage('')
    try {
      const response = await fetch('/api/admin/terms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms }),
      })
      const result = await response.json() as { terms?: string; updatedAt?: string; message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not save terms and conditions.')
      setAdminTerms(result.terms ?? terms)
      setAdminTermsUpdatedAt(result.updatedAt ?? new Date().toISOString())
      setAdminMessage(result.message ?? 'Terms and conditions saved.')
      setAdminMessageSuccess(true)
      return true
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : 'Unable to save terms and conditions.')
      setAdminMessageSuccess(false)
      return false
    }
  }

  async function handleDividendPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAdminSubmitting(true)
    setAdminMessage('')
    try {
      const response = await fetch('/api/admin/dividends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: adminMemberId, amount: dividendAmount, financialPeriod: dividendPeriod, description: dividendDescription }),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not record dividend payment.')
      await refreshAdminData()
      setAdminMessage(result.message ?? 'Dividend payment recorded.')
      setAdminMessageSuccess(true)
      setDividendAmount('')
      setDividendDescription('')
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : 'Unable to record dividend payment.')
      setAdminMessageSuccess(false)
    } finally {
      setAdminSubmitting(false)
    }
  }

  if (dashboard) {
    return (
      <MemberPortal
        dashboard={dashboard}
        view={memberView}
        setView={setMemberView}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        loanAmount={loanAmount}
        setLoanAmount={setLoanAmount}
        repaymentMonths={repaymentMonths}
        setRepaymentMonths={setRepaymentMonths}
        loanPurpose={loanPurpose}
        setLoanPurpose={setLoanPurpose}
        loanMessage={loanMessage}
        loanMessageSuccess={loanMessageSuccess}
        loanSubmitting={loanSubmitting}
        onLoanApplication={handleLoanApplication}
        onLogout={handleLogout}
      />
    )
  }

  if (signedInAdmin) {
    return (
      <AdminPortal
        signedInAdmin={signedInAdmin}
        view={adminView}
        setView={setAdminView}
        summary={adminSummary}
        statementRefreshKey={adminStatementRefreshKey}
        members={adminMembers}
        applications={adminApplications}
        openLoans={adminOpenLoans}
        dividends={adminDividends}
        memberId={adminMemberId}
        setMemberId={setAdminMemberId}
        amount={adminAmount}
        setAmount={setAdminAmount}
        description={adminDescription}
        setDescription={setAdminDescription}
        message={adminMessage}
        messageSuccess={adminMessageSuccess}
        submitting={adminSubmitting}
        reviewingId={adminReviewingId}
        repaymentLoanId={repaymentLoanId}
        setRepaymentLoanId={setRepaymentLoanId}
        repaymentAmount={repaymentAmount}
        setRepaymentAmount={setRepaymentAmount}
        repaymentDescription={repaymentDescription}
        setRepaymentDescription={setRepaymentDescription}
        dividendAmount={dividendAmount}
        setDividendAmount={setDividendAmount}
        dividendPeriod={dividendPeriod}
        setDividendPeriod={setDividendPeriod}
        dividendDescription={dividendDescription}
        setDividendDescription={setDividendDescription}
        onLogout={handleLogout}
        onSavingsEntry={handleAdminSavingsEntry}
        onLoanRepayment={handleLoanRepayment}
        onDividendPayment={handleDividendPayment}
        onReviewMember={reviewMemberAccount}
        onSetMemberRole={setMemberRole}
        onDeleteMember={deleteMember}
        onReviewLoan={reviewLoanApplication}
        onUpdateLoanApplication={updateLoanApplication}
        onDeleteLoanApplication={deleteLoanApplication}
        onUpdateMember={updateMemberDetails}
        terms={adminTerms}
        setTerms={setAdminTerms}
        termsUpdatedAt={adminTermsUpdatedAt}
        onSaveTerms={saveTerms}
        onRefresh={refreshAdminData}
      />
    )
  }

  return (
    <AuthScreen
      key={mode}
      mode={mode}
      nationalId={nationalId}
      setNationalId={setNationalId}
      adminUsername={adminUsername}
      setAdminUsername={setAdminUsername}
      registration={registrationForm}
      setRegistration={setRegistrationForm}
      terms={registrationTerms}
      termsVersion={registrationTermsVersion}
      termsLoading={registrationTermsLoading}
      termsError={registrationTermsError}
      password={password}
      setPassword={setPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      isSubmitting={isSubmitting}
      message={message}
      isSuccess={isSuccess}
      onSubmit={handleSubmit}
      onChangeMode={changeMode}
    />
  )
}

export default App
