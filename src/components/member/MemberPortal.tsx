import { useEffect, useLayoutEffect, useState, type Dispatch, type FormEventHandler, type SetStateAction } from 'react'
import { MemberAccountInfoPage } from './MemberAccountInfoPage'
import { MemberTermsPage } from './MemberTermsPage'
import type { StatementFilterValues } from '../StatementFilterPopover'
import type {
  DashboardData,
  LoanRepayment,
  MemberLoanApplication,
  MemberLoanRecord,
  MemberStatementPage,
  MemberView,
  SavingsTransaction,
} from '../../types'
import { MemberHeader } from './MemberHeader'
import { applicationUrl, statementUrl, type StatementState } from './statementHelpers'
import { MemberLoanApplicationView } from './views/MemberLoanApplicationView'
import { MemberLoanStatusView } from './views/MemberLoanStatusView'
import { MemberOverviewView } from './views/MemberOverviewView'
import { readJsonResponse, requestErrorMessage } from '../../networkErrors'
import { useMobileBackHandler } from '../../hooks/useMobileBackHandler'

export interface MemberPortalProps {
  dashboard: DashboardData
  view: MemberView
  setView: Dispatch<SetStateAction<MemberView>>
  menuOpen: boolean
  setMenuOpen: Dispatch<SetStateAction<boolean>>
  loanAmount: string
  setLoanAmount: Dispatch<SetStateAction<string>>
  repaymentMonths: string
  setRepaymentMonths: Dispatch<SetStateAction<string>>
  loanPurpose: string
  setLoanPurpose: Dispatch<SetStateAction<string>>
  loanMessage: string
  loanMessageSuccess: boolean
  loanSubmitting: boolean
  onLoanApplication: FormEventHandler<HTMLFormElement>
  onLogout: () => void
  forceLightAppearance: boolean
  onToggleLightAppearance: () => void
  isSyncing: boolean
  syncError: string
  onSync: () => void
}

