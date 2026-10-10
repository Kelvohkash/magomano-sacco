import { useEffect, useState, type Dispatch, type FormEventHandler, type SetStateAction } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, HandCoins, Landmark, LogOut, Menu, UsersRound, Wallet, X, XCircle } from 'lucide-react'
import { AnimatedFigure } from './AnimatedFigure'
import { MemberContactsPage, MemberTermsPage } from './MemberAccountPages'
import { StatementFilterPopover, type StatementFilterValues } from './StatementFilterPopover'
import { formatDate } from '../format'
import type { DashboardData, LoanRepayment, MemberLoanApplication, MemberLoanRecord, MemberStatementPage, MemberView, SavingsTransaction } from '../types'

interface MemberPortalProps {
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
}

interface StatementState<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string
  filters: StatementFilterValues
}

function statementUrl(type: 'savings' | 'loans' | 'repayments', page: number, filters: StatementFilterValues) {
  const params = new URLSearchParams({ type, page: String(page) })
  if (filters.search.trim()) params.set('search', filters.search.trim())
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.status) params.set('status', filters.status)
  return `/api/member/transactions?${params}`
}

function StatementPagination({
  label,
  page,
  pageSize,
  total,
  loading,
  onPageChange,
}: {
  label: string
  page: number
  pageSize: number
  total: number
  loading: boolean
  onPageChange: (page: number) => void
}) {
  if (total <= pageSize && !loading) return null
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="statement-pagination" aria-label={`${label} pagination`}>
      <span>{loading ? 'Loading transactions…' : `Showing ${first}–${last} of ${total}`}</span>
      <div>
        <button type="button" aria-label={`Previous ${label} page`} disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>
          <ArrowLeft size={15} /> Previous
        </button>
        <span className="statement-page-number">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
        <button type="button" aria-label={`Next ${label} page`} disabled={loading || last >= total} onClick={() => onPageChange(page + 1)}>
          Next <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

function applicationStatus(status: MemberLoanApplication['status']) {
  if (status === 'approved') return { label: 'Approved & disbursed', Icon: CheckCircle2 }
  if (status === 'rejected') return { label: 'Not approved', Icon: XCircle }
  return { label: 'Received · under review', Icon: Clock3 }
}

function LoanApplicationStatus() {
  const [state, setState] = useState<StatementState<MemberLoanApplication>>({
    items: [], total: 0, page: 1, pageSize: 10, loading: true, error: '',
    filters: { search: '', from: '', to: '', status: '' },
  })

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(state.page) })
    if (state.filters.search.trim()) params.set('search', state.filters.search.trim())
    if (state.filters.from) params.set('from', state.filters.from)
    if (state.filters.to) params.set('to', state.filters.to)
    if (state.filters.status) params.set('status', state.filters.status)
    fetch(`/api/member/loan-applications?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as MemberStatementPage<MemberLoanApplication> & { error?: string }
        if (!response.ok) throw new Error(result.error ?? 'Could not load your application history.')
        setState((current) => ({
          ...current, items: result.items, total: result.total, page: result.page,
          pageSize: result.pageSize, loading: false, error: '',
        }))
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setState((current) => ({
          ...current,
          loading: false,
          error: cause instanceof Error ? cause.message : 'Could not load your application history.',
        }))
      })
    return () => controller.abort()
  }, [state.page, state.filters])

  function changePage(page: number) {
    setState((current) => ({ ...current, page, loading: true }))
  }

  return (
    <>
      <div className="dashboard-intro">
        <p className="dashboard-kicker">LOAN SERVICES</p>
        <h1>Loan application status</h1>
        <p>Track requests sent to the SACCO and see the latest decision.</p>
      </div>
      <section className="statement-section application-status-section" aria-label="Loan application history">
        <div className="statement-heading">
          <div><p className="section-kicker">YOUR REQUESTS</p><h2>Application history</h2><span className="statement-total">{state.loading ? 'Loading…' : `${state.total} applications`}</span></div>
          <div className="statement-heading-actions">
            <HandCoins size={19} aria-hidden="true" />
            <StatementFilterPopover
              label="loan applications"
              filters={state.filters}
              onApply={(filters) => {
                setState((current) => ({ ...current, page: 1, loading: true, filters }))
              }}
              statusOptions={[
                { value: 'pending', label: 'Received / under review' },
                { value: 'approved', label: 'Approved & disbursed' },
                { value: 'rejected', label: 'Not approved' },
              ]}
              searchPlaceholder="Purpose or status"
            />
          </div>
        </div>
        {state.error && <p className="statement-error" role="alert">{state.error}</p>}
        {state.items.length > 0 ? (
          <div className="loan-application-status-list">
            {state.items.map((application) => {
              const status = applicationStatus(application.status)
              const StatusIcon = status.Icon
              return (
                <article className="loan-application-status-card" key={application.id}>
                  <div className="loan-application-status-top">
                    <div>
                      <span className="application-date"><CalendarDays size={14} /> Submitted {formatDate(application.appliedAt)}</span>
                      <h3><AnimatedFigure value={application.requestedAmount} /> requested</h3>
                    </div>
                    <span className={`application-status-badge ${application.status}`}><StatusIcon size={15} />{status.label}</span>
                  </div>
                  <p>{application.repaymentMonths}-month repayment period <span aria-hidden="true">·</span> Savings security <span aria-hidden="true">·</span> {application.purpose}</p>
                  {application.status === 'pending' && <small>Your application has been received and is waiting for SACCO review.</small>}
                  {application.status === 'approved' && <small>Your request was approved and the loan was issued.</small>}
                  {application.status === 'rejected' && <small>This request was not approved. Contact the SACCO if you need more information.</small>}
                </article>
              )
            })}
          </div>
        ) : !state.loading && !state.error ? (
          <p className="empty-statement">
            {state.filters.search || state.filters.from || state.filters.to || state.filters.status
              ? 'No applications match these filters.'
              : 'You have not submitted a loan application yet.'}
          </p>
        ) : state.loading ? <p className="empty-statement">Loading applications…</p> : null}
        <StatementPagination
          label="loan applications"
          page={state.page}
          pageSize={state.pageSize}
          total={state.total}
          loading={state.loading}
          onPageChange={changePage}
        />
      </section>
    </>
  )
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
}: MemberPortalProps) {
  const firstName = dashboard.member.full_name.trim().split(/\s+/)[0] || 'Member'
  const bankAccounts = dashboard.member.bankAccounts
  const [payoutAccount, setPayoutAccount] = useState<'primary' | 'secondary'>(bankAccounts[0]?.id ?? 'primary')
  const [savingsPage, setSavingsPage] = useState<StatementState<SavingsTransaction>>({
    items: dashboard.savings.statement, total: dashboard.savings.statement.length, page: 1, pageSize: 10, loading: true, error: '', filters: { search: '', from: '', to: '', status: '' },
  })
  const [loansPage, setLoansPage] = useState<StatementState<MemberLoanRecord>>({
    items: dashboard.loans.statement, total: dashboard.loans.statement.length, page: 1, pageSize: 10, loading: true, error: '', filters: { search: '', from: '', to: '', status: '' },
  })
  const [repaymentsPage, setRepaymentsPage] = useState<StatementState<LoanRepayment>>({
    items: dashboard.loans.repayments, total: dashboard.loans.repayments.length, page: 1, pageSize: 10, loading: true, error: '', filters: { search: '', from: '', to: '', status: '' },
  })

  useEffect(() => {
    let active = true
    const controllers = [new AbortController(), new AbortController(), new AbortController()]
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
        const result = await response.json() as MemberStatementPage<T> & { error?: string }
        if (!response.ok) throw new Error(result.error ?? 'Could not load this statement.')
        if (active) updateState((current) => ({
          ...current,
          items: result.items,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          loading: false,
          error: '',
        }))
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (active) {
          const message = error instanceof Error ? error.message : 'Could not load this statement.'
          updateState((current) => ({ ...current, loading: false, error: message }))
        }
      }
    }
    void Promise.all([
      loadPage<SavingsTransaction>('savings', 1, savingsPage.filters, setSavingsPage, controllers[0].signal),
      loadPage<MemberLoanRecord>('loans', 1, loansPage.filters, setLoansPage, controllers[1].signal),
      loadPage<LoanRepayment>('repayments', 1, repaymentsPage.filters, setRepaymentsPage, controllers[2].signal),
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
        const result = await response.json() as MemberStatementPage<T> & { error?: string }
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
        const message = error instanceof Error ? error.message : 'Could not load this statement.'
        updateState((current) => ({ ...current, loading: false, error: message }))
      })
  }

  function updateStatementFilter<T>(
    updateState: Dispatch<SetStateAction<StatementState<T>>>,
    filters: StatementFilterValues,
  ) {
    updateState((current) => ({ ...current, page: 1, loading: true, filters }))
  }

  return (
    <main className="member-dashboard">
      <header className="dashboard-header">
        <a className="dashboard-brand brand" href="/" aria-label="Magomano SACCO dashboard">
          <span className="brand-mark"><Landmark size={21} strokeWidth={1.8} /></span>
          <span className="brand-name">magomano<span>sacco</span></span>
        </a>
        <nav className="member-desktop-nav" aria-label="Member sections">
          <button type="button" aria-current={view === 'overview' ? 'page' : undefined} className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>
            <Wallet size={17} /> Overview
          </button>
          <button type="button" aria-current={view === 'apply-loan' ? 'page' : undefined} className={view === 'apply-loan' ? 'active' : ''} onClick={() => setView('apply-loan')}>
            <HandCoins size={17} /> Apply for a loan
          </button>
          <button type="button" aria-current={view === 'loan-status' ? 'page' : undefined} className={view === 'loan-status' ? 'active' : ''} onClick={() => setView('loan-status')}>
            <Clock3 size={17} /> Loan application status
          </button>
          <button type="button" aria-current={view === 'contacts' ? 'page' : undefined} className={view === 'contacts' ? 'active' : ''} onClick={() => setView('contacts')}>
            <UsersRound size={17} /> Contact persons
          </button>
          <button type="button" aria-current={view === 'terms' ? 'page' : undefined} className={view === 'terms' ? 'active' : ''} onClick={() => setView('terms')}>
            <FileText size={17} /> Terms
          </button>
        </nav>
        <div className="member-greeting">
          <span className="member-avatar">{firstName.slice(0, 1).toUpperCase()}</span>
          <span>{firstName}</span>
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
            <button type="button" onClick={() => { setView('contacts'); setMenuOpen(false) }}>
              <UsersRound size={17} /> Contact persons
            </button>
            <button type="button" onClick={() => { setView('terms'); setMenuOpen(false) }}>
              <FileText size={17} /> Terms and conditions
            </button>
            <button type="button" onClick={onLogout}>
              <LogOut size={17} /> Sign out
            </button>
          </nav>
        )}
      </header>

      {view === 'overview' ? (
        <section className="dashboard-content">
          <div className="dashboard-intro">
            <p className="dashboard-kicker">MEMBER OVERVIEW</p>
            <h1>Hello, {firstName}</h1>
            <p>National ID · {dashboard.member.national_id}</p>
          </div>

          <section className="balance-grid" aria-label="Account totals">
            <article className="balance-panel savings-panel">
              <div className="balance-heading"><span><Wallet size={18} /></span><p>Current savings</p></div>
              <p className="balance-amount"><AnimatedFigure value={dashboard.savings.balance} /></p>
              <p className="balance-caption">Total savings balance</p>
            </article>
            <article className="balance-panel available-panel">
              <div className="balance-heading"><span><Wallet size={18} /></span><p>Available to borrow</p></div>
              <p className="balance-amount"><AnimatedFigure value={dashboard.borrowingCapacity.availableBalance} /></p>
              <p className="balance-caption">After active loan balances and pending requests</p>
            </article>
            <article className="balance-panel loans-panel">
              <div className="balance-heading"><span><HandCoins size={18} /></span><p>Outstanding loans</p></div>
              <p className="balance-amount"><AnimatedFigure value={dashboard.loans.outstandingBalance} /></p>
              <p className="balance-caption">Current loan balance</p>
            </article>
          </section>

          <div className="statement-grid">
            <section className="statement-section">
              <div className="statement-heading">
                <div><p className="section-kicker">ACCOUNT ACTIVITY</p><h2>Savings statement</h2><span className="statement-total">{savingsPage.loading ? 'Loading…' : `${savingsPage.total} deposits`}</span></div>
                <div className="statement-heading-actions">
                  <Wallet size={19} aria-hidden="true" />
                  <StatementFilterPopover label="savings deposits" filters={savingsPage.filters} onApply={(filters) => updateStatementFilter(setSavingsPage, filters)} />
                </div>
              </div>
              {savingsPage.error && <p className="statement-error" role="alert">{savingsPage.error}</p>}
              {savingsPage.items.length ? (
                <div className="statement-list">
                  {savingsPage.items.map((entry, index) => (
                    <article className="statement-row" key={`${entry.occurredAt}-${index}`}>
                      <div className="statement-icon savings-icon"><Wallet size={16} /></div>
                      <div className="statement-details">
                        <strong>{entry.description || 'Savings deposit'}</strong>
                        <span><CalendarDays size={13} /> {formatDate(entry.occurredAt)}</span>
                      </div>
                      <strong className="statement-amount deposit">
                        +<AnimatedFigure value={entry.amount} />
                      </strong>
                    </article>
                  ))}
                </div>
              ) : savingsPage.loading ? <p className="empty-statement">Loading savings deposits…</p> : !savingsPage.error && <p className="empty-statement">{savingsPage.filters.search || savingsPage.filters.from || savingsPage.filters.to ? 'No deposits match these filters.' : 'No savings deposits have been recorded yet.'}</p>}
              <StatementPagination label="savings deposits" page={savingsPage.page} pageSize={savingsPage.pageSize} total={savingsPage.total} loading={savingsPage.loading} onPageChange={(page) => changePage<SavingsTransaction>('savings', page, savingsPage.filters, setSavingsPage)} />
            </section>

            <section className="statement-section">
              <div className="statement-heading">
                <div><p className="section-kicker">BORROWING</p><h2>Loans taken</h2><span className="statement-total">{loansPage.loading ? 'Loading…' : `${loansPage.total} loans`}</span></div>
                <div className="statement-heading-actions">
                  <HandCoins size={19} aria-hidden="true" />
                  <StatementFilterPopover
                    label="loans"
                    filters={loansPage.filters}
                    onApply={(filters) => updateStatementFilter(setLoansPage, filters)}
                    statusOptions={[{ value: 'active', label: 'Active' }, { value: 'paid', label: 'Paid' }]}
                  />
                </div>
              </div>
              {loansPage.error && <p className="statement-error" role="alert">{loansPage.error}</p>}
              {loansPage.items.length ? (
                <div className="statement-list">
                  {loansPage.items.map((loan) => (
                    <article className="statement-row loan-statement-row" key={loan.reference}>
                      <div className="statement-icon loan-icon"><HandCoins size={16} /></div>
                      <div className="statement-details">
                        <strong>{loan.reference}</strong>
                        <span><CalendarDays size={13} /> {formatDate(loan.issuedAt)} · {loan.repaymentMonths} months · {loan.interestRate}% interest · Savings security · {loan.status}</span>
                        <div className="loan-progress" role="group" aria-label={`${loan.reference} repayment progress`}>
                          <div className="loan-progress-heading">
                            <span>Paid <AnimatedFigure value={loan.paidAmount} /> of <AnimatedFigure value={loan.totalRepayable} /></span>
                            <strong>{loan.totalRepayable > 0 ? Math.min(100, Math.round((loan.paidAmount / loan.totalRepayable) * 100)) : 0}%</strong>
                          </div>
                          <div
                            className="loan-progress-track"
                            role="progressbar"
                            aria-label={`${loan.reference} amount repaid`}
                            aria-valuemin={0}
                            aria-valuemax={loan.totalRepayable}
                            aria-valuenow={Math.min(loan.totalRepayable, loan.paidAmount)}
                          >
                            <span style={{ width: `${loan.totalRepayable > 0 ? Math.min(100, (loan.paidAmount / loan.totalRepayable) * 100) : 0}%` }} />
                          </div>
                          <small><AnimatedFigure value={loan.outstandingBalance} /> remaining</small>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : loansPage.loading ? <p className="empty-statement">Loading loan records…</p> : !loansPage.error && <p className="empty-statement">{loansPage.filters.search || loansPage.filters.from || loansPage.filters.to || loansPage.filters.status ? 'No loans match these filters.' : 'No loans have been issued to your account yet.'}</p>}
              <StatementPagination label="loans" page={loansPage.page} pageSize={loansPage.pageSize} total={loansPage.total} loading={loansPage.loading} onPageChange={(page) => changePage<MemberLoanRecord>('loans', page, loansPage.filters, setLoansPage)} />
            </section>
          </div>

          <section className="statement-section repayment-history-section">
            <div className="statement-heading">
              <div><p className="section-kicker">LOAN ACCOUNT ACTIVITY</p><h2>Loan repayment history</h2><span className="statement-total">{repaymentsPage.loading ? 'Loading…' : `${repaymentsPage.total} repayments`}</span></div>
              <div className="statement-heading-actions">
                <HandCoins size={19} aria-hidden="true" />
                <StatementFilterPopover label="repayments" filters={repaymentsPage.filters} onApply={(filters) => updateStatementFilter(setRepaymentsPage, filters)} searchPlaceholder="Description or loan reference" />
              </div>
            </div>
            {repaymentsPage.error && <p className="statement-error" role="alert">{repaymentsPage.error}</p>}
            {repaymentsPage.items.length ? (
              <div className="statement-list">
                {repaymentsPage.items.map((payment, index) => (
                  <article className="statement-row" key={`${payment.loanReference}-${payment.paidAt}-${index}`}>
                    <div className="statement-icon loan-icon"><HandCoins size={16} /></div>
                    <div className="statement-details">
                      <strong>{payment.description || 'Loan repayment'}</strong>
                      <span><CalendarDays size={13} /> {payment.loanReference} · {formatDate(payment.paidAt)}</span>
                    </div>
                    <strong className="statement-amount deposit">−<AnimatedFigure value={payment.amount} /></strong>
                  </article>
                ))}
              </div>
            ) : repaymentsPage.loading ? <p className="empty-statement">Loading repayment history…</p> : !repaymentsPage.error && <p className="empty-statement">{repaymentsPage.filters.search || repaymentsPage.filters.from || repaymentsPage.filters.to ? 'No repayments match these filters.' : 'No loan repayments have been recorded yet.'}</p>}
            <StatementPagination label="repayments" page={repaymentsPage.page} pageSize={repaymentsPage.pageSize} total={repaymentsPage.total} loading={repaymentsPage.loading} onPageChange={(page) => changePage<LoanRepayment>('repayments', page, repaymentsPage.filters, setRepaymentsPage)} />
          </section>
        </section>
      ) : view === 'apply-loan' ? (
        <section className="dashboard-content application-content">
          <button type="button" className="back-link" onClick={() => setView('overview')}>
            <ArrowLeft size={17} /> Back to overview
          </button>
          <div className="dashboard-intro">
            <p className="dashboard-kicker">LOAN SERVICES</p>
            <h1>Apply for a loan</h1>
            <p>Send a request to the SACCO for review.</p>
          </div>
          <div className="loan-capacity-card">
            <div className="loan-capacity-main">
              <span>Available to borrow</span>
              <strong><AnimatedFigure value={dashboard.borrowingCapacity.availableBalance} /></strong>
              <small>Maximum principal currently available for a new loan.</small>
            </div>
            <div className="loan-capacity-breakdown">
              <div><span>Total savings</span><strong><AnimatedFigure value={dashboard.borrowingCapacity.savingsBalance} /></strong></div>
              <span className="capacity-operator">−</span>
              <div><span>Active loan balances</span><strong><AnimatedFigure value={dashboard.borrowingCapacity.activeLoanBalance} /></strong></div>
              {dashboard.borrowingCapacity.pendingApplications > 0 && (
                <>
                  <span className="capacity-operator">−</span>
                  <div><span>Pending applications reserved</span><strong><AnimatedFigure value={dashboard.borrowingCapacity.pendingApplications} /></strong></div>
                </>
              )}
            </div>
            <small className="loan-capacity-footnote">Available balance is recalculated when you submit. Loan funds and savings remain separate accounts.</small>
          </div>
          <form className="loan-application-form" onSubmit={onLoanApplication}>
            <div className="loan-security-note"><span>Savings</span><strong>Required loan security</strong><small>Member savings are the only security accepted for SACCO loans.</small></div>
            <fieldset className="loan-payout-accounts" disabled={!bankAccounts.length}>
              <legend>Where should we deposit the loan?</legend>
              {bankAccounts.map((account) => (
                <label className="loan-payout-account" key={account.id}>
                  <input
                    type="radio"
                    name="payoutAccount"
                    value={account.id}
                    checked={payoutAccount === account.id}
                    onChange={() => setPayoutAccount(account.id)}
                    required
                  />
                  <span><strong>{account.bankName}</strong>{account.branch && <small>{account.branch}</small>}</span>
                  <small>{account.accountName}{account.accountName ? ' · ' : ''}{account.accountNumber}</small>
                </label>
              ))}
              {!bankAccounts.length && <p className="form-message error">Add a bank name and account number to your member profile before applying.</p>}
            </fieldset>
            <label htmlFor="loan-amount">Amount requested</label>
            <div className="amount-input-wrap"><span>KES</span><input id="loan-amount" name="requestedAmount" type="number" min="1" max={dashboard.borrowingCapacity.availableBalance} step="1" value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)} required /></div>
            <label htmlFor="repayment-months">Repayment period</label>
            <div className="months-input-wrap"><input id="repayment-months" name="repaymentMonths" type="number" min="1" max="120" step="1" value={repaymentMonths} onChange={(event) => setRepaymentMonths(event.target.value)} required /><span>months</span></div>
            <div className="loan-estimate">
              <span>Flat interest rate</span><strong>10%</strong>
              <span>Estimated total repayment</span><strong><AnimatedFigure value={Number(loanAmount || 0) * 1.1} /></strong>
              <span>Estimated monthly payment</span><strong><AnimatedFigure value={Number(loanAmount || 0) * 1.1 / Math.max(1, Number(repaymentMonths) || 1)} /></strong>
              <small>Your request cannot exceed the available balance shown above. Final approval is subject to SACCO review.</small>
            </div>
            <label htmlFor="loan-purpose">Purpose of the loan</label>
            <textarea id="loan-purpose" name="purpose" rows={4} maxLength={500} value={loanPurpose} onChange={(event) => setLoanPurpose(event.target.value)} placeholder="Briefly tell us what the loan is for" required />
            <label className="loan-electronic-consent">
              <input type="checkbox" name="electronicSignature" required />
              <span>I agree to use my typed name as my electronic signature for this loan application.</span>
            </label>
            {loanMessage && <p className={`form-message ${loanMessageSuccess ? 'success' : 'error'}`} role="status">{loanMessage}</p>}
            <button className="submit-button" type="submit" disabled={loanSubmitting || !bankAccounts.length}>
              <span>{loanSubmitting ? 'Submitting…' : 'Submit application'}</span>
              {!loanSubmitting && <ArrowRight size={18} />}
            </button>
          </form>
        </section>
      ) : view === 'contacts' ? (
        <MemberContactsPage />
      ) : view === 'terms' ? (
        <MemberTermsPage />
      ) : (
        <section className="dashboard-content application-content">
          <div className="application-status-actions">
            <button type="button" className="back-link" onClick={() => setView('overview')}>
              <ArrowLeft size={17} /> Back to overview
            </button>
            <button type="button" className="back-link" onClick={() => setView('apply-loan')}>
              <HandCoins size={17} /> Apply for a loan
            </button>
          </div>
          <LoanApplicationStatus />
        </section>
      )}
    </main>
  )
}
