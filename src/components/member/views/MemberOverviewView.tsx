import type { Dispatch, SetStateAction } from 'react'
import { CalendarDays, HandCoins, Wallet } from 'lucide-react'
import { MemberWelcome } from '../MemberWelcome'
import { AnimatedFigure } from '../../AnimatedFigure'
import { StatementFilterPopover, type StatementFilterValues } from '../../StatementFilterPopover'
import { formatDate } from '../../../format'
import type { DashboardData, LoanRepayment, MemberLoanRecord, SavingsTransaction } from '../../../types'
import { StatementPagination } from '../StatementPagination'
import type { StatementState } from '../statementHelpers'

interface MemberOverviewViewProps {
  firstName: string
  dashboard: DashboardData
  savingsPage: StatementState<SavingsTransaction>
  setSavingsPage: Dispatch<SetStateAction<StatementState<SavingsTransaction>>>
  loansPage: StatementState<MemberLoanRecord>
  setLoansPage: Dispatch<SetStateAction<StatementState<MemberLoanRecord>>>
  repaymentsPage: StatementState<LoanRepayment>
  setRepaymentsPage: Dispatch<SetStateAction<StatementState<LoanRepayment>>>
  onPageChange: <T>(
    type: 'savings' | 'loans' | 'repayments',
    page: number,
    filters: StatementFilterValues,
    updateState: Dispatch<SetStateAction<StatementState<T>>>,
  ) => void
  onUpdateFilter: <T>(
    updateState: Dispatch<SetStateAction<StatementState<T>>>,
    filters: StatementFilterValues,
  ) => void
}

