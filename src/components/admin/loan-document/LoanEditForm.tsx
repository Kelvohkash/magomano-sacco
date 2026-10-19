import type { FormEventHandler } from 'react'
import { ArrowRight } from 'lucide-react'

interface LoanEditFormProps {
  applicationForm: {
    requestedAmount: string
    repaymentMonths: string
    purpose: string
  }
  setApplicationForm: React.Dispatch<
    React.SetStateAction<{
      requestedAmount: string
      repaymentMonths: string
      purpose: string
    }>
  >
  onSaveApplication: FormEventHandler<HTMLFormElement>
  saving: boolean
  onCancel: () => void
}

export function LoanEditForm({
  applicationForm,
  setApplicationForm,
  onSaveApplication,
  saving,
  onCancel,
}: LoanEditFormProps) {
  return (
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
                min="2000"
                step="100"
                value={applicationForm.requestedAmount}
                onChange={(e) =>
                  setApplicationForm((c) => ({ ...c, requestedAmount: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="edit-field">
            <label htmlFor="edit-repayment-months">Repayment Duration (Months)</label>
            <input
              id="edit-repayment-months"
              type="number"
              min="1"
              max="60"
              value={applicationForm.repaymentMonths}
              onChange={(e) =>
                setApplicationForm((c) => ({ ...c, repaymentMonths: e.target.value }))
              }
              required
            />
          </div>

          <div className="edit-field span-full">
            <label htmlFor="edit-purpose">Stated Loan Purpose / Facility Notes</label>
            <textarea
              id="edit-purpose"
              rows={3}
              value={applicationForm.purpose}
              onChange={(e) =>
                setApplicationForm((c) => ({ ...c, purpose: e.target.value }))
              }
              required
            />
          </div>
        </div>

        <div className="loan-edit-actions">
          <button type="button" className="action-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="submit-button" disabled={saving}>
            <span>{saving ? 'Saving changes…' : 'Save Application Changes'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
