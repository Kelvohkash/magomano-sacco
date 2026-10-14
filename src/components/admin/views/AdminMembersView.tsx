import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import {
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
} from 'lucide-react'
import { AnimatedFigure } from '../../AnimatedFigure'
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

  async function terminateMember(member: AdminMember) {
    const net = member.savingsBalance - member.activeLoanBalance
    if (!window.confirm(`Terminate ${member.fullName} and settle the account? Savings ${member.savingsBalance.toFixed(2)} will be applied against loans due ${member.activeLoanBalance.toFixed(2)}.Payout: ${Math.max(0, net).toFixed(2)}; remaining loan due: ${Math.max(0, -net).toFixed(2)}.`)) return
    setTerminatingId(member.id); setSettlementMessage('')
    try {
      const response = await fetch(`/api/admin/members/${member.id}/terminate`, { method: 'POST' })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not settle this member account.')
      setSettlementMessage(result.message ?? 'Member account settled and terminated.')
      await onRefresh()
    } catch (error) { setSettlementMessage(error instanceof Error ? error.message : 'Could not settle this member account.') }
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
      {settlementMessage && <div className="admin-banner-alert alert-success" role="status">{settlementMessage}</div>}

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

                    <button
                      type="button"
                      className="table-btn-edit"
                      onClick={() => beginMemberEdit(member)}
                      title="Edit member"
                    >
                      <Pencil size={14} />
                    </button>

                    {member.accountStatus === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="table-btn-approve"
                          onClick={() => onReviewMember(member.id, 'approve')}
                          disabled={reviewingId === `member-${member.id}`}
                          title="Approve account"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          className="table-btn-reject"
                          onClick={() => onReviewMember(member.id, 'reject')}
                          disabled={reviewingId === `member-${member.id}`}
                          title="Reject account"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}

                    {member.accountStatus === 'approved' && <button type="button" className="table-btn-reject" onClick={() => void terminateMember(member)} disabled={terminatingId === member.id} title="Settle savings and loans, then terminate membership">
                      {terminatingId === member.id ? 'Settling…' : 'Terminate'}
                    </button>}

                    <button
                      type="button"
                      className="table-btn-delete"
                      onClick={() => void removeMember(member)}
                      disabled={reviewingId === `delete-member-${member.id}`}
                      title="Delete account"
                    >
                      <Trash2 size={14} />
                    </button>
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