export function MemberOverviewView({
  firstName,
  dashboard,
  savingsPage,
  setSavingsPage,
  loansPage,
  setLoansPage,
  repaymentsPage,
  setRepaymentsPage,
  onPageChange,
  onUpdateFilter,
}: MemberOverviewViewProps) {
  return (
    <section className="dashboard-content">
      <div className="dashboard-intro">
        <p className="dashboard-kicker">MEMBER OVERVIEW</p>
        <MemberWelcome
          firstName={firstName}
          savingsBalance={dashboard.savings.balance}
          outstandingLoans={dashboard.loans.outstandingBalance}
        />
        <p>National ID · {dashboard.member.national_id}</p>
      </div>

      <section className="balance-grid" aria-label="Account totals">
        <article className="balance-panel savings-panel">
          <div className="balance-heading">
            <span><Wallet size={18} /></span>
            <p>Current savings</p>
          </div>
          <p className="balance-amount">
            <AnimatedFigure value={dashboard.savings.balance} />
          </p>
          <p className="balance-caption">Total savings balance</p>
        </article>
        <article className="balance-panel available-panel">
          <div className="balance-heading">
            <span><Wallet size={18} /></span>
            <p>Available to borrow</p>
          </div>
          <p className="balance-amount">
            <AnimatedFigure value={dashboard.borrowingCapacity.availableBalance} />
          </p>
          <p className="balance-caption">After active loan balances and pending requests</p>
        </article>
        <article className="balance-panel loans-panel">
          <div className="balance-heading">
            <span><HandCoins size={18} /></span>
            <p>Outstanding loans</p>
          </div>
          <p className="balance-amount">
            <AnimatedFigure value={dashboard.loans.outstandingBalance} />
          </p>
          <p className="balance-caption">Current loan balance</p>
        </article>
      </section>

      <div className="statement-grid">
        {/* Savings Statement */}
        <section className="statement-section">
          <div className="statement-heading">
            <div>
              <p className="section-kicker">ACCOUNT ACTIVITY</p>
              <h2>Savings statement</h2>
              <span className="statement-total">
                {savingsPage.loading ? 'Loading…' : `${savingsPage.total} deposits`}
              </span>
            </div>
            <div className="statement-heading-actions">
              <Wallet size={19} aria-hidden="true" />
              <StatementFilterPopover
                label="savings deposits"
                filters={savingsPage.filters}
                onApply={(filters) => onUpdateFilter(setSavingsPage, filters)}
              />
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
          ) : savingsPage.loading ? (
            <p className="empty-statement">Loading savings deposits…</p>
          ) : !savingsPage.error && (
            <p className="empty-statement">
              {savingsPage.filters.search || savingsPage.filters.from || savingsPage.filters.to
                ? 'No deposits match these filters.'
                : 'No savings deposits have been recorded yet.'}
            </p>
          )}
          <StatementPagination
            label="savings deposits"
            page={savingsPage.page}
            pageSize={savingsPage.pageSize}
            total={savingsPage.total}
            loading={savingsPage.loading}
            onPageChange={(page) =>
              onPageChange<SavingsTransaction>('savings', page, savingsPage.filters, setSavingsPage)
            }
          />
        </section>

        {/* Loans Taken */}
        <section className="statement-section">
          <div className="statement-heading">
            <div>
              <p className="section-kicker">BORROWING</p>
              <h2>Loans taken</h2>
              <span className="statement-total">
                {loansPage.loading ? 'Loading…' : `${loansPage.total} loans`}
              </span>
            </div>
            <div className="statement-heading-actions">
              <HandCoins size={19} aria-hidden="true" />
              <StatementFilterPopover
                label="loans"
                filters={loansPage.filters}
                onApply={(filters) => onUpdateFilter(setLoansPage, filters)}
                statusOptions={[
                  { value: 'active', label: 'Active' },
                  { value: 'paid', label: 'Paid' },
                ]}
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
                    <strong><AnimatedFigure value={loan.principalAmount} /></strong>
                    <span>
                      <CalendarDays size={13} /> {formatDate(loan.issuedAt)} · {loan.repaymentMonths} months · {loan.interestRate}% interest · Savings security · {loan.status}
                    </span>
                    <div className="loan-progress" role="group" aria-label={`Loan of ${loan.principalAmount} repayment progress`}>
                      <div className="loan-progress-heading">
                        <span>Paid <AnimatedFigure value={loan.paidAmount} /> of <AnimatedFigure value={loan.totalRepayable} /></span>
                        <strong>{loan.totalRepayable > 0 ? Math.min(100, Math.round((loan.paidAmount / loan.totalRepayable) * 100)) : 0}%</strong>
                      </div>
                      <div
                        className="loan-progress-track"
                        role="progressbar"
                        aria-label={`Loan of ${loan.principalAmount} amount repaid`}
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
          ) : loansPage.loading ? (
            <p className="empty-statement">Loading loan records…</p>
          ) : !loansPage.error && (
            <p className="empty-statement">
              {loansPage.filters.search || loansPage.filters.from || loansPage.filters.to || loansPage.filters.status
                ? 'No loans match these filters.'
                : 'No loans have been issued to your account yet.'}
            </p>
          )}
          <StatementPagination
            label="loans"
            page={loansPage.page}
            pageSize={loansPage.pageSize}
            total={loansPage.total}
            loading={loansPage.loading}
            onPageChange={(page) =>
              onPageChange<MemberLoanRecord>('loans', page, loansPage.filters, setLoansPage)
            }
          />
        </section>
      </div>

      {/* Loan Repayment History */}
      <section className="statement-section repayment-history-section">
        <div className="statement-heading">
          <div>
            <p className="section-kicker">LOAN ACCOUNT ACTIVITY</p>
            <h2>Loan repayment history</h2>
            <span className="statement-total">
              {repaymentsPage.loading ? 'Loading…' : `${repaymentsPage.total} repayments`}
            </span>
          </div>
          <div className="statement-heading-actions">
            <HandCoins size={19} aria-hidden="true" />
            <StatementFilterPopover
              label="repayments"
              filters={repaymentsPage.filters}
              onApply={(filters) => onUpdateFilter(setRepaymentsPage, filters)}
              searchPlaceholder="Description or loan reference"
            />
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
                  <span><CalendarDays size={13} /> Loan of <AnimatedFigure value={payment.loanAmount} /> · {formatDate(payment.paidAt)}</span>
                </div>
                <strong className="statement-amount deposit">−<AnimatedFigure value={payment.amount} /></strong>
              </article>
            ))}
          </div>
        ) : repaymentsPage.loading ? (
          <p className="empty-statement">Loading repayment history…</p>
        ) : !repaymentsPage.error && (
          <p className="empty-statement">
            {repaymentsPage.filters.search || repaymentsPage.filters.from || repaymentsPage.filters.to
              ? 'No repayments match these filters.'
              : 'No loan repayments have been recorded yet.'}
          </p>
        )}
        <StatementPagination
          label="repayments"
          page={repaymentsPage.page}
          pageSize={repaymentsPage.pageSize}
          total={repaymentsPage.total}
          loading={repaymentsPage.loading}
          onPageChange={(page) =>
            onPageChange<LoanRepayment>('repayments', page, repaymentsPage.filters, setRepaymentsPage)
          }
        />
      </section>
    </section>
  )
}

