import { useState, type Dispatch, type FormEventHandler, type SetStateAction } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { AnimatedFigure } from '../../AnimatedFigure'
import type { DashboardData, MemberView } from '../../../types'

interface MemberLoanApplicationViewProps {
  dashboard: DashboardData
  setView: (view: MemberView) => void
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
}

export function MemberLoanApplicationView({
  dashboard,
  setView,
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
}: MemberLoanApplicationViewProps) {
  const bankAccounts = dashboard.member.bankAccounts
  const [payoutAccount, setPayoutAccount] = useState<'primary' | 'secondary'>(
    bankAccounts[0]?.id ?? 'primary',
  )

  return (
    <section className="dashboard-content application-content">
      <button type="button" className="back-link" onClick={() => setView('overview')}>
        <ArrowLeft size={17} /> Back to overview
      </button>

      <div className="dashboard-intro">
        <h1>Apply for a loan</h1>
      </div>

      <div className="loan-capacity-card">
        <div className="loan-capacity-main">
          <span>Available to borrow</span>
          <strong>
            <AnimatedFigure value={dashboard.borrowingCapacity.availableBalance} />
          </strong>
        </div>
        <div className="loan-capacity-breakdown">
          <div>
            <span>Total savings</span>
            <strong>
              <AnimatedFigure value={dashboard.borrowingCapacity.savingsBalance} />
            </strong>
          </div>
          <span className="capacity-operator">−</span>
          <div>
            <span>Active loan balances</span>
            <strong>
              <AnimatedFigure value={dashboard.borrowingCapacity.activeLoanBalance} />
            </strong>
          </div>
          {dashboard.borrowingCapacity.pendingApplications > 0 && (
            <>
              <span className="capacity-operator">−</span>
              <div>
                <span>Pending applications reserved</span>
                <strong>
                  <AnimatedFigure value={dashboard.borrowingCapacity.pendingApplications} />
                </strong>
              </div>
            </>
          )}
        </div>
      </div>

      <form className="loan-application-form" onSubmit={onLoanApplication}>

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
              <span>
                <strong>{account.bankName}</strong>
                {account.branch && <small>{account.branch}</small>}
              </span>
              <small>
                {account.accountName}
                {account.accountName ? ' · ' : ''}
                {account.accountNumber}
              </small>
            </label>
          ))}
          {!bankAccounts.length && (
            <p className="form-message error">
              Add a bank name and account number to your member profile before applying.
            </p>
          )}
        </fieldset>

        <label htmlFor="loan-amount">Amount requested</label>
        <div className="amount-input-wrap">
          <span>KES</span>
          <input
            id="loan-amount"
            name="requestedAmount"
            type="number"
            min="1"
            max={dashboard.borrowingCapacity.availableBalance}
            step="1"
            value={loanAmount}
            onChange={(event) => setLoanAmount(event.target.value)}
            required
          />
        </div>

        <label htmlFor="repayment-months">Repayment period</label>
        <div className="months-input-wrap">
          <input
            id="repayment-months"
            name="repaymentMonths"
            type="number"
            min="1"
            max="120"
            step="1"
            value={repaymentMonths}
            onChange={(event) => setRepaymentMonths(event.target.value)}
            required
          />
          <span>months</span>
        </div>

        <div className="loan-estimate">
          <span>Flat interest rate</span>
          <strong>10%</strong>
          <span>Estimated total repayment</span>
          <strong>
            <AnimatedFigure value={Number(loanAmount || 0) * 1.1} />
          </strong>
          <span>Estimated monthly payment</span>
          <strong>
            <AnimatedFigure value={(Number(loanAmount || 0) * 1.1) / Math.max(1, Number(repaymentMonths) || 1)} />
          </strong>
          <small>
            Your request cannot exceed the available balance shown above. Final approval is subject to SACCO review.
          </small>
        </div>

        <label htmlFor="loan-purpose">Purpose of the loan</label>
        <textarea
          id="loan-purpose"
          name="purpose"
          rows={4}
          maxLength={500}
          value={loanPurpose}
          onChange={(event) => setLoanPurpose(event.target.value)}
          placeholder="Briefly tell us what the loan is for"
          required
        />

        <label className="loan-electronic-consent">
          <input type="checkbox" name="electronicSignature" required />
          <span>I agree to use my typed name as my electronic signature for this loan application.</span>
        </label>

        {loanMessage && (
          <p className={`form-message ${loanMessageSuccess ? 'success' : 'error'}`} role="status">
            {loanMessage}
          </p>
        )}

        <button className="submit-button" type="submit" disabled={loanSubmitting || !bankAccounts.length}>
          <span>{loanSubmitting ? 'Submitting…' : 'Submit application'}</span>
          {!loanSubmitting && <ArrowRight size={18} />}
        </button>
      </form>
    </section>
  )
}

