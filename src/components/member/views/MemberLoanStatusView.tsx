import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, HandCoins, XCircle } from 'lucide-react'
import { AnimatedFigure } from '../../AnimatedFigure'
import { StatementFilterPopover } from '../../StatementFilterPopover'
import { formatDate } from '../../../format'
import type { MemberLoanApplication, MemberStatementPage, MemberView } from '../../../types'
import { StatementPagination } from '../StatementPagination'
import type { StatementState } from '../statementHelpers'
import { readJsonResponse, requestErrorMessage } from '../../../networkErrors'

interface MemberLoanStatusViewProps {
  setView: (view: MemberView) => void
}

function applicationStatus(status: MemberLoanApplication['status']) {
  if (status === 'approved') return { label: 'Approved & disbursed', Icon: CheckCircle2 }
  if (status === 'rejected') return { label: 'Not approved', Icon: XCircle }
  return { label: 'Received · under review', Icon: Clock3 }
}

export function MemberLoanStatusView({ setView }: MemberLoanStatusViewProps) {
  const [state, setState] = useState<StatementState<MemberLoanApplication>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    loading: true,
    error: '',
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
        const result = await readJsonResponse<MemberStatementPage<MemberLoanApplication> & { error?: string }>(response)
        if (!response.ok) throw new Error(result.error ?? 'Could not load your application history.')
        setState((current) => ({
          ...current,
          items: result.items,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          loading: false,
          error: '',
        }))
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setState((current) => ({
          ...current,
          loading: false,
          error: requestErrorMessage(cause, 'Could not load your application history.'),
        }))
      })

    return () => controller.abort()
  }, [state.page, state.filters])

  function changePage(page: number) {
    setState((current) => ({ ...current, page, loading: true }))
  }

  return (
    <section className="dashboard-content application-content">
      <div className="application-status-actions">
        <button type="button" className="back-link" onClick={() => setView('overview')}>
          <ArrowLeft size={17} /> Back to overview
        </button>
        <button type="button" className="back-link" onClick={() => setView('apply-loan')}>
          <HandCoins size={17} /> Apply for a loan
        </button>
      </div>

      <div className="dashboard-intro">
        <h1>Loan application status</h1>
      </div>

      <section className="statement-section application-status-section" aria-label="Loan application history">
        <div className="statement-heading">
          <div>
            <h2>Application history</h2>
            <span className="statement-total">
              {state.loading ? 'Loading…' : `${state.total} applications`}
            </span>
          </div>
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
                      <span className="application-date">
                        <CalendarDays size={14} /> Submitted {formatDate(application.appliedAt)}
                      </span>
                      <h3>
                        <AnimatedFigure value={application.requestedAmount} /> requested
                      </h3>
                    </div>
                    <span className={`application-status-badge ${application.status}`}>
                      <StatusIcon size={15} />
                      {status.label}
                    </span>
                  </div>
                  <p>
                    {application.repaymentMonths}-month repayment period <span aria-hidden="true">·</span> Savings security <span aria-hidden="true">·</span> {application.purpose}
                  </p>
                  {application.status === 'pending' && (
                    <small>Your application has been received and is waiting for admin review.</small>
                  )}
                  {application.status === 'approved' && (
                    <small>Your request was approved and the loan was issued.</small>
                  )}
                  {application.status === 'rejected' && (
                    <small>This request was not approved. Contact the sacco if you need more information.</small>
                  )}
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
        ) : state.loading ? (
          <p className="empty-statement">Loading applications…</p>
        ) : null}

        <StatementPagination
          label="loan applications"
          page={state.page}
          pageSize={state.pageSize}
          total={state.total}
          loading={state.loading}
          onPageChange={changePage}
        />
      </section>
    </section>
  )
}

