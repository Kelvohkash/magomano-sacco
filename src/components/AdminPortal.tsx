import { useState, type Dispatch, type FormEvent, type FormEventHandler, type SetStateAction } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Pencil,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react'
import { AnimatedFigure } from './AnimatedFigure'
import { BulkImportPanel } from './BulkImportPanel'
import { AdminStatementPanel } from './AdminStatementPanel'
import { LoanDocumentModal } from './LoanDocumentModal'
import { currency, formatDate } from '../format'
import type {
  AdminDividend,
  AdminLoanApplication,
  AdminMember,
  AdminOpenLoan,
  AdminSummary,
  AdminView,
  MemberProfileUpdate,
} from '../types'

interface AdminPortalProps {
  signedInAdmin: string
  view: AdminView
  setView: Dispatch<SetStateAction<AdminView>>
  summary: AdminSummary | null
  statementRefreshKey: number
  members: AdminMember[]
  applications: AdminLoanApplication[]
  openLoans: AdminOpenLoan[]
  dividends: AdminDividend[]
  memberId: string
  setMemberId: Dispatch<SetStateAction<string>>
  amount: string
  setAmount: Dispatch<SetStateAction<string>>
  description: string
  setDescription: Dispatch<SetStateAction<string>>
  message: string
  messageSuccess: boolean
  submitting: boolean
  reviewingId: string | null
  repaymentLoanId: string
  setRepaymentLoanId: Dispatch<SetStateAction<string>>
  repaymentAmount: string
  setRepaymentAmount: Dispatch<SetStateAction<string>>
  repaymentDescription: string
  setRepaymentDescription: Dispatch<SetStateAction<string>>
  dividendAmount: string
  setDividendAmount: Dispatch<SetStateAction<string>>
  dividendPeriod: string
  setDividendPeriod: Dispatch<SetStateAction<string>>
  dividendDescription: string
  setDividendDescription: Dispatch<SetStateAction<string>>
  onLogout: () => void
  onSavingsEntry: FormEventHandler<HTMLFormElement>
  onLoanRepayment: FormEventHandler<HTMLFormElement>
  onDividendPayment: FormEventHandler<HTMLFormElement>
  onReviewMember: (memberId: number, decision: 'approve' | 'reject') => void
  onSetMemberRole: (memberId: number, role: AdminMember['memberRole']) => void
  onDeleteMember: (memberId: number) => Promise<boolean>
  onReviewLoan: (applicationId: number, decision: 'approve' | 'reject') => void
  onUpdateLoanApplication: (
    applicationId: number,
    details: Pick<AdminLoanApplication, 'requestedAmount' | 'repaymentMonths' | 'purpose'>,
  ) => Promise<boolean>
  onDeleteLoanApplication: (applicationId: number) => Promise<boolean>
  onUpdateMember: (memberId: number, details: MemberProfileUpdate) => Promise<boolean>
  terms: string
  setTerms: Dispatch<SetStateAction<string>>
  termsUpdatedAt: string | null
  onSaveTerms: (terms: string) => Promise<boolean>
  onRefresh: () => Promise<void>
}

