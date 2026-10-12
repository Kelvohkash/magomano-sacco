import { currency } from '../../../format'
import type { AdminLoanApplication } from '../../../types'

interface DocFacilitySectionProps {
  application: AdminLoanApplication
  requestedAmount: number
  repaymentMonths: number
  totalInterest: number
  totalRepayable: number
  monthlyInstallment: number
}

export function DocFacilitySection({
  application,
  requestedAmount,
  repaymentMonths,
  totalInterest,
  totalRepayable,
  monthlyInstallment,
}: DocFacilitySectionProps) {
  return (
    <section className="doc-section doc-section-facility">
      <div className="doc-sec-header">
        <span className="sec-num">SECTION 02</span>
        <h3 className="sec-title">Loan amount &amp; Repayment Schedule</h3>
      </div>

      <div className="doc-metric-cards">
        <div className="metric-box principal-box">
          <span className="m-label">PRINCIPAL REQUESTED</span>
          <strong className="m-val">{currency.format(requestedAmount)}</strong>
          <span className="m-note">Approved Amount</span>
        </div>

        <div className="metric-box">
          <span className="m-label">REPAYMENT PERIOD</span>
          <strong className="m-val">{repaymentMonths} Months</strong>
          <span className="m-note">Equal Monthly Payments</span>
        </div>

        <div className="metric-box">
          <span className="m-label">INTEREST RATE</span>
          <strong className="m-val">10.0% Flat</strong>
          <span className="m-note">SACCO Regulated Rate</span>
        </div>

        <div className="metric-box highlight-box">
          <span className="m-label">TOTAL REPAYABLE</span>
          <strong className="m-val highlight-val">{currency.format(totalRepayable)}</strong>
          <span className="m-note">Includes Interest: {currency.format(totalInterest)}</span>
        </div>
      </div>

      <div className="doc-calc-row">
        <div className="calc-item">
          <span className="calc-k">MONTHLY INSTALLMENT:</span>
          <strong className="calc-v">{currency.format(monthlyInstallment)} / mo</strong>
        </div>
        <div className="calc-item">
          <span className="calc-k">LOAN SECURITY:</span>
          <strong className="calc-v">Member Savings</strong>
        </div>
      </div>

      <div className="doc-purpose-box">
        <span className="purpose-title">STATED PURPOSE OF LOAN:</span>
        <p className="purpose-body">“{application.purpose}”</p>
      </div>
    </section>
  )
}

