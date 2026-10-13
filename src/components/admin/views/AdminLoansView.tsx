import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import {
  Check,
  ClipboardList,
  Clock,
  Pencil,
  Printer,
  Search,
  Trash2,
  Plus,
  X,
} from 'lucide-react'
import { AnimatedFigure } from '../../AnimatedFigure'
import { currency, formatDate } from '../../../format'
import type { AdminLoanApplication, AdminLoanCreate, AdminMember } from '../../../types'

interface AdminLoansViewProps {
  members: AdminMember[]
  onIssueLoan: (input: AdminLoanCreate) => Promise<boolean>
  applications: AdminLoanApplication[]
  filteredApplications: AdminLoanApplication[]
  pendingApplicationsCount: number
  loanSearch: string
  setLoanSearch: Dispatch<SetStateAction<string>>
  loanFilter: 'all' | 'pending' | 'decision' | 'disbursed'
  setLoanFilter: Dispatch<SetStateAction<'all' | 'pending' | 'decision' | 'disbursed'>>
  setViewingApplicationId: (id: number | null) => void
  setEditingApplicationId: (id: number | null) => void
  beginApplicationEdit: (app: AdminLoanApplication) => void
  onReviewLoan: (applicationId: number, decision: 'approve' | 'reject') => void
  onDisburseLoan: (applicationId: number, bankName: string, accountNumber: string) => void
  removeApplication: (app: AdminLoanApplication) => Promise<void>
  reviewingId: string | null
}

