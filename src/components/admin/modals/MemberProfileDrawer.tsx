import { Check, Pencil, ShieldCheck, Trash2, X } from 'lucide-react'
import { AnimatedFigure } from '../../AnimatedFigure'
import { currency, formatDate } from '../../../format'
import type { AdminMember } from '../../../types'

interface MemberProfileDrawerProps {
  member: AdminMember
  onClose: () => void
  onReviewMember: (memberId: number, decision: 'approve' | 'reject') => void
  onSetMemberRole: (memberId: number, role: AdminMember['memberRole']) => void
  onEditMember: (member: AdminMember) => void
  onDeleteMember: (member: AdminMember) => void
  reviewingId: string | null
}

export function MemberProfileDrawer({
  member,
  onClose,
  onReviewMember,
  onSetMemberRole,
  onEditMember,
  onDeleteMember,
  reviewingId,
}: MemberProfileDrawerProps) {
  const locationString = [member.location, member.subCounty, member.county]
    .filter(Boolean)
    .join(', ') || '—'

  return (
    <div className="member-details-drawer-backdrop" onClick={onClose}>
      <aside
        className="member-details-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Details for ${member.fullName}`}
      >
        <div className="drawer-header">
          <div className="drawer-member-title">
            <div className="drawer-avatar">
              {member.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2>{member.fullName}</h2>
              <span className="drawer-id">National ID: {member.nationalId}</span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Status & Role Badges */}
          <div className="drawer-badge-row">
            <span className={`status-tag status-${member.accountStatus}`}>
              {member.accountStatus.toUpperCase()}
            </span>
            <span className="role-tag">
              {member.isAdmin
                ? 'Administrator'
                : member.memberRole === 'signatory'
                  ? 'Authorized Signatory'
                  : 'Standard Member'}
            </span>
          </div>

          {/* Approval buttons if pending */}
          {member.accountStatus === 'pending' && (
            <div className="drawer-action-callout">
              <p>This member account is waiting for approval before sign-in is allowed.</p>
              <div className="callout-actions">
                <button
                  type="button"
                  className="table-btn-approve"
                  onClick={() => onReviewMember(member.id, 'approve')}
                  disabled={reviewingId === `member-${member.id}`}
                >
                  <Check size={14} /> Approve Account
                </button>
                <button
                  type="button"
                  className="table-btn-reject"
                  onClick={() => onReviewMember(member.id, 'reject')}
                  disabled={reviewingId === `member-${member.id}`}
                >
                  <X size={14} /> Reject
                </button>
              </div>
            </div>
          )}

          <div className="drawer-section">
            <h4>Financial Overview</h4>
            <div className="drawer-financial-summary">
              <div>
                <span>Total savings</span>
                <strong><AnimatedFigure value={member.savingsBalance} /></strong>
              </div>
              <div>
                <span>Active loan balance</span>
                <strong><AnimatedFigure value={member.activeLoanBalance} /></strong>
              </div>
              <div>
                <span>Available to borrow</span>
                <strong><AnimatedFigure value={member.availableBalance} /></strong>
              </div>
            </div>
            <div className="drawer-active-loans">
              <div className="drawer-active-loans-heading">
                <strong>Active loans ({member.activeLoans.length})</strong>
                <span>Total due: {currency.format(member.activeLoanBalance)}</span>
              </div>
              {member.activeLoans.length ? member.activeLoans.map((loan) => (
                <article className="drawer-active-loan" key={loan.id}>
                  <div>
                    <strong>Loan of {currency.format(loan.principalAmount)}</strong>
                    <small>{formatDate(loan.issuedAt)} · {loan.repaymentMonths} months</small>
                  </div>
                  <span>{currency.format(loan.outstandingBalance)} due</span>
                </article>
              )) : (
                <p className="drawer-no-active-loans">This member has no active loans.</p>
              )}
              {member.pendingLoanAmount > 0 && (
                <small className="drawer-pending-loans-note">
                  {currency.format(member.pendingLoanAmount)} in pending loan requests is included in the available balance.
                </small>
              )}
            </div>
          </div>

          {/* Section: Contacts */}
          <div className="drawer-section">
            <h4>Contact &amp; Location</h4>
            <dl className="drawer-dl">
              <div>
                <dt>Phone Number</dt>
                <dd>{member.phoneNumber || '—'}</dd>
              </div>
              <div>
                <dt>Email Address</dt>
                <dd>{member.email || '—'}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{locationString}</dd>
              </div>
              <div>
                <dt>Marital Status</dt>
                <dd>{member.maritalStatus || 'Not specified'}</dd>
              </div>
            </dl>
          </div>

          {/* Section: Bank Accounts */}
          <div className="drawer-section">
            <h4>Disbursement Banking Facilities</h4>
            <div className="drawer-bank-card">
              <strong>Primary Bank Account</strong>
              <p>
                {member.bankName || 'Not recorded'}
                {member.bankBranch ? ` (${member.bankBranch})` : ''}
              </p>
              <small>
                Holder: {member.bankAccountName || '—'} · A/C: {member.bankAccountNumber || '—'}
              </small>
            </div>
            {member.bankTwoName && (
              <div className="drawer-bank-card secondary">
                <strong>Secondary Bank Account</strong>
                <p>
                  {member.bankTwoName}
                  {member.bankTwoBranch ? ` (${member.bankTwoBranch})` : ''}
                </p>
                <small>
                  Holder: {member.bankTwoAccountName || '—'} · A/C: {member.bankTwoAccountNumber || '—'}
                </small>
              </div>
            )}
          </div>

          {/* Section: Next of Kin */}
          <div className="drawer-section">
            <h4>Next of Kin &amp; Emergency Contacts</h4>
            <dl className="drawer-dl">
              <div>
                <dt>Name</dt>
                <dd>{member.nextKinName || '—'}</dd>
              </div>
              <div>
                <dt>Relationship</dt>
                <dd>{member.nextKinRelationship || '—'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{member.nextKinPhone || '—'}</dd>
              </div>
            </dl>
            {member.contacts.length > 0 && (
              <div className="drawer-contacts-sublist">
                <span className="sublist-title">Registered Emergency Contacts:</span>
                <ul>
                  {member.contacts.map((c) => (
                    <li key={c.id}>
                      <strong>{c.fullName}</strong> ({c.relationship}) — {c.phoneNumber}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Section: Signatory Role Switch */}
          <div className="drawer-section">
            <h4>Governance &amp; Signatory Privileges</h4>
            <p className="privilege-note">
              Signatories are authorized to approve and sign official SACCO loan application agreements.
            </p>
            <div className="role-switch-pills">
              <button
                type="button"
                className={`role-pill-btn ${member.memberRole === 'member' ? 'active' : ''}`}
                onClick={() => onSetMemberRole(member.id, 'member')}
                disabled={reviewingId === `member-role-${member.id}`}
              >
                Standard Member
              </button>
              <button
                type="button"
                className={`role-pill-btn ${member.memberRole === 'signatory' ? 'active' : ''}`}
                onClick={() => onSetMemberRole(member.id, 'signatory')}
                disabled={reviewingId === `member-role-${member.id}`}
              >
                <ShieldCheck size={14} />
                Authorized Signatory
              </button>
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button
            type="button"
            className="drawer-edit-btn"
            onClick={() => onEditMember(member)}
          >
            <Pencil size={14} /> Edit Profile
          </button>
          <button
            type="button"
            className="drawer-delete-btn"
            onClick={() => onDeleteMember(member)}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </aside>
    </div>
  )
}