export function AdminPortal({
  signedInAdmin,
  view,
  setView,
  summary,
  statementRefreshKey,
  members,
  applications,
  openLoans,
  dividends,
  memberId,
  setMemberId,
  amount,
  setAmount,
  description,
  setDescription,
  message,
  messageSuccess,
  submitting,
  reviewingId,
  repaymentLoanId,
  setRepaymentLoanId,
  repaymentAmount,
  setRepaymentAmount,
  repaymentDescription,
  setRepaymentDescription,
  dividendAmount,
  setDividendAmount,
  dividendPeriod,
  setDividendPeriod,
  dividendDescription,
  setDividendDescription,
  onLogout,
  onSavingsEntry,
  onLoanRepayment,
  onDividendPayment,
  onReviewMember,
  onSetMemberRole,
  onDeleteMember,
  onReviewLoan,
  onUpdateLoanApplication,
  onDeleteLoanApplication,
  onUpdateMember,
  terms,
  setTerms,
  termsUpdatedAt,
  onSaveTerms,
  onRefresh,
}: AdminPortalProps) {
  // Local state
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null)
  const [memberForm, setMemberForm] = useState<MemberProfileUpdate>({
    fullName: '',
    phoneNumber: '',
    email: '',
    county: '',
    subCounty: '',
    bankName: '',
    bankBranch: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankTwoName: '',
    bankTwoBranch: '',
    bankTwoAccountName: '',
    bankTwoAccountNumber: '',
    location: '',
    maritalStatus: '',
    nextKinName: '',
    nextKinRelationship: '',
    nextKinPhone: '',
  })
  const [memberSaving, setMemberSaving] = useState(false)
  const [viewingMemberId, setViewingMemberId] = useState<number | null>(null)
  const [viewingApplicationId, setViewingApplicationId] = useState<number | null>(null)
  const [viewingDividendId, setViewingDividendId] = useState<number | null>(null)
  const [editingApplicationId, setEditingApplicationId] = useState<number | null>(null)
  const [applicationForm, setApplicationForm] = useState({
    requestedAmount: '',
    repaymentMonths: '',
    purpose: '',
  })
  const [termsSaving, setTermsSaving] = useState(false)
  const [termsMessage, setTermsMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters & Search
  const [memberSearch, setMemberSearch] = useState('')
  const [memberFilter, setMemberFilter] = useState<'all' | 'pending' | 'approved' | 'signatory' | 'admin'>('all')
  const [loanSearch, setLoanSearch] = useState('')
  const [loanFilter, setLoanFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [repaymentSearch, setRepaymentSearch] = useState('')

  // Derived collections
  const approvedMembers = members.filter((member) => member.accountStatus === 'approved')
  const selectedMember = approvedMembers.find((member) => String(member.id) === memberId)
  const pendingMembers = members.filter((member) => member.accountStatus === 'pending')
  const pendingApplications = applications.filter((application) => application.status === 'pending')
  const signatories = members.filter((member) => member.memberRole === 'signatory')
  const viewingApplication = applications.find((application) => application.id === viewingApplicationId)
  const viewingApplicationMember = viewingApplication
    ? members.find((member) => member.nationalId === viewingApplication.nationalId)
    : undefined
  const selectedLoan = openLoans.find((loan) => String(loan.id) === repaymentLoanId)
  const viewingMember = members.find((m) => m.id === viewingMemberId)

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    if (memberFilter === 'pending' && m.accountStatus !== 'pending') return false
    if (memberFilter === 'approved' && m.accountStatus !== 'approved') return false
    if (memberFilter === 'signatory' && m.memberRole !== 'signatory') return false
    if (memberFilter === 'admin' && !m.isAdmin) return false

    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase()
      const matchName = m.fullName.toLowerCase().includes(q)
      const matchId = m.nationalId.toLowerCase().includes(q)
      const matchPhone = m.phoneNumber?.toLowerCase().includes(q)
      const matchEmail = m.email?.toLowerCase().includes(q)
      return matchName || matchId || matchPhone || matchEmail
    }
    return true
  })

  // Filtered loans list
  const filteredApplications = applications.filter((app) => {
    if (loanFilter !== 'all' && app.status !== loanFilter) return false
    if (loanSearch.trim()) {
      const q = loanSearch.toLowerCase()
      const matchName = app.fullName.toLowerCase().includes(q)
      const matchId = app.nationalId.toLowerCase().includes(q)
      const matchRef = String(app.id).includes(q)
      const matchPurpose = app.purpose.toLowerCase().includes(q)
      return matchName || matchId || matchRef || matchPurpose
    }
    return true
  })

  // Filtered open loans for repayment
  const filteredOpenLoans = openLoans.filter((loan) => {
    if (!repaymentSearch.trim()) return true
    const q = repaymentSearch.toLowerCase()
    return (
      loan.fullName.toLowerCase().includes(q) ||
      loan.reference.toLowerCase().includes(q) ||
      loan.nationalId.toLowerCase().includes(q)
    )
  })

  interface AdminNavItem {
    section: AdminView
    label: string
    Icon: typeof LayoutDashboard
    badge?: number
  }

  const navigationItems: AdminNavItem[] = [
    { section: 'overview', label: 'Dashboard', Icon: LayoutDashboard },
    { section: 'members', label: 'Member Accounts', Icon: UsersRound, badge: pendingMembers.length },
    { section: 'loans', label: 'Loan Applications', Icon: ClipboardList, badge: pendingApplications.length },
    { section: 'repayments', label: 'Repayments', Icon: RefreshCcw },
    { section: 'savings', label: 'Savings Ledger', Icon: WalletCards },
    { section: 'dividends', label: 'Dividends', Icon: CircleDollarSign },
    { section: 'bulk', label: 'Bulk Statements', Icon: FileSpreadsheet },
    { section: 'terms', label: 'Terms & Conditions', Icon: FileText },
  ]

  async function handleRefreshClick() {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setTimeout(() => setIsRefreshing(false), 600)
    }
  }

  function beginMemberEdit(member: AdminMember) {
    setEditingMemberId(member.id)
    setMemberForm({
      fullName: member.fullName,
      phoneNumber: member.phoneNumber,
      email: member.email,
      county: member.county,
      subCounty: member.subCounty,
      bankName: member.bankName,
      bankBranch: member.bankBranch,
      bankAccountName: member.bankAccountName,
      bankAccountNumber: member.bankAccountNumber,
      bankTwoName: member.bankTwoName,
      bankTwoBranch: member.bankTwoBranch,
      bankTwoAccountName: member.bankTwoAccountName,
      bankTwoAccountNumber: member.bankTwoAccountNumber,
      location: member.location,
      maritalStatus: member.maritalStatus,
      nextKinName: member.nextKinName,
      nextKinRelationship: member.nextKinRelationship,
      nextKinPhone: member.nextKinPhone,
    })
  }

  function beginApplicationEdit(application: AdminLoanApplication) {
    setViewingApplicationId(application.id)
    setEditingApplicationId(application.id)
    setApplicationForm({
      requestedAmount: String(application.requestedAmount),
      repaymentMonths: String(application.repaymentMonths),
      purpose: application.purpose,
    })
  }

  async function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingApplicationId === null) return
    const saved = await onUpdateLoanApplication(editingApplicationId, {
      requestedAmount: Number(applicationForm.requestedAmount),
      repaymentMonths: Number(applicationForm.repaymentMonths),
      purpose: applicationForm.purpose,
    })
    if (saved) setEditingApplicationId(null)
  }

  async function removeMember(member: AdminMember) {
    if (
      !window.confirm(
        `Are you sure you want to delete member ${member.fullName}? Accounts with financial transactions or loans cannot be removed.`,
      )
    )
      return
    await onDeleteMember(member.id)
    if (viewingMemberId === member.id) setViewingMemberId(null)
  }

  async function removeApplication(application: AdminLoanApplication) {
    if (
      !window.confirm(
        `Delete the ${application.status} loan application #${application.id} submitted by ${application.fullName}?`,
      )
    )
      return
    await onDeleteLoanApplication(application.id)
    if (viewingApplicationId === application.id) setViewingApplicationId(null)
  }

  async function saveMemberDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingMemberId === null) return
    setMemberSaving(true)
    if (await onUpdateMember(editingMemberId, memberForm)) {
      setEditingMemberId(null)
    }
    setMemberSaving(false)
  }

  async function saveTerms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTermsSaving(true)
    setTermsMessage('')
    if (await onSaveTerms(terms)) {
      setTermsMessage('Terms and conditions published successfully.')
    }
    setTermsSaving(false)
  }

  return (
    <div className="admin-root-layout">
      {/* Executive Top Navigation Header */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <a className="admin-topbar-brand" href="/" aria-label="Magomano SACCO core administration">
            <div className="admin-brand-icon">
              <Landmark size={20} strokeWidth={2.2} />
            </div>
            <div className="admin-brand-titles">
              <span className="brand-title-main">MAGOMANO SACCO</span>
              <span className="brand-title-badge">ADMINISTRATION CONSOLE</span>
            </div>
          </a>
          <div className="admin-system-status">
            <span className="status-indicator-dot" />
            <span>Core Banking Active</span>
          </div>
        </div>

        <div className="admin-topbar-right">
          <button
            type="button"
            className="admin-header-refresh-btn"
            onClick={() => void handleRefreshClick()}
            disabled={isRefreshing}
            title="Refresh SACCO data"
          >
            <RefreshCcw size={15} className={isRefreshing ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>

          <div className="admin-user-pill">
            <div className="admin-user-avatar">
              <User size={15} />
            </div>
            <div className="admin-user-details">
              <strong className="admin-user-name">{signedInAdmin}</strong>
              <small className="admin-user-role">System Administrator</small>
            </div>
          </div>

          <button
            type="button"
            className="admin-header-logout-btn"
            onClick={onLogout}
            title="Sign out of administration"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <div className="admin-main-container">
        {/* Navigation Sidebar */}
        <aside className="admin-navbar">
          <div className="admin-nav-group-label">OPERATIONS &amp; LEDGERS</div>
          <nav className="admin-nav-menu" aria-label="Admin modules">
            {navigationItems.map(({ section, label, Icon, badge }) => (
              <button
                key={section}
                type="button"
                aria-current={view === section ? 'page' : undefined}
                className={`admin-nav-link ${view === section ? 'active' : ''}`}
                onClick={() => setView(section)}
              >
                <div className="nav-icon-wrap">
                  <Icon size={18} />
                </div>
                <span className="nav-label">{label}</span>
                {typeof badge === 'number' && badge > 0 && (
                  <span className="nav-badge-pill" title={`${badge} pending review`}>
                    <AnimatedFigure value={badge} format="number" />
                  </span>
                )}
                {view === section && <ChevronRight size={14} className="active-arrow" />}
              </button>
            ))}
          </nav>

          <div className="admin-nav-footer">
            <div className="nav-footer-card">
              <ShieldCheck size={16} />
              <div>
                <strong>Audited &amp; Regulated</strong>
                <p>Co-operative Societies Act Cap 490 Kenya</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="admin-viewport">
          {/* Global Alert Notification */}
          {message && (
            <div
              className={`admin-banner-alert ${messageSuccess ? 'alert-success' : 'alert-error'}`}
              role="status"
            >
              {messageSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="banner-alert-text">{message}</span>
            </div>
          )}

          {/* VIEW: OVERVIEW */}
          {view === 'overview' && (
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
                    Active Members: <strong>{summary?.members.approvedMembers ?? approvedMembers.length}</strong>
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

                <article className="kpi-card dividend-kpi">
                  <div className="kpi-card-header">
                    <span className="kpi-title">DIVIDENDS DISTRIBUTED</span>
                    <div className="kpi-icon-wrap dividend-icon">
                      <CircleDollarSign size={20} />
                    </div>
                  </div>
                  <strong className="kpi-value">
                    <AnimatedFigure value={summary?.dividendsPaid ?? 0} />
                  </strong>
                  <div className="kpi-footer">
                    <span className="kpi-subtext">Total dividends disbursed to date</span>
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
                  <button type="button" className="quick-btn" onClick={() => setView('savings')}>
                    <WalletCards size={16} />
                    <span>Record Savings Deposit</span>
                  </button>
                  <button type="button" className="quick-btn" onClick={() => setView('repayments')}>
                    <RefreshCcw size={16} />
                    <span>Record Loan Repayment</span>
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
          )}

          {/* VIEW: MEMBERS */}
          {view === 'members' && (
            <div className="admin-view-panel">
              <div className="view-intro-header">
                <div>
                  <h1 className="view-page-title">Member Accounts Directory</h1>
                  <p className="view-page-desc">
                    Manage member verification, contact details, bank accounts, and role permissions.
                  </p>
                </div>
                <div className="view-intro-meta">
                  <span className="count-pill">
                    Total: <AnimatedFigure value={members.length} format="number" />
                  </span>
                </div>
              </div>

              {/* Search & Filter Controls */}
              <div className="table-controls-bar">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="Search by name, National ID, phone, or email…"
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
                    Pending Review ({pendingMembers.length})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${memberFilter === 'approved' ? 'active' : ''}`}
                    onClick={() => setMemberFilter('approved')}
                  >
                    Active ({approvedMembers.length})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${memberFilter === 'signatory' ? 'active' : ''}`}
                    onClick={() => setMemberFilter('signatory')}
                  >
                    Signatories ({signatories.length})
                  </button>
                </div>
              </div>

              {/* Edit Member Modal */}
              {editingMemberId !== null && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                  <div className="modal-dialog-card">
                    <div className="modal-dialog-header">
                      <div>
                        <span className="modal-kicker">MEMBER PROFILE MANAGEMENT</span>
                        <h2>
                          Edit {members.find((m) => m.id === editingMemberId)?.fullName ?? 'Member'} Profile
                        </h2>
                      </div>
                      <button
                        type="button"
                        className="modal-close-btn"
                        onClick={() => setEditingMemberId(null)}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form className="modal-form-content" onSubmit={saveMemberDetails}>
                      <div className="form-section-card">
                        <span className="form-sec-heading">Personal Information</span>
                        <div className="form-fields-grid">
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
                        <button
                          type="button"
                          className="action-btn-cancel"
                          onClick={() => setEditingMemberId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="submit-button"
                          disabled={memberSaving || reviewingId === `member-details-${editingMemberId}`}
                        >
                          <span>{memberSaving ? 'Saving profile…' : 'Save Member Details'}</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Member Details Drawer */}
              {viewingMember && (
                <div className="member-details-drawer-backdrop" onClick={() => setViewingMemberId(null)}>
                  <aside
                    className="member-details-drawer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Details for ${viewingMember.fullName}`}
                  >
                    <div className="drawer-header">
                      <div className="drawer-member-title">
                        <div className="drawer-avatar">
                          {viewingMember.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2>{viewingMember.fullName}</h2>
                          <span className="drawer-id">National ID: {viewingMember.nationalId}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="modal-close-btn"
                        onClick={() => setViewingMemberId(null)}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="drawer-body">
                      {/* Status & Role Badges */}
                      <div className="drawer-badge-row">
                        <span className={`status-tag status-${viewingMember.accountStatus}`}>
                          {viewingMember.accountStatus.toUpperCase()}
                        </span>
                        <span className="role-tag">
                          {viewingMember.isAdmin
                            ? 'Administrator'
                            : viewingMember.memberRole === 'signatory'
                              ? 'Authorized Signatory'
                              : 'Standard Member'}
                        </span>
                        <span className="savings-tag">
                          Savings: {currency.format(viewingMember.savingsBalance)}
                        </span>
                      </div>

                      {/* Approval buttons if pending */}
                      {viewingMember.accountStatus === 'pending' && (
                        <div className="drawer-action-callout">
                          <p>This member account is waiting for approval before sign-in is allowed.</p>
                          <div className="callout-actions">
                            <button
                              type="button"
                              className="table-btn-approve"
                              onClick={() => onReviewMember(viewingMember.id, 'approve')}
                              disabled={reviewingId === `member-${viewingMember.id}`}
                            >
                              <Check size={14} /> Approve Account
                            </button>
                            <button
                              type="button"
                              className="table-btn-reject"
                              onClick={() => onReviewMember(viewingMember.id, 'reject')}
                              disabled={reviewingId === `member-${viewingMember.id}`}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Section: Contacts */}
                      <div className="drawer-section">
                        <h4>Contact &amp; Location</h4>
                        <dl className="drawer-dl">
                          <div>
                            <dt>Phone Number</dt>
                            <dd>{viewingMember.phoneNumber || '—'}</dd>
                          </div>
                          <div>
                            <dt>Email Address</dt>
                            <dd>{viewingMember.email || '—'}</dd>
                          </div>
                          <div>
                            <dt>Location</dt>
                            <dd>
                              {[viewingMember.location, viewingMember.subCounty, viewingMember.county]
                                .filter(Boolean)
                                .join(', ') || '—'}
                            </dd>
                          </div>
                          <div>
                            <dt>Marital Status</dt>
                            <dd>{viewingMember.maritalStatus || 'Not specified'}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Section: Bank Accounts */}
                      <div className="drawer-section">
                        <h4>Disbursement Banking Facilities</h4>
                        <div className="drawer-bank-card">
                          <strong>Primary Bank Account</strong>
                          <p>
                            {viewingMember.bankName || 'Not recorded'}
                            {viewingMember.bankBranch ? ` (${viewingMember.bankBranch})` : ''}
                          </p>
                          <small>
                            Holder: {viewingMember.bankAccountName || '—'} · A/C: {viewingMember.bankAccountNumber || '—'}
                          </small>
                        </div>
                        {viewingMember.bankTwoName && (
                          <div className="drawer-bank-card secondary">
                            <strong>Secondary Bank Account</strong>
                            <p>
                              {viewingMember.bankTwoName}
                              {viewingMember.bankTwoBranch ? ` (${viewingMember.bankTwoBranch})` : ''}
                            </p>
                            <small>
                              Holder: {viewingMember.bankTwoAccountName || '—'} · A/C: {viewingMember.bankTwoAccountNumber || '—'}
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
                            <dd>{viewingMember.nextKinName || '—'}</dd>
                          </div>
                          <div>
                            <dt>Relationship</dt>
                            <dd>{viewingMember.nextKinRelationship || '—'}</dd>
                          </div>
                          <div>
                            <dt>Phone</dt>
                            <dd>{viewingMember.nextKinPhone || '—'}</dd>
                          </div>
                        </dl>
                        {viewingMember.contacts.length > 0 && (
                          <div className="drawer-contacts-sublist">
                            <span className="sublist-title">Registered Emergency Contacts:</span>
                            <ul>
                              {viewingMember.contacts.map((c) => (
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
                            className={`role-pill-btn ${viewingMember.memberRole === 'member' ? 'active' : ''}`}
                            onClick={() => onSetMemberRole(viewingMember.id, 'member')}
                            disabled={reviewingId === `member-role-${viewingMember.id}`}
                          >
                            Standard Member
                          </button>
                          <button
                            type="button"
                            className={`role-pill-btn ${viewingMember.memberRole === 'signatory' ? 'active' : ''}`}
                            onClick={() => onSetMemberRole(viewingMember.id, 'signatory')}
                            disabled={reviewingId === `member-role-${viewingMember.id}`}
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
                        onClick={() => {
                          beginMemberEdit(viewingMember)
                          setViewingMemberId(null)
                        }}
                      >
                        <Pencil size={14} /> Edit Profile
                      </button>
                      <button
                        type="button"
                        className="drawer-delete-btn"
                        onClick={() => void removeMember(viewingMember)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </aside>
                </div>
              )}

              {/* Members Data Table */}
              <div className="admin-table-container">
                <table className="modern-admin-table">
                  <thead>
                    <tr>
                      <th>MEMBER</th>
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
                        <td>
                          <span className="badge-id">{member.nationalId}</span>
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
                            <span className="role-tag-signatory">Signatory</span>
                          ) : (
                            <span className="role-tag-member">Member</span>
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
          )}

          {/* VIEW: LOAN APPLICATIONS */}
          {view === 'loans' && (
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
                    Pending Review ({pendingApplications.length})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${loanFilter === 'approved' ? 'active' : ''}`}
                    onClick={() => setLoanFilter('approved')}
                  >
                    Approved ({applications.filter((a) => a.status === 'approved').length})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${loanFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setLoanFilter('rejected')}
                  >
                    Rejected ({applications.filter((a) => a.status === 'rejected').length})
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
                      <th className="actions-col">ACTIONS</th>
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
                        <td className="actions-col">
                          <div className="row-actions-group">
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
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="table-btn-approve"
                                  onClick={() => onReviewLoan(app.id, 'approve')}
                                  disabled={reviewingId === `loan-${app.id}`}
                                  title="Approve and issue loan"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="table-btn-reject"
                                  onClick={() => onReviewLoan(app.id, 'reject')}
                                  disabled={reviewingId === `loan-${app.id}`}
                                  title="Reject application"
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

              {/* Statement Panels */}
              <div className="historical-statements-wrap">
                <AdminStatementPanel
                  type="applications"
                  title="Loan Application Audit History"
                  refreshKey={statementRefreshKey}
                />
                <AdminStatementPanel
                  type="loans"
                  title="Active &amp; Issued Loans Statement"
                  refreshKey={statementRefreshKey}
                />
              </div>
            </div>
          )}

          {/* VIEW: REPAYMENTS */}
          {view === 'repayments' && (
            <div className="admin-view-panel">
              <div className="view-intro-header">
                <div>
                  <h1 className="view-page-title">Loan Repayments Ledger</h1>
                  <p className="view-page-desc">
                    Record loan payments against active credit facilities and view repayment ledgers.
                  </p>
                </div>
              </div>

              <div className="admin-workspace-grid">
                {/* Repayment Recorder Form */}
                <form className="workspace-card form-card" onSubmit={onLoanRepayment}>
                  <div className="workspace-card-heading">
                    <RefreshCcw size={18} />
                    <h3>Record Loan Payment</h3>
                  </div>

                  <label htmlFor="repayment-loan">
                    Select Active Facility
                    <select
                      id="repayment-loan"
                      value={repaymentLoanId}
                      onChange={(e) => setRepaymentLoanId(e.target.value)}
                      required
                      disabled={!openLoans.length}
                    >
                      <option value="" disabled>
                        Choose an active loan with outstanding balance…
                      </option>
                      {openLoans.map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          {loan.reference} · {loan.fullName} ({currency.format(loan.outstandingBalance)} due)
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Active Loan Details Callout */}
                  {selectedLoan && (
                    <div className="selected-loan-preview-box">
                      <div className="preview-row">
                        <span>Borrower:</span>
                        <strong>{selectedLoan.fullName}</strong>
                      </div>
                      <div className="preview-row">
                        <span>Loan Reference:</span>
                        <span className="badge-id">{selectedLoan.reference}</span>
                      </div>
                      <div className="preview-row">
                        <span>Total Repayable:</span>
                        <span>{currency.format(selectedLoan.totalRepayable)}</span>
                      </div>
                      <div className="preview-row balance-row">
                        <span>Current Outstanding Balance:</span>
                        <strong className="balance-due-text">
                          {currency.format(selectedLoan.outstandingBalance)}
                        </strong>
                      </div>
                      <div className="quick-fill-row">
                        <button
                          type="button"
                          className="quick-fill-btn"
                          onClick={() => setRepaymentAmount(String(selectedLoan.outstandingBalance))}
                        >
                          Pay Full Balance ({currency.format(selectedLoan.outstandingBalance)})
                        </button>
                      </div>
                    </div>
                  )}

                  <label htmlFor="repayment-amount">
                    Payment Amount (KES)
                    <div className="amount-input-wrap">
                      <span>KES</span>
                      <input
                        id="repayment-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={repaymentAmount}
                        onChange={(e) => setRepaymentAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </label>

                  <label htmlFor="repayment-description">
                    Payment Reference / Note <span className="optional-tag">Optional</span>
                    <input
                      id="repayment-description"
                      type="text"
                      maxLength={120}
                      value={repaymentDescription}
                      onChange={(e) => setRepaymentDescription(e.target.value)}
                      placeholder="e.g. Monthly loan repayment via M-Pesa"
                    />
                  </label>

                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting || !openLoans.length}
                  >
                    <span>{submitting ? 'Recording Payment…' : 'Post Loan Repayment'}</span>
                    <ArrowRight size={18} />
                  </button>
                </form>

                {/* Open Loans Directory List */}
                <div className="workspace-card directory-card">
                  <div className="workspace-card-heading">
                    <ClipboardList size={18} />
                    <h3>Open Loans Awaiting Payment ({openLoans.length})</h3>
                  </div>

                  <div className="search-input-wrap">
                    <Search size={15} />
                    <input
                      type="search"
                      placeholder="Filter open loans by borrower or reference…"
                      value={repaymentSearch}
                      onChange={(e) => setRepaymentSearch(e.target.value)}
                    />
                  </div>

                  <div className="open-loans-list-scroll">
                    {filteredOpenLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className={`open-loan-item ${String(loan.id) === repaymentLoanId ? 'selected-loan' : ''}`}
                        onClick={() => setRepaymentLoanId(String(loan.id))}
                      >
                        <div className="loan-item-top">
                          <span className="loan-ref-pill">{loan.reference}</span>
                          <strong className="loan-balance-due">
                            {currency.format(loan.outstandingBalance)} due
                          </strong>
                        </div>
                        <div className="loan-item-bottom">
                          <span className="borrower-name">{loan.fullName}</span>
                          <span className="term-note">{loan.repaymentMonths} mos term</span>
                        </div>
                      </div>
                    ))}
                    {!filteredOpenLoans.length && (
                      <p className="no-items-text">No active loans with outstanding balances found.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="historical-statements-wrap">
                <AdminStatementPanel
                  type="repayments"
                  title="Loan Repayment Statement"
                  refreshKey={statementRefreshKey}
                />
              </div>
            </div>
          )}

          {/* VIEW: SAVINGS LEDGER */}
          {view === 'savings' && (
            <div className="admin-view-panel">
              <div className="view-intro-header">
                <div>
                  <h1 className="view-page-title">Savings Ledger &amp; Deposits</h1>
                  <p className="view-page-desc">
                    Record member monthly contributions and view historical deposit statements. Member savings serve as loan collateral.
                  </p>
                </div>
              </div>

              <div className="admin-workspace-grid">
                {/* Savings Entry Form */}
                <form className="workspace-card form-card" onSubmit={onSavingsEntry}>
                  <div className="workspace-card-heading">
                    <WalletCards size={18} />
                    <h3>Record Savings Deposit</h3>
                  </div>

                  <label htmlFor="admin-member">
                    Member Account
                    <select
                      id="admin-member"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      required
                      disabled={!approvedMembers.length}
                    >
                      <option value="" disabled>
                        Select an approved member account…
                      </option>
                      {approvedMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nationalId} · {m.fullName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label htmlFor="admin-entry-amount">
                    Deposit Amount (KES)
                    <div className="amount-input-wrap">
                      <span>KES</span>
                      <input
                        id="admin-entry-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </label>

                  <label htmlFor="admin-entry-description">
                    Deposit Reference <span className="optional-tag">Optional</span>
                    <input
                      id="admin-entry-description"
                      type="text"
                      maxLength={120}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Monthly contribution - October 2026"
                    />
                  </label>

                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting || !approvedMembers.length}
                  >
                    <span>{submitting ? 'Posting Deposit…' : 'Post Savings Deposit'}</span>
                    <ArrowRight size={18} />
                  </button>
                </form>

                {/* Selected Member Detail Summary */}
                <aside className="workspace-card summary-card">
                  <div className="workspace-card-heading">
                    <User size={18} />
                    <h3>Selected Member Overview</h3>
                  </div>

                  {selectedMember ? (
                    <div className="member-summary-panel">
                      <div className="summary-profile-header">
                        <div className="summary-avatar">
                          {selectedMember.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4>{selectedMember.fullName}</h4>
                          <span className="summary-id">National ID: {selectedMember.nationalId}</span>
                        </div>
                      </div>

                      <div className="summary-metric-box">
                        <span className="sm-label">CURRENT SAVINGS BALANCE</span>
                        <strong className="sm-val">
                          <AnimatedFigure value={selectedMember.savingsBalance} />
                        </strong>
                        <span className="sm-sub">Available as security reserve</span>
                      </div>

                      <div className="summary-info-rows">
                        <div className="info-row">
                          <span>Phone:</span>
                          <strong>{selectedMember.phoneNumber || '—'}</strong>
                        </div>
                        <div className="info-row">
                          <span>Location:</span>
                          <span>{[selectedMember.subCounty, selectedMember.county].filter(Boolean).join(', ') || '—'}</span>
                        </div>
                        <div className="info-row">
                          <span>Account Role:</span>
                          <span className="badge-pill">
                            {selectedMember.memberRole === 'signatory' ? 'Signatory' : 'Standard Member'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="summary-placeholder">
                      <UsersRound size={28} />
                      <p>Select a member from the dropdown to view their account balance and profile details.</p>
                    </div>
                  )}
                </aside>
              </div>

              <div className="historical-statements-wrap">
                <AdminStatementPanel
                  type="savings"
                  title="Savings Deposits Statement"
                  refreshKey={statementRefreshKey}
                />
              </div>
            </div>
          )}

          {/* VIEW: DIVIDENDS */}
          {view === 'dividends' && (
            <div className="admin-view-panel">
              <div className="view-intro-header">
                <div>
                  <h1 className="view-page-title">Dividend Distribution Ledger</h1>
                  <p className="view-page-desc">
                    Record annual or periodic dividend distributions to approved SACCO members.
                  </p>
                </div>
              </div>

              <div className="admin-workspace-grid">
                {/* Dividend Distribution Form */}
                <form className="workspace-card form-card" onSubmit={onDividendPayment}>
                  <div className="workspace-card-heading">
                    <CircleDollarSign size={18} />
                    <h3>Record Dividend Payment</h3>
                  </div>

                  <label htmlFor="dividend-member">
                    Recipient Member
                    <select
                      id="dividend-member"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      required
                      disabled={!approvedMembers.length}
                    >
                      <option value="" disabled>
                        Select an approved member…
                      </option>
                      {approvedMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nationalId} · {m.fullName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label htmlFor="dividend-period">
                    Financial Year / Period
                    <input
                      id="dividend-period"
                      type="text"
                      maxLength={24}
                      placeholder="e.g. FY 2025/2026"
                      value={dividendPeriod}
                      onChange={(e) => setDividendPeriod(e.target.value)}
                      required
                    />
                  </label>

                  <label htmlFor="dividend-amount">
                    Dividend Amount (KES)
                    <div className="amount-input-wrap">
                      <span>KES</span>
                      <input
                        id="dividend-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={dividendAmount}
                        onChange={(e) => setDividendAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </label>

                  <label htmlFor="dividend-description">
                    Description / Note <span className="optional-tag">Optional</span>
                    <input
                      id="dividend-description"
                      type="text"
                      maxLength={120}
                      value={dividendDescription}
                      onChange={(e) => setDividendDescription(e.target.value)}
                      placeholder="e.g. Annual dividend payout based on share capital"
                    />
                  </label>

                  <button
                    className="submit-button"
                    type="submit"
                    disabled={submitting || !approvedMembers.length}
                  >
                    <span>{submitting ? 'Recording Distribution…' : 'Post Dividend Payment'}</span>
                    <ArrowRight size={18} />
                  </button>
                </form>

                {/* Recent Dividends List */}
                <div className="workspace-card directory-card">
                  <div className="workspace-card-heading">
                    <Clock size={18} />
                    <h3>Recent Recorded Payments ({dividends.length})</h3>
                  </div>

                  <div className="open-loans-list-scroll">
                    {dividends.slice(0, 10).map((p) => (
                      <div
                        key={p.id}
                        className={`open-loan-item ${viewingDividendId === p.id ? 'selected-loan' : ''}`}
                        onClick={() => setViewingDividendId(viewingDividendId === p.id ? null : p.id)}
                      >
                        <div className="loan-item-top">
                          <span className="loan-ref-pill">{p.financialPeriod}</span>
                          <strong className="dividend-amount-pill">{currency.format(p.amount)}</strong>
                        </div>
                        <div className="loan-item-bottom">
                          <span className="borrower-name">{p.fullName}</span>
                          <span className="term-note">{formatDate(p.paidAt)}</span>
                        </div>
                        {viewingDividendId === p.id && (
                          <div className="dividend-expanded-detail">
                            <p>
                              <strong>National ID:</strong> {p.nationalId}
                            </p>
                            <p>
                              <strong>Note:</strong> {p.description || 'No note recorded.'}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    {!dividends.length && (
                      <p className="no-items-text">No dividend payments recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="historical-statements-wrap">
                <AdminStatementPanel
                  type="dividends"
                  title="Dividend Disbursements Statement"
                  refreshKey={statementRefreshKey}
                />
              </div>
            </div>
          )}

          {/* VIEW: BULK CSV IMPORT */}
          {view === 'bulk' && (
            <div className="admin-view-panel">
              <div className="view-intro-header">
                <div>
                  <h1 className="view-page-title">Monthly Statement CSV Import</h1>
                  <p className="view-page-desc">
                    Batch upload monthly member savings statements and loan repayment files with atomic server validation.
                  </p>
                </div>
              </div>
              <BulkImportPanel onImported={onRefresh} />
            </div>
          )}

          {/* VIEW: TERMS & CONDITIONS */}
          {view === 'terms' && (
            <div className="admin-view-panel">
              <div className="view-intro-header">
                <div>
                  <h1 className="view-page-title">Member Terms &amp; SACCO By-Laws</h1>
                  <p className="view-page-desc">
                    Draft, update, and publish official rules and credit terms presented to members on registration and within their account.
                  </p>
                </div>
                {termsUpdatedAt && (
                  <div className="view-intro-meta">
                    <span className="timestamp-badge">Last published: {formatDate(termsUpdatedAt)}</span>
                  </div>
                )}
              </div>

              <form className="terms-editor-card" onSubmit={saveTerms}>
                <div className="terms-editor-header">
                  <div>
                    <h3>Published SACCO Terms &amp; Policies</h3>
                    <p>Enter the legally binding rules governing member savings, loans, and guarantees.</p>
                  </div>
                  <span className="char-counter">{terms.length} / 20,000 characters</span>
                </div>

                <textarea
                  id="admin-terms"
                  className="terms-textarea"
                  value={terms}
                  onChange={(e) => {
                    setTerms(e.target.value)
                    setTermsMessage('')
                  }}
                  rows={16}
                  maxLength={20000}
                  minLength={20}
                  placeholder="Enter the official SACCO terms and conditions..."
                  required
                />

                {termsMessage && (
                  <div className="admin-banner-alert alert-success">
                    <CheckCircle2 size={16} />
                    <span>{termsMessage}</span>
                  </div>
                )}

                <div className="terms-actions-bar">
                  <span className="terms-note">
                    Changes take effect immediately for all member sign-ups and loan applications.
                  </span>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={termsSaving || terms.trim().length < 20}
                  >
                    <span>{termsSaving ? 'Publishing Terms…' : 'Publish Terms & Conditions'}</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* LOAN APPLICATION OFFICIAL DOCUMENT MODAL */}
      {viewingApplication && (
        <LoanDocumentModal
          application={viewingApplication}
          member={viewingApplicationMember}
          signatories={signatories}
          isEditing={editingApplicationId === viewingApplication.id}
          setIsEditing={(editing) => {
            if (editing) {
              beginApplicationEdit(viewingApplication)
            } else {
              setEditingApplicationId(null)
            }
          }}
          applicationForm={applicationForm}
          setApplicationForm={setApplicationForm}
          onSaveApplication={saveApplication}
          saving={reviewingId === `edit-loan-${viewingApplication.id}`}
          onClose={() => {
            setViewingApplicationId(null)
            setEditingApplicationId(null)
          }}
          onApprove={() => onReviewLoan(viewingApplication.id, 'approve')}
          onReject={() => onReviewLoan(viewingApplication.id, 'reject')}
          isActionLoading={reviewingId === `loan-${viewingApplication.id}`}
        />
      )}
    </div>
  )
}
