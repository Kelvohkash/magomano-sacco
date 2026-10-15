import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import {
  AlertTriangle,
  Check,
  Clock,
  Eye,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  UserPlus,
  X,
  FileText,
  Plus,
} from 'lucide-react'
import { RowActionDropdown } from '../RowActionDropdown'
import { AnimatedFigure } from '../../AnimatedFigure'
import { TerminationOverviewModal } from '../TerminationOverviewModal'
import type { AdminMember, AdminMemberCreate } from '../../../types'

interface AdminMembersViewProps {
  members: AdminMember[]
  filteredMembers: AdminMember[]
  memberSearch: string
  setMemberSearch: Dispatch<SetStateAction<string>>
  memberFilter: 'all' | 'pending' | 'approved' | 'signatory' | 'admin'
  setMemberFilter: Dispatch<SetStateAction<'all' | 'pending' | 'approved' | 'signatory' | 'admin'>>
  pendingMembersCount: number
  approvedMembersCount: number
  signatoriesCount: number
  viewingMemberId: number | null
  setViewingMemberId: (id: number | null) => void
  beginMemberEdit: (member: AdminMember) => void
  onReviewMember: (memberId: number, decision: 'approve' | 'reject') => void
  removeMember: (member: AdminMember) => Promise<void>
  onCreateMember: (input: AdminMemberCreate) => Promise<boolean>
  reviewingId: string | null
  onRefresh: () => Promise<void>
}