export function AdminLoansView({
  members,
  onIssueLoan,
  applications,
  filteredApplications,
  pendingApplicationsCount,
  loanSearch,
  setLoanSearch,
  loanFilter,
  setLoanFilter,
  setViewingApplicationId,
  setEditingApplicationId,
  beginApplicationEdit,
  onReviewLoan,
  onDisburseLoan,
  removeApplication,
  reviewingId,
}: AdminLoansViewProps) {
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [newLoan, setNewLoan] = useState<AdminLoanCreate>({ memberId: 0, principalAmount: 0, repaymentMonths: 1, purpose: '' })
  const approvedMembers = members.filter((member) => member.accountStatus === 'approved')
  const selectedMember = approvedMembers.find((member) => member.id === Number(newLoan.memberId))

  async function issueLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await onIssueLoan(newLoan)) {
      setNewLoan({ memberId: 0, principalAmount: 0, repaymentMonths: 1, purpose: '' })
      setShowIssueForm(false)
    }
  }

  const approvedCount = applications.filter((a) => a.status === 'approved').length
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length
  const decisionCount = approvedCount + rejectedCount
  const disbursedCount = applications.filter((a) => a.status === 'disbursed').length

  return (
    <div className="admin-view-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">Loan Applications &amp; Credit Facilities</h1>
          <p className="view-page-desc">
            Review incoming borrowing requests, inspect electronic signatures, and print official facility agreements.
          </p>
        </div>
        <div className="view-intro-meta">
          <span className="count-pill">
            Applications: <AnimatedFigure value={applications.length} format="number" />
          </span>
        </div>
        <button type="button" className="table-btn-primary admin-create-trigger" onClick={() => setShowIssueForm((open) => !open)}>
          <Plus size={15} /> Add loan
        </button>
      </div>

      {showIssueForm && <form className="admin-create-panel" onSubmit={(event) => void issueLoan(event)}>
        <div className="admin-create-panel-heading"><h2>Issue a new loan</h2><p>The 10% interest is included when checking the member’s savings limit.</p></div>
        <div className="form-fields-grid">
          <label className="span-2">Member<select required value={newLoan.memberId || ''} onChange={(event) => setNewLoan((current) => ({ ...current, memberId: Number(event.target.value) }))}>
            <option value="">Choose an approved member</option>
            {approvedMembers.map((member) => <option key={member.id} value={member.id}>{member.fullName} · {member.saccoNumber || member.nationalId}</option>)}
          </select></label>
          <label>Principal amount<input required type="number" min="0.01" max={selectedMember?.availableBalance ?? undefined} step="0.01" value={newLoan.principalAmount || ''} onChange={(event) => setNewLoan((current) => ({ ...current, principalAmount: Number(event.target.value) }))} /></label>
          <label>Repayment period (months)<input required type="number" min="1" max="120" step="1" value={newLoan.repaymentMonths} onChange={(event) => setNewLoan((current) => ({ ...current, repaymentMonths: Number(event.target.value) }))} /></label>
          <label className="span-2">Purpose<textarea required minLength={3} maxLength={500} rows={2} value={newLoan.purpose} onChange={(event) => setNewLoan((current) => ({ ...current, purpose: event.target.value }))} /></label>
        </div>
        {selectedMember && <p className="admin-create-note">Maximum principal after the 10% savings deduction: {currency.format(selectedMember.availableBalance)}. Estimated total repayment: {currency.format(newLoan.principalAmount * 1.1)}.</p>}
        {!approvedMembers.length && <p className="admin-create-note">There are no approved members available for a loan.</p>}
        <div className="modal-actions-bar">
          <button type="button" className="action-btn-cancel" onClick={() => setShowIssueForm(false)}>Cancel</button>
          <button type="submit" className="submit-button" disabled={!approvedMembers.length || reviewingId === 'issue-loan'}>{reviewingId === 'issue-loan' ? 'Issuing loan…' : 'Issue loan'}</button>
        </div>
      </form>}

      {/* Table Search & Filter Bar */}
      <div className="table-controls-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by member name, National ID, or loan purpose…"
            value={loanSearch}
            onChange={(e) => setLoanSearch(e.target.value)}
          />
          {loanSearch && (
            <button type="button" className="clear-search" onClick={() => setLoanSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-chips" role="group" aria-label="Loan status filter">
          <button
            type="button"
            className={`filter-chip ${loanFilter === 'all' ? 'active' : ''}`}
            onClick={() => setLoanFilter('all')}
          >
            All ({applications.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${loanFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setLoanFilter('pending')}
          >
            Pending Review ({pendingApplicationsCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${loanFilter === 'decision' ? 'active' : ''}`}
            onClick={() => setLoanFilter('decision')}
          >
            Decision ({decisionCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${loanFilter === 'disbursed' ? 'active' : ''}`}
            onClick={() => setLoanFilter('disbursed')}
          >
            Disbursed ({disbursedCount})
          </button>
        </div>
      </div>

      {/* Loan Applications Data Table */}
      <div className="admin-table-container">
        <table className="modern-admin-table">
          <thead>
            <tr>
              <th>APP NO.</th>
              <th>MEMBER NAME</th>
              <th>NATIONAL ID</th>
              <th>REQUESTED</th>
              <th>TERM</th>
              <th>LOAN PURPOSE</th>
              <th>DATE APPLIED</th>
              <th>STATUS</th>
              <th className="actions-col loan-actions-col">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map((app) => (
              <tr key={app.id}>
                <td>
                  <span className="app-ref-tag">#{String(app.id).padStart(5, '0')}</span>
                </td>
                <td>
                  <strong className="table-applicant-name">{app.fullName}</strong>
                </td>
                <td>
                  <span className="badge-id">{app.nationalId}</span>
                </td>
                <td>
                  <strong className="loan-amount-badge">
                    {currency.format(app.requestedAmount)}
                  </strong>
                </td>
                <td>
                  <span className="term-text">{app.repaymentMonths} mos</span>
                </td>
                <td>
                  <span className="purpose-truncate" title={app.purpose}>
                    {app.purpose}
                  </span>
                </td>
                <td>
                  <span className="applied-date-text">{formatDate(app.appliedAt)}</span>
                </td>
                <td>
                  <span className={`status-pill status-${app.status}`}>
                    {['approved', 'disbursed'].includes(app.status) && <Check size={11} />}
                    {app.status === 'pending' && <Clock size={11} />}
                    {app.status === 'rejected' && <X size={11} />}
                    <span>{app.status === 'approved' ? 'awaiting disbursement' : app.status}</span>
                  </span>
                </td>
                <td className="actions-col loan-actions-col">
                  <div className="row-actions-group loan-row-actions">
                    <button
                      type="button"
                      className="table-btn-primary"
                      onClick={() => {
                        setViewingApplicationId(app.id)
                        setEditingApplicationId(null)
                      }}
                      title="View & Print Official Loan Agreement"
                    >
                      <Printer size={14} />
                      <span>View / Print</span>
                    </button>

                    {app.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="table-btn-edit"
                          onClick={() => beginApplicationEdit(app)}
                          title="Edit application details"
                          aria-label="Edit application details"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="table-btn-approve"
                          onClick={() => onReviewLoan(app.id, 'approve')}
                          disabled={reviewingId === `loan-${app.id}`}
                          title="Approve application"
                          aria-label="Approve application"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          className="table-btn-reject"
                          onClick={() => onReviewLoan(app.id, 'reject')}
                          disabled={reviewingId === `loan-${app.id}`}
                          title="Reject application"
                          aria-label="Reject application"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}

                    {app.status === 'approved' && (
                      <button
                        type="button"
                        className="table-btn-approve"
                        onClick={() => onDisburseLoan(app.id, app.payoutBankName, app.payoutAccountNumber)}
                        disabled={reviewingId === `disburse-loan-${app.id}`}
                        title="Record funds as disbursed to the selected bank account"
                      >
                        <Check size={14} />
                        <span>{reviewingId === `disburse-loan-${app.id}` ? 'Recording…' : 'Mark disbursed'}</span>
                      </button>
                    )}

                    {['pending', 'rejected'].includes(app.status) && (
                      <button
                        type="button"
                        className="table-btn-delete"
                        onClick={() => void removeApplication(app)}
                        disabled={reviewingId === `delete-loan-${app.id}`}
                        title="Delete application"
                        aria-label="Delete application"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredApplications.length && (
          <div className="table-empty-state">
            <ClipboardList size={32} />
            <p>No loan applications match your current search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}

