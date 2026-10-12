import type { Dispatch, SetStateAction } from 'react'
import {
  ArrowRight,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  Landmark,
  Printer,
  RefreshCcw,
  UserCheck,
  WalletCards,
} from 'lucide-react'
import { AnimatedFigure } from '../../AnimatedFigure'
import type { AdminSummary, AdminView, AdminMember, AdminLoanApplication } from '../../../types'

interface AdminDashboardViewProps {
  summary: AdminSummary | null
  approvedMembersCount: number
  pendingMembers: AdminMember[]
  pendingApplications: AdminLoanApplication[]
  setView: Dispatch<SetStateAction<AdminView>>
  setMemberFilter: Dispatch<SetStateAction<'all' | 'pending' | 'approved' | 'signatory' | 'admin'>>
  setLoanFilter: Dispatch<SetStateAction<'all' | 'pending' | 'approved' | 'rejected'>>
}

export function AdminDashboardView({
  summary,
  approvedMembersCount,
  pendingMembers,
  pendingApplications,
  setView,
  setMemberFilter,
  setLoanFilter,
}: AdminDashboardViewProps) {
  return (
    <div className="admin-view-panel overview-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">SACCO Financial Overview</h1>
          <p className="view-page-desc">
            Organization-wide balance totals, active credit facilities, and review queues.
          </p>
        </div>
        <div className="view-intro-meta">
          <span className="timestamp-badge">
            Active Members: <strong>{summary?.members.approvedMembers ?? approvedMembersCount}</strong>
          </span>
        </div>
      </div>

      {/* 4 Hero KPI Cards */}
      <section className="kpi-metric-cards" aria-label="Key financial figures">
        <article className="kpi-card savings-kpi">
          <div className="kpi-card-header">
            <span className="kpi-title">TOTAL MEMBER SAVINGS</span>
            <div className="kpi-icon-wrap savings-icon">
              <WalletCards size={20} />
            </div>
          </div>
          <strong className="kpi-value">
            <AnimatedFigure value={summary?.totalSavings ?? 0} />
          </strong>
          <div className="kpi-footer">
            <span className="kpi-subtext">Active savings deposits held</span>
          </div>
        </article>

        <article className="kpi-card loans-kpi">
          <div className="kpi-card-header">
            <span className="kpi-title">TOTAL LOANS ISSUED</span>
            <div className="kpi-icon-wrap loans-icon">
              <Landmark size={20} />
            </div>
          </div>
          <strong className="kpi-value">
            <AnimatedFigure value={summary?.loansIssued ?? 0} />
          </strong>
          <div className="kpi-footer">
            <span className="kpi-subtext">Approved and disbursed principal</span>
          </div>
        </article>

        <article className="kpi-card pending-kpi">
          <div className="kpi-card-header">
            <span className="kpi-title">OUTSTANDING REPAYMENTS</span>
            <div className="kpi-icon-wrap pending-icon">
              <Clock size={20} />
            </div>
          </div>
          <strong className="kpi-value">
            <AnimatedFigure value={summary?.pendingPayments ?? 0} />
          </strong>
          <div className="kpi-footer">
            <span className="kpi-subtext">Current active loan balances due</span>
          </div>
        </article>

      </section>

      {/* Priority Action Queues */}
      <section className="priority-queue-section" aria-label="Items awaiting administrative action">
        <h2 className="section-title">Action Required Queues</h2>
        <div className="queue-cards-grid">
          <div className={`queue-card ${pendingMembers.length > 0 ? 'queue-active' : ''}`}>
            <div className="queue-icon-circle member-queue-icon">
              <UserCheck size={22} />
            </div>
            <div className="queue-content">
              <span className="queue-label">MEMBER ACCOUNT APPLICATIONS</span>
              <div className="queue-count-row">
                <strong className="queue-count">
                  <AnimatedFigure value={summary?.members.pendingMembers ?? pendingMembers.length} format="number" />
                </strong>
                <span className="queue-unit">accounts pending review</span>
              </div>
              <p className="queue-desc">New member registrations awaiting ID and verification before access.</p>
            </div>
            <button
              type="button"
              className="queue-action-button"
              onClick={() => {
                setMemberFilter('pending')
                setView('members')
              }}
            >
              <span>Review Accounts</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className={`queue-card ${pendingApplications.length > 0 ? 'queue-active' : ''}`}>
            <div className="queue-icon-circle loan-queue-icon">
              <ClipboardList size={22} />
            </div>
            <div className="queue-content">
              <span className="queue-label">LOAN FACILITY APPLICATIONS</span>
              <div className="queue-count-row">
                <strong className="queue-count">
                  <AnimatedFigure
                    value={summary?.pendingLoanApplications ?? pendingApplications.length}
                    format="number"
                  />
                </strong>
                <span className="queue-unit">applications submitted</span>
              </div>
              <p className="queue-desc">Credit applications awaiting committee evaluation and issuance.</p>
            </div>
            <button
              type="button"
              className="queue-action-button"
              onClick={() => {
                setLoanFilter('pending')
                setView('loans')
              }}
            >
              <span>Review Applications</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Quick Shortcuts */}
      <section className="quick-actions-strip">
        <h3 className="section-subtitle">Quick Navigation Shortcuts</h3>
        <div className="quick-buttons-row">
          <button type="button" className="quick-btn" onClick={() => setView('repayments')}>
            <RefreshCcw size={16} />
            <span>Review Repayments</span>
          </button>
          <button type="button" className="quick-btn" onClick={() => setView('loans')}>
            <Printer size={16} />
            <span>Print Loan Agreement</span>
          </button>
          <button type="button" className="quick-btn" onClick={() => setView('bulk')}>
            <FileSpreadsheet size={16} />
            <span>Monthly CSV Import</span>
          </button>
        </div>
      </section>
    </div>
  )
}
