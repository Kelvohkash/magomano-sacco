import { useState, type Dispatch, type FormEventHandler, type SetStateAction } from 'react'
import { Check, CheckCircle2, Clock, Pencil, Printer, X, XCircle } from 'lucide-react'
import type { AdminLoanApplication, AdminMember } from '../../../types'
import { LoanEditForm } from './LoanEditForm'
import { LoanDocumentSheet } from './LoanDocumentSheet'

export interface LoanDocumentModalProps {
  application: AdminLoanApplication
  member?: AdminMember
  signatories: AdminMember[]
  isEditing: boolean
  setIsEditing: (editing: boolean) => void
  applicationForm: {
    requestedAmount: string
    repaymentMonths: string
    purpose: string
  }
  setApplicationForm: Dispatch<
    SetStateAction<{
      requestedAmount: string
      repaymentMonths: string
      purpose: string
    }>
  >
  onSaveApplication: FormEventHandler<HTMLFormElement>
  saving: boolean
  onClose: () => void
  onApprove?: (chequeNumber: string) => void
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
  isActionLoading,
}: LoanDocumentModalProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [hashVerification, setHashVerification] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')

  const requestedAmount = Number(application.requestedAmount) || 0
  const repaymentMonths = Number(application.repaymentMonths) || 1
  const interestRate = 0.1
  const totalInterest = requestedAmount * interestRate
  const totalRepayable = requestedAmount + totalInterest
  const monthlyInstallment = repaymentMonths > 0 ? totalRepayable / repaymentMonths : totalRepayable

  const appNumber = String(application.id).padStart(5, '0')
  const refCode = `MAG-LN-2026-${appNumber}`

  async function verifyHash() {
    setHashVerification('Verifying…')
    try {
      const response = await fetch(`/api/admin/loan-applications/${application.id}/verify-hash`, { method: 'POST' })
      const result = await response.json() as { valid?: boolean; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Verification failed.')
      setHashVerification(result.valid ? 'Hash verified. Application details match the signed record.' : 'Hash mismatch. Application details may have changed.')
    } catch (error) { setHashVerification(error instanceof Error ? error.message : 'Verification failed.') }
  }

  async function handlePrint() {
    setIsPrinting(true)
    const originalTitle = document.title
    try {
      const sanitizedName = application.fullName.trim().replace(/\s+/g, '_')
      document.title = `Loan_Application_${appNumber}_${sanitizedName}`
      await new Promise((resolve) => setTimeout(resolve, 80))
      window.print()
    } finally {
      document.title = originalTitle
      setIsPrinting(false)
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
        {/* Top Control Bar */}
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
              {['approved', 'disbursed'].includes(application.status) && <CheckCircle2 size={13} />}
              {application.status === 'pending' && <Clock size={13} />}
              {application.status === 'rejected' && <XCircle size={13} />}
              <span>{application.status === 'approved' ? 'APPROVED · AWAITING DISBURSEMENT' : application.status.toUpperCase()}</span>
            </span>
          </div>

          <div className="loan-modal-actions">
            <button type="button" className="action-btn-edit" onClick={() => void verifyHash()}>Verify security hash</button>
            {!isEditing && (
              <>
                {application.status === 'pending' && onApprove && (
                  <button
                    type="button"
                    className="action-btn-approve"
                    onClick={() => onApprove(chequeNumber.trim())}
                    disabled={isActionLoading || !chequeNumber.trim()}
                    title="Approve this application; disbursement is a separate step"
                  >
                    <Check size={15} />
                    <span>Approve application</span>
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
        {hashVerification && <div className="admin-banner-alert" role="status">{hashVerification}</div>}

        {application.status === 'pending' && !isEditing && (
          <div className="loan-modal-cheque-entry">
            <label htmlFor="loan-cheque-number">Cheque number (required before approval)</label>
            <input
              id="loan-cheque-number"
              value={chequeNumber}
              onChange={(event) => setChequeNumber(event.target.value)}
              maxLength={50}
              required
              autoComplete="off"
            />
          </div>
        )}

        {!isEditing && (
          <div className="loan-modal-scroll-hint">
            <span>↔ Pan &amp; scroll to inspect the full A4 agreement</span>
          </div>
        )}

        {/* Content Area */}
        <div className="loan-modal-body">
          {isEditing ? (
            <LoanEditForm
              applicationForm={applicationForm}
              setApplicationForm={setApplicationForm}
              onSaveApplication={onSaveApplication}
              saving={saving}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <LoanDocumentSheet
              application={application}
              member={member}
              signatories={signatories}
              refCode={refCode}
              requestedAmount={requestedAmount}
              repaymentMonths={repaymentMonths}
              totalInterest={totalInterest}
              totalRepayable={totalRepayable}
              monthlyInstallment={monthlyInstallment}
            />
          )}
        </div>
      </div>
    </div>
  )
}
