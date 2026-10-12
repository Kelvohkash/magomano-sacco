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
  isActionLoading,
}: LoanDocumentModalProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  const requestedAmount = Number(application.requestedAmount) || 0
  const repaymentMonths = Number(application.repaymentMonths) || 1
  const interestRate = 0.1
  const totalInterest = requestedAmount * interestRate
  const totalRepayable = requestedAmount + totalInterest
  const monthlyInstallment = repaymentMonths > 0 ? totalRepayable / repaymentMonths : totalRepayable

  const appNumber = String(application.id).padStart(5, '0')
  const refCode = `MAG-LN-2026-${appNumber}`

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
                    <span>Approve &amp; Issue</span>
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