export function AdminMembersView({
  members,
  filteredMembers,
  memberSearch,
  setMemberSearch,
  memberFilter,
  setMemberFilter,
  pendingMembersCount,
  approvedMembersCount,
  signatoriesCount,
  viewingMemberId,
  setViewingMemberId,
  beginMemberEdit,
  onReviewMember,
  removeMember,
  onCreateMember,
  reviewingId,
  onRefresh,
}: AdminMembersViewProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newMember, setNewMember] = useState<AdminMemberCreate>({ saccoNumber: '', fullName: '', nationalId: '' })
  const [terminatingId, setTerminatingId] = useState<number | null>(null)
  const [settlementMessage, setSettlementMessage] = useState('')
  const [settlementError, setSettlementError] = useState(false)
  const [terminationTarget, setTerminationTarget] = useState<AdminMember | null>(null)
  const [terminationCharges, setTerminationCharges] = useState<{ description: string; amount: string }[]>([])
  const [overviewMemberId, setOverviewMemberId] = useState<number | null>(null)

  async function terminateMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!terminationTarget) return
    const member = terminationTarget
    const charges = terminationCharges.map((charge) => ({
      description: charge.description.trim(),
      amount: Number(charge.amount),
    }))
    if (charges.some((charge) => !charge.description || !Number.isFinite(charge.amount) || charge.amount <= 0)) {
      setSettlementMessage('Enter a description and a positive amount for every custom charge.')
      setSettlementError(true)
      return
    }
    const chargesTotal = Math.round(charges.reduce((sum, charge) => sum + charge.amount, 0) * 100) / 100
    const availableAfterLoans = Math.max(0, member.savingsBalance - member.activeLoanBalance)
    if (chargesTotal > availableAfterLoans) {
      setSettlementMessage('Custom charges cannot exceed the member savings remaining after loan settlement.')
      setSettlementError(true)
      return
    }
    setTerminatingId(member.id); setSettlementMessage(''); setSettlementError(false)
    try {
      const response = await fetch(`/api/admin/members/${member.id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charges }),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not settle this member account.')
      setSettlementMessage(result.message ?? 'Member account settled and terminated.')
      setSettlementError(false)
      setTerminationTarget(null)
      setTerminationCharges([])
      await onRefresh()
    } catch (error) {
      setSettlementMessage(error instanceof Error ? error.message : 'Could not settle this member account.')
      setSettlementError(true)
    }
    finally { setTerminatingId(null) }
  }

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await onCreateMember(newMember)) {
      setNewMember({ saccoNumber: '', fullName: '', nationalId: '' })
      setShowCreateForm(false)
    }
  }

  return (
    <div className="admin-view-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">Member Accounts </h1>
          <p className="view-page-desc">
            Manage member verification, contact details, bank accounts and role permissions.
          </p>
        </div>
        <div className="view-intro-meta">
          <button type="button" className="table-btn-primary admin-create-trigger" onClick={() => setShowCreateForm((open) => !open)}>
            <UserPlus size={15} /> Add member
          </button>
          <span className="count-pill">
            Total: <AnimatedFigure value={members.length} format="number" />
          </span>
        </div>
      </div>

      {showCreateForm && <form className="admin-create-panel" onSubmit={(event) => void createMember(event)}>
        <div className="admin-create-panel-heading"><h2>Add a member</h2><p>New accounts are active immediately and use the current temporary password.</p></div>
        <div className="form-fields-grid">
          <label>SACCO number<input required maxLength={20} placeholder="A/005" value={newMember.saccoNumber} onChange={(event) => setNewMember((current) => ({ ...current, saccoNumber: event.target.value.toUpperCase() }))} /></label>
          <label>Full name<input required minLength={2} maxLength={100} value={newMember.fullName} onChange={(event) => setNewMember((current) => ({ ...current, fullName: event.target.value }))} /></label>
          <label>National ID (optional)<input inputMode="numeric" maxLength={12} value={newMember.nationalId} onChange={(event) => setNewMember((current) => ({ ...current, nationalId: event.target.value }))} /></label>
        </div>
        <div className="modal-actions-bar">
          <button type="button" className="action-btn-cancel" onClick={() => setShowCreateForm(false)}>Cancel</button>
          <button type="submit" className="submit-button" disabled={reviewingId === 'create-member'}>{reviewingId === 'create-member' ? 'Adding member…' : 'Add member'}</button>
        </div>
      </form>}
      {settlementMessage && <div className={`admin-banner-alert ${settlementError ? 'alert-error' : 'alert-success'}`} role={settlementError ? 'alert' : 'status'}>{settlementMessage}</div>}
      {terminationTarget && <div className="termination-charge-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget && terminatingId !== terminationTarget.id) setTerminationTarget(null)
      }}>
        <form className="termination-charge-modal" onSubmit={(event) => void terminateMember(event)}>
          <div className="termination-charge-heading">
            <div><p>MEMBERSHIP CLOSURE</p><h2>Terminate {terminationTarget.fullName}</h2></div>
            <button type="button" className="termination-overview-close" disabled={terminatingId === terminationTarget.id} onClick={() => setTerminationTarget(null)} aria-label="Close termination form"><X size={19} /></button>
          </div>
          <p className="termination-charge-summary">
            Savings of <strong>{terminationTarget.savingsBalance.toFixed(2)}</strong> will first be applied to outstanding loans of <strong>{terminationTarget.activeLoanBalance.toFixed(2)}</strong>. Add any custom admin charges below; the remaining amount is paid out as a withdrawal without interest.
          </p>
          <div className="termination-charge-lines-heading"><h3>Custom admin charges</h3><button type="button" className="termination-add-charge" disabled={terminationCharges.length >= 20} onClick={() => setTerminationCharges((charges) => [...charges, { description: '', amount: '' }])}><Plus size={15} /> Add charge</button></div>
          {terminationCharges.length > 0 ? <div className="termination-charge-lines">
            {terminationCharges.map((charge, index) => <div className="termination-charge-line" key={index}>
              <label>Charge description<input required maxLength={120} value={charge.description} onChange={(event) => setTerminationCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} placeholder="e.g. Membership closure fee" /></label>
              <label>Amount<input required type="number" min="0.01" step="0.01" value={charge.amount} onChange={(event) => setTerminationCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} /></label>
              <button type="button" className="termination-remove-charge" onClick={() => setTerminationCharges((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove charge ${index + 1}`}><Trash2 size={16} /></button>
            </div>)}
          </div> : <p className="termination-no-charges">No custom charges added. Add charges only when they apply.</p>}
          <div className="termination-payout-preview">
            <span>Estimated payout after loans and charges</span>
            <strong>{Math.max(0, terminationTarget.savingsBalance - terminationTarget.activeLoanBalance - terminationCharges.reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0)).toFixed(2)}</strong>
          </div>
          {settlementError && settlementMessage && <p className="termination-modal-error" role="alert">{settlementMessage}</p>}
          <div className="termination-charge-actions">
            <button type="button" className="action-btn-cancel" disabled={terminatingId === terminationTarget.id} onClick={() => setTerminationTarget(null)}>Cancel</button>
            <button type="submit" className="submit-button" disabled={terminatingId === terminationTarget.id}>{terminatingId === terminationTarget.id ? 'Settling account…' : 'Confirm termination'}</button>
          </div>
        </form>
      </div>}
      {overviewMemberId !== null && <TerminationOverviewModal memberId={overviewMemberId} onClose={() => setOverviewMemberId(null)} />}

      {/* Search & Filter Controls */}
      <div className="table-controls-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by SACCO number, name, National ID, phone, or email…"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
          {memberSearch && (
            <button type="button" className="clear-search" onClick={() => setMemberSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-chips" role="group" aria-label="Member status filter">
          <button
            type="button"
            className={`filter-chip ${memberFilter === 'all' ? 'active' : ''}`}
            onClick={() => setMemberFilter('all')}
          >
            All ({members.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${memberFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setMemberFilter('pending')}
          >
            Pending Review ({pendingMembersCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${memberFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setMemberFilter('approved')}
          >
            Active ({approvedMembersCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${memberFilter === 'signatory' ? 'active' : ''}`}
            onClick={() => setMemberFilter('signatory')}
          >
            Signatories ({signatoriesCount})
          </button>
        </div>
      </div>

      {/* Members Data Table */}
      <div className="admin-table-container">
        <table className="modern-admin-table">
          <thead>
            <tr>
              <th>MEMBER</th>
              <th>SACCO NO.</th>
              <th>NATIONAL ID</th>
              <th>PHONE</th>
              <th>SAVINGS BALANCE</th>
              <th>STATUS</th>
              <th>ROLE</th>
              <th className="actions-col">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr key={member.id} className={viewingMemberId === member.id ? 'row-selected' : ''}>
                <td>
                  <div className="member-cell-profile">
                    <div className="member-cell-avatar">
                      {member.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="member-cell-info">
                      <strong className="member-name-text">{member.fullName}</strong>
                      <small className="member-email-text">{member.email || 'No email'}</small>
                    </div>
                  </div>
                </td>
                <td><span className="badge-id">{member.saccoNumber || '—'}</span></td>
                <td>
                  <span className="badge-id">{member.nationalId || 'Not provided'}</span>
                </td>
                <td>
                  <span className="phone-text">{member.phoneNumber || '—'}</span>
                </td>
                <td>
                  <strong className="savings-figure">
                    <AnimatedFigure value={member.savingsBalance} />
                  </strong>
                </td>
                <td>
                  <span className={`status-pill status-${member.accountStatus}`}>
                    {member.accountStatus === 'approved' && <Check size={11} />}
                    {member.accountStatus === 'pending' && <Clock size={11} />}
                    {member.accountStatus === 'rejected' && <X size={11} />}
                    <span>{member.accountStatus}</span>
                  </span>
                </td>
                <td>
                  {member.isAdmin ? (
                    <span className="role-tag-admin">Admin</span>
                  ) : member.memberRole === 'signatory' ? (
                    <span className="role-display role-signatory">
                      <ShieldCheck size={13} />
                      <span>Signatory</span>
                    </span>
                  ) : (
                    <span className="role-display role-standard">
                      Member
                    </span>
                  )}
                </td>
                <td className="actions-col">
                  <div className="row-actions-group">
                    <button
                      type="button"
                      className="table-btn-view"
                      onClick={() => setViewingMemberId(member.id)}
                      title="View member details"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>

                    <RowActionDropdown
                      items={[
                        ...(member.accountStatus === 'pending'
                          ? [
                              {
                                id: `approve-${member.id}`,
                                label: 'Approve Account',
                                sublabel: 'Activate SACCO membership',
                                icon: <Check size={15} />,
                                variant: 'success' as const,
                                disabled: reviewingId === `member-${member.id}`,
                                onClick: () => onReviewMember(member.id, 'approve'),
                              },
                              {
                                id: `reject-${member.id}`,
                                label: 'Reject Account',
                                sublabel: 'Decline membership registration',
                                icon: <X size={15} />,
                                variant: 'danger' as const,
                                disabled: reviewingId === `member-${member.id}`,
                                onClick: () => onReviewMember(member.id, 'reject'),
                              },
                            ]
                          : []),
                        {
                          id: `edit-${member.id}`,
                          label: 'Edit Details',
                          sublabel: 'Update contact & bank details',
                          icon: <Pencil size={15} />,
                          variant: 'default' as const,
                          onClick: () => beginMemberEdit(member),
                        },
                        ...(member.accountStatus === 'approved'
                          ? [
                              {
                                id: `terminate-${member.id}`,
                                label: 'Terminate Membership',
                                sublabel: 'Settle savings, loans & custom charges',
                                icon: <AlertTriangle size={15} />,
                                variant: 'danger' as const,
                                disabled: terminatingId === member.id,
                                onClick: () => {
                                  setTerminationTarget(member)
                                  setTerminationCharges([])
                                  setSettlementMessage('')
                                  setSettlementError(false)
                                },
                              },
                            ]
                          : []),
                        ...(member.accountStatus === 'terminated'
                          ? [{
                              id: `member-overview-${member.id}`,
                              label: 'Member overview',
                              sublabel: 'View savings, loans & final settlement',
                              icon: <FileText size={15} />,
                              variant: 'primary' as const,
                              onClick: () => setOverviewMemberId(member.id),
                            }]
                          : []),
                        {
                          id: `delete-${member.id}`,
                          label: 'Delete Record',
                          sublabel: 'Permanently remove member from database',
                          icon: <Trash2 size={15} />,
                          variant: 'danger' as const,
                          disabled: reviewingId === `delete-member-${member.id}`,
                          onClick: () => void removeMember(member),
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredMembers.length && (
          <div className="table-empty-state">
            <UsersRound size={32} />
            <p>No member accounts match the current filter or search criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
