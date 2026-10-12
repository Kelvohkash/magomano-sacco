import type { Dispatch, SetStateAction } from 'react'
import {
  Check,
  ClipboardList,
  Clock,
  Pencil,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { AnimatedFigure } from '../../AnimatedFigure'
import { currency, formatDate } from '../../../format'
import type { AdminLoanApplication } from '../../../types'

interface AdminLoansViewProps {
  applications: AdminLoanApplication[]
  filteredApplications: AdminLoanApplication[]
  pendingApplicationsCount: number
  loanSearch: string
  setLoanSearch: Dispatch<SetStateAction<string>>
  loanFilter: 'all' | 'pending' | 'approved' | 'rejected'
  setLoanFilter: Dispatch<SetStateAction<'all' | 'pending' | 'approved' | 'rejected'>>
  setViewingApplicationId: (id: number | null) => void
  setEditingApplicationId: (id: number | null) => void
  beginApplicationEdit: (app: AdminLoanApplication) => void
  onReviewLoan: (applicationId: number, decision: 'approve' | 'reject') => void
  removeApplication: (app: AdminLoanApplication) => Promise<void>
  reviewingId: string | null
}

export function AdminLoansView({
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
  removeApplication,
  reviewingId,
}: AdminLoansViewProps) {
  const approvedCount = applications.filter((a) => a.status === 'approved').length
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length

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
      </div>

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
            className={`filter-chip ${loanFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setLoanFilter('approved')}
          >
            Approved ({approvedCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${loanFilter === 'rejected' ? 'active' : ''}`}
            onClick={() => setLoanFilter('rejected')}
          >
            Rejected ({rejectedCount})
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
                    {app.status === 'approved' && <Check size={11} />}
                    {app.status === 'pending' && <Clock size={11} />}
                    {app.status === 'rejected' && <X size={11} />}
                    <span>{app.status}</span>
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
                          title="Approve and issue loan"
                          aria-label="Approve and issue loan"
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

                    {app.status !== 'approved' && (
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

