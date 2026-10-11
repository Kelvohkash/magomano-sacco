import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Landmark,
  Pencil,
  Printer,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'
import { currency, formatDate } from '../format'
import type { AdminLoanApplication, AdminMember } from '../types'

interface LoanDocumentModalProps {
  application: AdminLoanApplication
  member?: AdminMember
  signatories: AdminMember[]
  isEditing: boolean
  setIsEditing: (editing: boolean) => void
  applicationForm: { requestedAmount: string; repaymentMonths: string; purpose: string }
  setApplicationForm: Dispatch<SetStateAction<{ requestedAmount: string; repaymentMonths: string; purpose: string }>>
  onSaveApplication: (e: FormEvent<HTMLFormElement>) => Promise<void>
  saving: boolean
  onClose: () => void
  onApprove?: () => void
  onReject?: () => void
  isActionLoading?: boolean
}

export function LoanDocumentModal({
  application,
  member,
  signatories,
  isEditing,
  setIsEditing,
  applicationForm,
  setApplicationForm,
  onSaveApplication,
  saving,
  onClose,
  onApprove,
  onReject,
  isActionLoading = false,
}: LoanDocumentModalProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  // Calculations
  const requestedAmount = application.requestedAmount
  const repaymentMonths = Math.max(1, application.repaymentMonths)
  const interestRate = 0.1 // 10% flat
  const totalInterest = requestedAmount * interestRate
  const totalRepayable = requestedAmount * (1 + interestRate)
  const monthlyInstallment = totalRepayable / repaymentMonths
  const appNumber = String(application.id).padStart(5, '0')
  const refCode = `MAG-LN-${new Date(application.appliedAt).getFullYear()}-${appNumber}`

  async function handlePrint() {
    setIsPrinting(true)
    const originalTitle = document.title
    const safeName = (application.fullName || 'Member').trim().replace(/[^a-zA-Z0-9_-]/g, '_')
    document.title = `Loan_Application_${appNumber}_${safeName}`

    try {
      // Attempt to load the script signature font
      try {
        await document.fonts.load('700 28pt "Dancing Script"')
      } catch {
        // Fallback gracefully
      }
      window.print()
    } finally {
      setIsPrinting(false)
      // Restore title after print dialog closes
      setTimeout(() => {
        document.title = originalTitle
      }, 500)
    }
  }

  return (
    <div
      className="loan-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loan-modal-title"
    >
      <div className="loan-modal-container">
        {/* Top Control Bar (Screen only, hidden on print) */}
        <header className="loan-modal-toolbar">
          <div className="loan-modal-toolbar-meta">
            <div className="loan-modal-ref-pill">
              <span className="ref-prefix">FACILITY APPLICATION</span>
              <strong className="ref-number">#{appNumber}</strong>
            </div>
            <div className="loan-modal-applicant">
              <h2 id="loan-modal-title">{application.fullName}</h2>
              <span className="applicant-id">ID: {application.nationalId}</span>
            </div>
            <span className={`loan-status-pill status-${application.status}`}>
              {application.status === 'approved' && <CheckCircle2 size={13} />}
              {application.status === 'pending' && <Clock size={13} />}
              {application.status === 'rejected' && <XCircle size={13} />}
              <span>{application.status.toUpperCase()}</span>
            </span>
          </div>

          <div className="loan-modal-actions">
            {!isEditing && (
              <>
                {application.status === 'pending' && onApprove && (
                  <button
                    type="button"
                    className="action-btn-approve"
                    onClick={onApprove}
                    disabled={isActionLoading}
                    title="Approve and issue this loan"
                  >
                    <Check size={15} />
                    <span>Approve & Issue</span>
                  </button>
                )}

                {application.status === 'pending' && onReject && (
                  <button
                    type="button"
                    className="action-btn-reject"
                    onClick={onReject}
                    disabled={isActionLoading}
                    title="Reject this application"
                  >
                    <X size={15} />
                    <span>Reject</span>
                  </button>
                )}

                {application.status === 'pending' && (
                  <button
                    type="button"
                    className="action-btn-edit"
                    onClick={() => setIsEditing(true)}
                    title="Edit requested amount or terms"
                  >
                    <Pencil size={14} />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  type="button"
                  className="action-btn-print"
                  onClick={() => void handlePrint()}
                  disabled={isPrinting}
                  title="Print or save as high-resolution PDF"
                >
                  <Printer size={15} />
                  <span>{isPrinting ? 'Preparing PDF…' : 'Print / Export PDF'}</span>
                </button>
              </>
            )}

            {isEditing && (
              <button
                type="button"
                className="action-btn-view"
                onClick={() => setIsEditing(false)}
              >
                <span>View Document</span>
              </button>
            )}

            <button
              type="button"
              className="action-btn-close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="loan-modal-body">
          {isEditing ? (
            <div className="loan-edit-card">
              <div className="loan-edit-header">
                <h3>Edit Loan Facility Terms</h3>
                <p>Modify the requested principal, repayment duration, or purpose before approval.</p>
              </div>
              <form className="loan-edit-form" onSubmit={onSaveApplication}>
                <div className="loan-edit-grid">
                  <div className="edit-field">
                    <label htmlFor="edit-requested-amount">Requested Principal Amount (KES)</label>
                    <div className="amount-input-wrap">
                      <span>KES</span>
                      <input
                        id="edit-requested-amount"
                        type="number"
                        min="1"
                        max="10000000"
                        step="1"
                        value={applicationForm.requestedAmount}
                        onChange={(e) =>
                          setApplicationForm((c) => ({ ...c, requestedAmount: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="edit-field">
                    <label htmlFor="edit-repayment-months">Repayment Term (Months)</label>
                    <input
                      id="edit-repayment-months"
                      type="number"
                      min="1"
                      max="120"
                      step="1"
                      value={applicationForm.repaymentMonths}
                      onChange={(e) =>
                        setApplicationForm((c) => ({ ...c, repaymentMonths: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="edit-field full-width">
                    <label htmlFor="edit-purpose">Stated Loan Purpose</label>
                    <textarea
                      id="edit-purpose"
                      rows={4}
                      minLength={3}
                      maxLength={500}
                      value={applicationForm.purpose}
                      onChange={(e) =>
                        setApplicationForm((c) => ({ ...c, purpose: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="loan-edit-actions">
                  <button
                    type="button"
                    className="action-btn-cancel"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="submit-button" disabled={saving}>
                    <span>{saving ? 'Saving changes…' : 'Save Application Changes'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Authentic Printable A4 Document Sheet */
            <div className="loan-sheet-wrapper">
              <article className="official-loan-document" id="printable-loan-document">
                {/* 1. Official SACCO Letterhead */}
                <header className="doc-letterhead">
                  <div className="doc-brand-block">
                    <div className="doc-crest-icon">
                      <Landmark size={28} strokeWidth={2.2} />
                    </div>
                    <div className="doc-org-text">
                      <h1 className="doc-org-name">MAGOMANO SAVINGS &amp; CREDIT CO-OPERATIVE</h1>
                      <p className="doc-org-sub">SOCIETY LIMITED · REG. NO. CS/12849</p>
                      <p className="doc-org-address">
                        Head Office: P.O. Box 482-00100 Nairobi, Kenya · Tel: +254 700 000 000 · Email: info@magomanosacco.co.ke
                      </p>
                    </div>
                  </div>

                  <div className="doc-badge-block">
                    <div className="doc-ref-box">
                      <span className="ref-label">DOCUMENT REF</span>
                      <strong className="ref-code">{refCode}</strong>
                    </div>
                    <div className="doc-date-box">
                      <span className="date-label">DATE SUBMITTED</span>
                      <span className="date-val">{formatDate(application.appliedAt)}</span>
                    </div>
                  </div>
                </header>

                <div className="doc-banner-strip">
                  <span className="banner-title">LOAN APPLICATION &amp; FACILITY AGREEMENT</span>
                  <span className={`banner-status banner-status-${application.status}`}>
                    STATUS: {application.status.toUpperCase()}
                  </span>
                </div>

                {/* 2. Member & Account Identification */}
                <section className="doc-section doc-section-member">
                  <div className="doc-sec-header">
                    <span className="sec-num">SECTION 01</span>
                    <h3 className="sec-title">Member &amp; Disbursement Particulars</h3>
                  </div>

                  <div className="doc-grid doc-grid-member">
                    <div className="doc-cell">
                      <span className="cell-label">Full Legal Name</span>
                      <strong className="cell-val primary-text">{application.fullName}</strong>
                    </div>

                    <div className="doc-cell">
                      <span className="cell-label">National Identity No.</span>
                      <strong className="cell-val">{application.nationalId}</strong>
                    </div>

                    <div className="doc-cell">
                      <span className="cell-label">Mobile Phone</span>
                      <span className="cell-val">{member?.phoneNumber || '—'}</span>
                    </div>

                    <div className="doc-cell">
                      <span className="cell-label">Email Address</span>
                      <span className="cell-val">{member?.email || '—'}</span>
                    </div>

                    <div className="doc-cell">
                      <span className="cell-label">County &amp; Location</span>
                      <span className="cell-val">
                        {[member?.location, member?.subCounty, member?.county]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </span>
                    </div>

                    <div className="doc-cell highlight-cell">
                      <span className="cell-label">Current Savings (Security Base)</span>
                      <strong className="cell-val highlight-val">
                        {member ? currency.format(member.savingsBalance) : '—'}
                      </strong>
                    </div>

                    <div className="doc-cell span-2">
                      <span className="cell-label">Disbursement Bank &amp; Branch</span>
                      <span className="cell-val">
                        {application.payoutBankName
                          ? `${application.payoutBankName}${
                              application.payoutBankBranch ? ` (${application.payoutBankBranch})` : ''
                            }`
                          : 'Primary Registered Account'}
                      </span>
                    </div>

                    <div className="doc-cell span-2">
                      <span className="cell-label">Bank Account Holder &amp; No.</span>
                      <span className="cell-val">
                        {application.payoutAccountName || application.payoutAccountNumber
                          ? `${application.payoutAccountName || application.fullName} · A/C ${
                              application.payoutAccountNumber || '—'
                            }`
                          : 'To be disbursed to registered member bank account'}
                      </span>
                    </div>
                  </div>
                </section>

                {/* 3. Loan Facility Particulars */}
                <section className="doc-section doc-section-facility">
                  <div className="doc-sec-header">
                    <span className="sec-num">SECTION 02</span>
                    <h3 className="sec-title">Credit Facility Terms &amp; Repayment Schedule</h3>
                  </div>

                  <div className="doc-metric-cards">
                    <div className="metric-box principal-box">
                      <span className="m-label">PRINCIPAL REQUESTED</span>
                      <strong className="m-val">{currency.format(requestedAmount)}</strong>
                      <span className="m-note">Approved Facility Base</span>
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
                      <span className="calc-k">ESTIMATED MONTHLY INSTALLMENT:</span>
                      <strong className="calc-v">{currency.format(monthlyInstallment)} / mo</strong>
                    </div>
                    <div className="calc-item">
                      <span className="calc-k">PRIMARY COLLATERAL:</span>
                      <strong className="calc-v">Member Savings Lien &amp; Guarantee</strong>
                    </div>
                  </div>

                  <div className="doc-purpose-box">
                    <span className="purpose-title">STATED PURPOSE OF CREDIT FACILITY:</span>
                    <p className="purpose-body">“{application.purpose}”</p>
                  </div>
                </section>

                {/* 4. Member Legal Declaration & Signature */}
                <section className="doc-section doc-section-declaration">
                  <div className="doc-sec-header">
                    <span className="sec-num">SECTION 03</span>
                    <h3 className="sec-title">Member Binding Declaration &amp; Electronic Signature</h3>
                  </div>

                  <div className="doc-declaration-wrapper">
                    <p className="declaration-legal-text">
                      I hereby declare and affirm that the information provided in this application is true, accurate, and complete.
                      I irrevocably authorize Magomano SACCO to recover any outstanding loan installments directly from my savings,
                      bank deposits, or remuneration in accordance with the Co-operative Societies Act and SACCO By-laws.
                      I confirm that my accumulated member savings constitute valid security for this facility.
                    </p>

                    <div className="declaration-signature-card">
                      <div className="signature-header">
                        <span className="sig-type">MEMBER ELECTRONIC SIGNATURE</span>
                        <span className="sig-auth">
                          <ShieldCheck size={13} /> Consent Verified
                        </span>
                      </div>
                      <div className="signature-display">
                        <span className="dancing-signature">
                          {application.electronicSignatureName || application.fullName}
                        </span>
                      </div>
                      <div className="signature-meta">
                        <span className="sig-name">{application.fullName}</span>
                        <span className="sig-date">
                          Executed:{' '}
                          {application.electronicallySignedAt
                            ? formatDate(application.electronicallySignedAt)
                            : formatDate(application.appliedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 5. SACCO Credit Committee Signatories */}
                <section className="doc-section doc-section-signatories">
                  <div className="doc-sec-header">
                    <span className="sec-num">SECTION 04</span>
                    <h3 className="sec-title">SACCO Credit Committee Authorization &amp; Endorsement</h3>
                    <span className="sec-tag">Official Governance Sign-off</span>
                  </div>

                  <div className="doc-signatories-grid">
                    {signatories.slice(0, 3).map((signatory) => (
                      <div className="signatory-block" key={signatory.id}>
                        <div className="signatory-title-row">
                          <strong>{signatory.fullName}</strong>
                          <span className="signatory-role">Authorized Signatory</span>
                        </div>
                        <div className="sign-line-wrap">
                          <div className="sign-line" />
                          <span className="sign-label">Signature</span>
                        </div>
                        <div className="date-line-wrap">
                          <div className="date-line" />
                          <span className="date-label">Date</span>
                        </div>
                      </div>
                    ))}

                    {/* Official Stamp Box */}
                    <div className="sacco-official-stamp-box">
                      <div className="stamp-circle">
                        <span className="stamp-org">MAGOMANO SACCO</span>
                        <span className="stamp-star">★ ★ ★</span>
                        <span className="stamp-dept">CREDIT COMMITTEE</span>
                        <span className="stamp-status">
                          {application.status === 'approved' ? 'APPROVED' : 'OFFICIAL SEAL'}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 6. Document Footer & Anti-Fraud Barcode */}
                <footer className="doc-footer">
                  <div className="doc-footer-left">
                    <div className="barcode-line">
                      <span>||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||</span>
                    </div>
                    <span className="doc-footer-audit">
                      Security Hash: {refCode} · Generated by Magomano SACCO Core Financial System
                    </span>
                  </div>
                  <div className="doc-footer-right">
                    <span>Confidential Financial Record · Page 1 of 1</span>
                  </div>
                </footer>
              </article>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
