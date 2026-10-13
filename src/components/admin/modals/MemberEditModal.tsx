import type { Dispatch, FormEventHandler, SetStateAction } from 'react'
import { ArrowRight, X } from 'lucide-react'
import type { AdminMember, MemberProfileUpdate } from '../../../types'

interface MemberEditModalProps {
  member: AdminMember
  memberForm: MemberProfileUpdate
  setMemberForm: Dispatch<SetStateAction<MemberProfileUpdate>>
  onSave: FormEventHandler<HTMLFormElement>
  onClose: () => void
  saving: boolean
  isReviewing: boolean
}

export function MemberEditModal({
  member,
  memberForm,
  setMemberForm,
  onSave,
  onClose,
  saving,
  isReviewing,
}: MemberEditModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-dialog-card">
        <div className="modal-dialog-header">
          <div>
            <span className="modal-kicker">MEMBER PROFILE MANAGEMENT</span>
            <h2>Edit {member.fullName} Profile</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form className="modal-form-content" onSubmit={onSave}>
          <div className="form-section-card">
            <span className="form-sec-heading">Personal Information</span>
            <div className="form-fields-grid">
              <label>
                SACCO Member Number
                <input
                  value={memberForm.saccoNumber}
                  onChange={(e) => setMemberForm((c) => ({ ...c, saccoNumber: e.target.value.toUpperCase() }))}
                  placeholder="A/005"
                  maxLength={20}
                />
              </label>
              <label>
                National ID
                <input
                  value={memberForm.nationalId}
                  onChange={(e) => setMemberForm((c) => ({ ...c, nationalId: e.target.value.trim() }))}
                  inputMode="numeric"
                  maxLength={12}
                />
              </label>
              <label>
                Full Legal Name
                <input
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm((c) => ({ ...c, fullName: e.target.value }))}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Phone Number
                <input
                  type="tel"
                  value={memberForm.phoneNumber}
                  onChange={(e) => setMemberForm((c) => ({ ...c, phoneNumber: e.target.value }))}
                  maxLength={32}
                />
              </label>
              <label>
                Email Address
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm((c) => ({ ...c, email: e.target.value }))}
                  maxLength={254}
                />
              </label>
              <label>
                Marital Status
                <select
                  value={memberForm.maritalStatus}
                  onChange={(e) =>
                    setMemberForm((c) => ({
                      ...c,
                      maritalStatus: e.target.value as MemberProfileUpdate['maritalStatus'],
                    }))
                  }
                >
                  <option value="">Not provided</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
          </div>

          <div className="form-section-card">
            <span className="form-sec-heading">Location &amp; Residence</span>
            <div className="form-fields-grid">
              <label>
                County
                <input
                  value={memberForm.county}
                  onChange={(e) => setMemberForm((c) => ({ ...c, county: e.target.value }))}
                  maxLength={100}
                />
              </label>
              <label>
                Sub-county / Ward
                <input
                  value={memberForm.subCounty}
                  onChange={(e) => setMemberForm((c) => ({ ...c, subCounty: e.target.value }))}
                  maxLength={100}
                />
              </label>
              <label className="span-2">
                Physical Location / Town
                <input
                  value={memberForm.location}
                  onChange={(e) => setMemberForm((c) => ({ ...c, location: e.target.value }))}
                  maxLength={160}
                />
              </label>
            </div>
          </div>

          <div className="form-section-card">
            <span className="form-sec-heading">Primary Bank Account (For Loan Payouts)</span>
            <div className="form-fields-grid">
              <label>
                Bank Name
                <input
                  value={memberForm.bankName}
                  onChange={(e) => setMemberForm((c) => ({ ...c, bankName: e.target.value }))}
                  maxLength={100}
                />
              </label>
              <label>
                Branch
                <input
                  value={memberForm.bankBranch}
                  onChange={(e) => setMemberForm((c) => ({ ...c, bankBranch: e.target.value }))}
                  maxLength={100}
                />
              </label>
              <label>
                Account Holder Name
                <input
                  value={memberForm.bankAccountName}
                  onChange={(e) => setMemberForm((c) => ({ ...c, bankAccountName: e.target.value }))}
                  maxLength={100}
                />
              </label>
              <label>
                Account Number
                <input
                  value={memberForm.bankAccountNumber}
                  onChange={(e) => setMemberForm((c) => ({ ...c, bankAccountNumber: e.target.value }))}
                  maxLength={50}
                />
              </label>
            </div>
          </div>

          <div className="form-section-card">
            <span className="form-sec-heading">Secondary Bank Account (Optional)</span>
            <div className="form-fields-grid">
              <label>
                Bank Name
                <input
                  value={memberForm.bankTwoName}
                  onChange={(e) => setMemberForm((c) => ({ ...c, bankTwoName: e.target.value }))}
                  maxLength={100}
                />
              </label>
              <label>
                Branch
                <input
                  value={memberForm.bankTwoBranch}
                  onChange={(e) => setMemberForm((c) => ({ ...c, bankTwoBranch: e.target.value }))}
                  maxLength={100}
                />
              </label>
              <label>
                Account Holder
                <input
                  value={memberForm.bankTwoAccountName}
                  onChange={(e) => setMemberForm((c) => ({ ...c, bankTwoAccountName: e.target.value }))}
                  maxLength={100}
                />
              </label>
              <label>
                Account Number
                <input
                  value={memberForm.bankTwoAccountNumber}
                  onChange={(e) => setMemberForm((c) => ({ ...c, bankTwoAccountNumber: e.target.value }))}
                  maxLength={50}
                />
              </label>
            </div>
          </div>

          <div className="form-section-card">
            <span className="form-sec-heading">Next of Kin Details</span>
            <div className="form-fields-grid">
              <label>
                Next-of-Kin Name
                <input
                  value={memberForm.nextKinName}
                  onChange={(e) => setMemberForm((c) => ({ ...c, nextKinName: e.target.value }))}
                  maxLength={100}
                />
              </label>
              <label>
                Relationship
                <input
                  value={memberForm.nextKinRelationship}
                  onChange={(e) => setMemberForm((c) => ({ ...c, nextKinRelationship: e.target.value }))}
                  maxLength={60}
                />
              </label>
              <label>
                Phone Number
                <input
                  type="tel"
                  value={memberForm.nextKinPhone}
                  onChange={(e) => setMemberForm((c) => ({ ...c, nextKinPhone: e.target.value }))}
                  maxLength={32}
                />
              </label>
            </div>
          </div>

          <div className="modal-actions-bar">
            <button type="button" className="action-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={saving || isReviewing}>
              <span>{saving ? 'Saving profile…' : 'Save Member Details'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