export function MemberPortal({
  dashboard,
  view,
  setView,
  menuOpen,
  setMenuOpen,
  loanAmount,
  setLoanAmount,
  repaymentMonths,
  setRepaymentMonths,
  loanPurpose,
  setLoanPurpose,
  loanMessage,
  loanMessageSuccess,
  loanSubmitting,
  onLoanApplication,
  onLogout,
  forceLightAppearance,
  onToggleLightAppearance,
  isSyncing,
  syncError,
  onSync,
}: MemberPortalProps) {
  const firstName = dashboard.member.full_name.trim().split(/\s+/)[0] || 'Member'
  useLayoutEffect(() => {
    document.documentElement.classList.add('member-portal-active')
    return () => document.documentElement.classList.remove('member-portal-active')
  }, [])

  const [savingsPage, setSavingsPage] = useState<StatementState<SavingsTransaction>>({
    items: dashboard.savings.statement,
    total: dashboard.savings.statement.length,
    page: 1,
    pageSize: 5,
    loading: true,
    error: '',
    filters: { search: '', from: '', to: '', status: '' },
  })

  const [loansPage, setLoansPage] = useState<StatementState<MemberLoanRecord>>({
    items: dashboard.loans.statement,
    total: dashboard.loans.statement.length,
    page: 1,
    pageSize: 5,
    loading: true,
    error: '',
    filters: { search: '', from: '', to: '', status: '' },
  })

  const [repaymentsPage, setRepaymentsPage] = useState<StatementState<LoanRepayment>>({
    items: dashboard.loans.repayments,
    total: dashboard.loans.repayments.length,
    page: 1,
    pageSize: 5,
    loading: true,
    error: '',
    filters: { search: '', from: '', to: '', status: '' },
  })

  const [applicationsPage, setApplicationsPage] = useState<StatementState<MemberLoanApplication>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    loading: true,
    error: '',
    filters: { search: '', from: '', to: '', status: '' },
  })

  useEffect(() => {
    let active = true
    const controllers = [
      new AbortController(),
      new AbortController(),
      new AbortController(),
      new AbortController(),
    ]

    const loadPage = async <T,>(
      type: 'savings' | 'loans' | 'repayments',
      page: number,
      filters: StatementFilterValues,
      updateState: Dispatch<SetStateAction<StatementState<T>>>,
      signal: AbortSignal,
    ) => {
      try {
        updateState((current) => ({ ...current, loading: true, error: '' }))
        const response = await fetch(statementUrl(type, page, filters), { signal })
        const result = await readJsonResponse<MemberStatementPage<T> & { error?: string }>(response)
        if (!response.ok) throw new Error(result.error ?? 'Could not load this statement.')
        if (active) {
          updateState((current) => ({
            ...current,
            items: result.items,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            loading: false,
            error: '',
          }))
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (active) {
          const message = requestErrorMessage(error, 'Could not load this statement.')
          updateState((current) => ({ ...current, loading: false, error: message }))
        }
      }
    }

    const loadApplications = async (signal: AbortSignal) => {
      try {
        setApplicationsPage((current) => ({ ...current, loading: current.items.length === 0, error: '' }))
        const response = await fetch(applicationUrl(applicationsPage.page, applicationsPage.filters), { signal })
        const result = await readJsonResponse<MemberStatementPage<MemberLoanApplication> & { error?: string }>(response)
        if (!response.ok) throw new Error(result.error ?? 'Could not load your application history.')
        if (active) {
          setApplicationsPage((current) => ({
            ...current,
            items: result.items,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            loading: false,
            error: '',
          }))
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (active) {
          const message = requestErrorMessage(error, 'Could not load your application history.')
          setApplicationsPage((current) => ({ ...current, loading: false, error: message }))
        }
      }
    }

    void Promise.all([
      loadPage<SavingsTransaction>('savings', 1, savingsPage.filters, setSavingsPage, controllers[0].signal),
      loadPage<MemberLoanRecord>('loans', 1, loansPage.filters, setLoansPage, controllers[1].signal),
      loadPage<LoanRepayment>('repayments', 1, repaymentsPage.filters, setRepaymentsPage, controllers[2].signal),
      loadApplications(controllers[3].signal),
    ])

    return () => {
      active = false
      controllers.forEach((controller) => controller.abort())
    }
  }, [
    dashboard.member.national_id,
    savingsPage.filters,
    loansPage.filters,
    repaymentsPage.filters,
    applicationsPage.page,
    applicationsPage.filters,
  ])

  function changePage<T>(
    type: 'savings' | 'loans' | 'repayments',
    page: number,
    filters: StatementFilterValues,
    updateState: Dispatch<SetStateAction<StatementState<T>>>,
  ) {
    updateState((current) => ({ ...current, loading: true, error: '' }))
    const controller = new AbortController()
    fetch(statementUrl(type, page, filters), { signal: controller.signal })
      .then(async (response) => {
        const result = await readJsonResponse<MemberStatementPage<T> & { error?: string }>(response)
        if (!response.ok) throw new Error(result.error ?? 'Could not load this statement.')
        updateState((current) => ({
          ...current,
          items: result.items,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          loading: false,
          error: '',
        }))
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        const message = requestErrorMessage(error, 'Could not load this statement.')
        updateState((current) => ({ ...current, loading: false, error: message }))
      })
  }

  function updateStatementFilter<T>(
    updateState: Dispatch<SetStateAction<StatementState<T>>>,
    filters: StatementFilterValues,
  ) {
    updateState((current) => ({ ...current, page: 1, loading: true, filters }))
  }

  // Back Button Navigation & Double-Back to Exit
  let activeModalClose: (() => void) | null = null
  if (menuOpen) {
    activeModalClose = () => setMenuOpen(false)
  }

  const isRoot = view === 'overview' && activeModalClose === null

  const { showExitToast } = useMobileBackHandler({
    activeModalClose,
    currentView: view,
    onGoToRoot: () => setView('overview'),
    isRoot,
  })

  return (
    <main className="member-dashboard">
      {showExitToast && (
        <div className="mobile-exit-toast" role="status" aria-live="polite">
          Swipe back again to exit
        </div>
      )}
      <MemberHeader
        firstName={firstName}
        view={view}
        setView={setView}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onLogout={onLogout}
        forceLightAppearance={forceLightAppearance}
        onToggleLightAppearance={onToggleLightAppearance}
        isSyncing={isSyncing}
        syncError={syncError}
        onSync={onSync}
      />
      {view === 'overview' ? (
        <MemberOverviewView
          firstName={firstName}
          dashboard={dashboard}
          savingsPage={savingsPage}
          setSavingsPage={setSavingsPage}
          loansPage={loansPage}
          setLoansPage={setLoansPage}
          repaymentsPage={repaymentsPage}
          setRepaymentsPage={setRepaymentsPage}
          onPageChange={changePage}
          onUpdateFilter={updateStatementFilter}
        />
      ) : view === 'apply-loan' ? (
        <MemberLoanApplicationView
          dashboard={dashboard}
          setView={setView}
          loanAmount={loanAmount}
          setLoanAmount={setLoanAmount}
          repaymentMonths={repaymentMonths}
          setRepaymentMonths={setRepaymentMonths}
          loanPurpose={loanPurpose}
          setLoanPurpose={setLoanPurpose}
          loanMessage={loanMessage}
          loanMessageSuccess={loanMessageSuccess}
          loanSubmitting={loanSubmitting}
          onLoanApplication={onLoanApplication}
        />
      ) : view === 'account-info' ? (
        <MemberAccountInfoPage />
      ) : view === 'terms' ? (
        <MemberTermsPage />
      ) : (
        <MemberLoanStatusView
          setView={setView}
          applicationsPage={applicationsPage}
          setApplicationsPage={setApplicationsPage}
        />
      )}
    </main>
  )
}

