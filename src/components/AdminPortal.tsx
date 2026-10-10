import { useState, type Dispatch, type FormEvent, type FormEventHandler, type SetStateAction } from 'react'
import { ArrowRight, CircleDollarSign, ClipboardList, FileSpreadsheet, FileText, Landmark, LayoutDashboard, LogOut, RefreshCcw, UsersRound, WalletCards } from 'lucide-react'
import { AnimatedFigure } from './AnimatedFigure'
import { BulkImportPanel } from './BulkImportPanel'
import { AdminStatementPanel } from './AdminStatementPanel'
import { currency, formatDate } from '../format'
import type { AdminDividend, AdminLoanApplication, AdminMember, AdminOpenLoan, AdminSummary, AdminView, MemberProfileUpdate } from '../types'

interface AdminPortalProps {
  signedInAdmin: string
  isSuperAdmin: boolean
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
  onPromoteMember: (memberId: number) => void
  onReviewLoan: (applicationId: number, decision: 'approve' | 'reject') => void
  onUpdateMember: (memberId: number, details: MemberProfileUpdate) => Promise<boolean>
  terms: string
  setTerms: Dispatch<SetStateAction<string>>
  termsUpdatedAt: string | null
  onSaveTerms: (terms: string) => Promise<boolean>
  onRefresh: () => Promise<void>
}

export function AdminPortal({
  signedInAdmin,
  isSuperAdmin,
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
  onPromoteMember,
  onReviewLoan,
  onUpdateMember,
  terms,
  setTerms,
  termsUpdatedAt,
  onSaveTerms,
  onRefresh,
}: AdminPortalProps) {
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null)
  const [memberForm, setMemberForm] = useState<MemberProfileUpdate>({
    fullName: '', phoneNumber: '', email: '', county: '', subCounty: '',
    bankName: '', bankBranch: '', bankAccountName: '', bankAccountNumber: '',
    bankTwoName: '', bankTwoBranch: '', bankTwoAccountName: '', bankTwoAccountNumber: '',
    location: '', maritalStatus: '', nextKinName: '', nextKinRelationship: '', nextKinPhone: '',
  })
  const [memberSaving, setMemberSaving] = useState(false)
  const [termsSaving, setTermsSaving] = useState(false)
  const [termsMessage, setTermsMessage] = useState('')
  const approvedMembers = members.filter((member) => member.accountStatus === 'approved')
  const selectedMember = approvedMembers.find((member) => String(member.id) === memberId)
  const pendingMembers = members.filter((member) => member.accountStatus === 'pending')
  const pendingApplications = applications.filter((application) => application.status === 'pending')
  const navigationItems = [
    { section: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { section: 'members', label: 'Members', Icon: UsersRound },
    { section: 'loans', label: 'Loan applications', Icon: ClipboardList },
    { section: 'repayments', label: 'Repayments', Icon: RefreshCcw },
    { section: 'bulk', label: 'Bulk statements', Icon: FileSpreadsheet },
    { section: 'savings', label: 'Savings ledger', Icon: WalletCards },
    { section: 'dividends', label: 'Dividends', Icon: CircleDollarSign },
    { section: 'terms', label: 'Terms & conditions', Icon: FileText },
  ] as const

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

  async function saveMemberDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingMemberId === null) return
    setMemberSaving(true)
    if (await onUpdateMember(editingMemberId, memberForm)) setEditingMemberId(null)
    setMemberSaving(false)
  }

  async function saveTerms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTermsSaving(true)
    setTermsMessage('')
    if (await onSaveTerms(terms)) setTermsMessage('Terms and conditions saved.')
    setTermsSaving(false)
  }

  return (
    <main className="member-dashboard admin-dashboard">
      <header className="dashboard-header">
        <a className="dashboard-brand brand" href="/" aria-label="Magomano SACCO admin">
          <span className="brand-mark"><Landmark size={21} strokeWidth={1.8} /></span>
          <span className="brand-name">magomano<span>admin</span></span>
        </a>
        <div className="admin-header-actions">
          <span>{signedInAdmin}</span>
          <button type="button" className="admin-signout" onClick={onLogout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <aside className="admin-sidebar">
        <p className="admin-sidebar-label">SACCO WORKSPACE</p>
        <nav className="admin-tabs" aria-label="Admin sections">
          {navigationItems.map(({ section, label, Icon }) => (
            <button
              key={section}
              type="button"
              aria-current={view === section ? 'page' : undefined}
              className={view === section ? 'active' : ''}
              onClick={() => setView(section)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
              {section === 'members' && pendingMembers.length > 0 && <span className="tab-count"><AnimatedFigure value={pendingMembers.length} format="number" /></span>}
              {section === 'loans' && pendingApplications.length > 0 && <span className="tab-count"><AnimatedFigure value={pendingApplications.length} format="number" /></span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-note">
          <Landmark size={17} />
          <span>Member-first financial services</span>
        </div>
      </aside>

      <section className="dashboard-content admin-content">
        <div className="dashboard-intro">
          <p className="dashboard-kicker">ADMINISTRATION</p>
          <h1>{view === 'overview' ? 'SACCO overview' : view === 'members' ? 'Member accounts' : view === 'loans' ? 'Loan applications' : view === 'repayments' ? 'Loan repayments' : view === 'bulk' ? 'Monthly statements' : view === 'savings' ? 'Savings ledger' : view === 'terms' ? 'Terms and conditions' : 'Dividends'}</h1>
          <p>{view === 'overview'
            ? 'Organization-wide totals and items waiting for review.'
            : view === 'members'
              ? 'Review member account requests before allowing sign-in.'
              : view === 'loans'
                ? 'Review requests. Approving a request issues the loan.'
                : view === 'repayments'
                  ? 'Record payments against loans that have been issued.'
                    : view === 'bulk'
                      ? 'Import monthly savings statements and loan repayments from CSV.'
                  : view === 'savings'
                    ? 'Record a savings deposit. Members borrow through loans; savings cannot be withdrawn.'
                    : view === 'terms'
                      ? 'Write and publish the current SACCO terms for members.'
                      : 'Record dividends paid to approved members.'}</p>
        </div>

        {message && <p className={`form-message admin-global-message ${messageSuccess ? 'success' : 'error'}`} role="status">{message}</p>}

        {view === 'overview' && (
          <>
            <section className="admin-metric-grid" aria-label="SACCO financial totals">
              <article className="admin-metric"><span>Total savings</span><strong><AnimatedFigure value={summary?.totalSavings ?? 0} /></strong><small>Member savings balances</small></article>
              <article className="admin-metric"><span>Loans issued</span><strong><AnimatedFigure value={summary?.loansIssued ?? 0} /></strong><small>Total principal approved and issued</small></article>
              <article className="admin-metric"><span>Outstanding repayments</span><strong><AnimatedFigure value={summary?.pendingPayments ?? 0} /></strong><small>Current loan balances</small></article>
              <article className="admin-metric"><span>Dividends paid</span><strong><AnimatedFigure value={summary?.dividendsPaid ?? 0} /></strong><small>Recorded dividend payments</small></article>
            </section>
            <section className="admin-queue-grid" aria-label="Items awaiting review">
              <article className="admin-queue-item">
                <div><span>Member accounts to review</span><strong><AnimatedFigure value={summary?.members.pendingMembers ?? 0} format="number" /></strong></div>
                <button type="button" onClick={() => setView('members')}>Review accounts <ArrowRight size={16} /></button>
              </article>
              <article className="admin-queue-item">
                <div><span>Loan applications to review</span><strong><AnimatedFigure value={summary?.pendingLoanApplications ?? 0} format="number" /></strong></div>
                <button type="button" onClick={() => setView('loans')}>Review applications <ArrowRight size={16} /></button>
              </article>
            </section>
            <p className="admin-metric-note">Totals are calculated from posted savings, issued loans, outstanding loan balances, and recorded dividend payments. No dividend formula is assumed.</p>
          </>
        )}

        {view === 'members' && (
          <section className="admin-record-list" aria-label="Member accounts">
            {pendingMembers.length > 0 && <h2 className="admin-list-heading">Waiting for approval</h2>}
            {pendingMembers.map((member) => (
              <article className="admin-record" key={member.id}>
                <div className="admin-record-main">
                  <strong>{member.fullName}</strong>
                  <span>National ID {member.nationalId} · {member.phoneNumber}</span>
                  <small>Registered {member.accountStatus}</small>
                  <details className="admin-member-review-details">
                    <summary>Review application details</summary>
                    <div>
                      <p><strong>Location</strong> {[member.county, member.subCounty, member.location].filter(Boolean).join(' · ') || 'Not provided'}</p>
                      <p><strong>Email</strong> {member.email || 'Not provided'}</p>
                      <p><strong>Bank accounts</strong> {[member.bankName && `${member.bankName}${member.bankBranch ? `, ${member.bankBranch}` : ''} · ${member.bankAccountNumber}`, member.bankTwoName && `${member.bankTwoName}${member.bankTwoBranch ? `, ${member.bankTwoBranch}` : ''} · ${member.bankTwoAccountNumber}`].filter(Boolean).join(' · ') || 'Not provided'}</p>
                      <p><strong>Contact persons</strong> {member.contacts.length ? member.contacts.map((contact) => `${contact.fullName} (${contact.relationship}, ${contact.phoneNumber})`).join(' · ') : 'Not provided'}</p>
                      <p><strong>Terms acceptance recorded</strong> {member.termsAcceptedAt || 'Not recorded'}</p>
                    </div>
                  </details>
                </div>
                <div className="admin-record-actions">
                  <button type="button" className="approve-button" onClick={() => beginMemberEdit(member)}>Edit details</button>
                  <button type="button" className="approve-button" disabled={reviewingId === `member-${member.id}`} onClick={() => onReviewMember(member.id, 'approve')}>{reviewingId === `member-${member.id}` ? 'Saving…' : 'Approve'}</button>
                  <button type="button" className="reject-button" disabled={reviewingId === `member-${member.id}`} onClick={() => onReviewMember(member.id, 'reject')}>Reject</button>
                </div>
              </article>
            ))}
            {!pendingMembers.length && <p className="admin-empty">No member accounts are waiting for review.</p>}
              <h2 className="admin-list-heading all-members-heading">All member accounts <span><AnimatedFigure value={summary?.members.totalMembers ?? members.length} format="number" /></span></h2>
            {editingMemberId !== null && (
              <form className="member-details-form" onSubmit={saveMemberDetails}>
                <div className="member-details-form-heading">
                  <div><p className="section-kicker">MEMBER PROFILE</p><h2>Edit {members.find((member) => member.id === editingMemberId)?.fullName ?? 'member'} details</h2></div>
                  <button type="button" className="member-details-cancel" onClick={() => setEditingMemberId(null)}>Cancel</button>
                </div>
                <div className="member-details-fields">
                  <label>Full name<input value={memberForm.fullName} onChange={(event) => setMemberForm((current) => ({ ...current, fullName: event.target.value }))} maxLength={100} required /></label>
                  <label>Phone number<input type="tel" value={memberForm.phoneNumber} onChange={(event) => setMemberForm((current) => ({ ...current, phoneNumber: event.target.value }))} maxLength={32} /></label>
                  <label>Email<input type="email" value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} maxLength={254} /></label>
                  <label>County<input value={memberForm.county} onChange={(event) => setMemberForm((current) => ({ ...current, county: event.target.value }))} maxLength={100} /></label>
                  <label>Sub-county<input value={memberForm.subCounty} onChange={(event) => setMemberForm((current) => ({ ...current, subCounty: event.target.value }))} maxLength={100} /></label>
                  <label>Location<input value={memberForm.location} onChange={(event) => setMemberForm((current) => ({ ...current, location: event.target.value }))} maxLength={160} placeholder="Town, county, or area" /></label>
                  <label>Marital status<select value={memberForm.maritalStatus} onChange={(event) => setMemberForm((current) => ({ ...current, maritalStatus: event.target.value as MemberProfileUpdate['maritalStatus'] }))}>
                    <option value="">Not provided</option><option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option><option value="other">Other</option>
                  </select></label>
                  <label>Bank name<input value={memberForm.bankName} onChange={(event) => setMemberForm((current) => ({ ...current, bankName: event.target.value }))} maxLength={100} /></label>
                  <label>Bank branch<input value={memberForm.bankBranch} onChange={(event) => setMemberForm((current) => ({ ...current, bankBranch: event.target.value }))} maxLength={100} /></label>
                  <label>Account holder name<input value={memberForm.bankAccountName} onChange={(event) => setMemberForm((current) => ({ ...current, bankAccountName: event.target.value }))} maxLength={100} /></label>
                  <label>Bank account number<input value={memberForm.bankAccountNumber} onChange={(event) => setMemberForm((current) => ({ ...current, bankAccountNumber: event.target.value }))} maxLength={50} autoComplete="off" /></label>
                  <label>Second bank name<input value={memberForm.bankTwoName} onChange={(event) => setMemberForm((current) => ({ ...current, bankTwoName: event.target.value }))} maxLength={100} /></label>
                  <label>Second bank branch<input value={memberForm.bankTwoBranch} onChange={(event) => setMemberForm((current) => ({ ...current, bankTwoBranch: event.target.value }))} maxLength={100} /></label>
                  <label>Second account holder<input value={memberForm.bankTwoAccountName} onChange={(event) => setMemberForm((current) => ({ ...current, bankTwoAccountName: event.target.value }))} maxLength={100} /></label>
                  <label>Second account number<input value={memberForm.bankTwoAccountNumber} onChange={(event) => setMemberForm((current) => ({ ...current, bankTwoAccountNumber: event.target.value }))} maxLength={50} autoComplete="off" /></label>
                  <label>Next-of-kin name<input value={memberForm.nextKinName} onChange={(event) => setMemberForm((current) => ({ ...current, nextKinName: event.target.value }))} maxLength={100} /></label>
                  <label>Next-of-kin relationship<input value={memberForm.nextKinRelationship} onChange={(event) => setMemberForm((current) => ({ ...current, nextKinRelationship: event.target.value }))} maxLength={60} /></label>
                  <label>Next-of-kin phone<input type="tel" value={memberForm.nextKinPhone} onChange={(event) => setMemberForm((current) => ({ ...current, nextKinPhone: event.target.value }))} maxLength={32} /></label>
                </div>
                <button className="submit-button" type="submit" disabled={memberSaving || reviewingId === `member-details-${editingMemberId}`}>
                  <span>{memberSaving || reviewingId === `member-details-${editingMemberId}` ? 'Saving details…' : 'Save member details'}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Member</th><th>National ID</th><th>Phone</th><th>Savings</th><th>Status</th><th>Profile</th>{isSuperAdmin && <th>Admin access</th>}</tr></thead>
                <tbody>{members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.fullName}</td>
                    <td>{member.nationalId}</td>
                    <td>{member.phoneNumber || '—'}</td>
                    <td><AnimatedFigure value={member.savingsBalance} /></td>
                    <td><span className={`status-label ${member.accountStatus}`}>{member.accountStatus}</span></td>
                    <td><button type="button" className="approve-button" onClick={() => beginMemberEdit(member)}>Edit details</button></td>
                    {isSuperAdmin && <td>{member.isAdmin
                      ? <span className="status-label approved">Administrator</span>
                      : <button
                        type="button"
                        className="approve-button"
                        disabled={reviewingId === `promote-${member.id}`}
                        onClick={() => onPromoteMember(member.id)}
                      >
                        {reviewingId === `promote-${member.id}` ? 'Promoting…' : 'Promote'}
                      </button>}</td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        )}

        {view === 'loans' && (
          <>
            <section className="admin-record-list" aria-label="Loan applications awaiting review">
              {applications.length ? applications.map((application) => (
                <article className="admin-record" key={application.id}>
                  <div className="admin-record-main">
                    <strong>{application.fullName} <span className="admin-inline-id">· {application.nationalId}</span></strong>
                    <span><AnimatedFigure value={application.requestedAmount} /> principal · 10% interest · {application.repaymentMonths} months · Savings security · {application.purpose}</span>
                    <small>Applied {formatDate(application.appliedAt)} · <span className={`status-label ${application.status}`}>{application.status}</span></small>
                  </div>
                  {application.status === 'pending' && (
                    <div className="admin-record-actions">
                      <button type="button" className="approve-button" disabled={reviewingId === `loan-${application.id}`} onClick={() => onReviewLoan(application.id, 'approve')}>Approve &amp; issue</button>
                      <button type="button" className="reject-button" disabled={reviewingId === `loan-${application.id}`} onClick={() => onReviewLoan(application.id, 'reject')}>Reject</button>
                    </div>
                  )}
                </article>
              )) : <p className="admin-empty">No loan applications have been submitted.</p>}
            </section>
            <AdminStatementPanel type="applications" title="Loan application history" refreshKey={statementRefreshKey} />
            <AdminStatementPanel type="loans" title="Issued loan statement" refreshKey={statementRefreshKey} />
          </>
        )}

        {view === 'repayments' && (
          <>
            <div className="admin-workspace">
              <form className="admin-entry-form" onSubmit={onLoanRepayment}>
                <label htmlFor="repayment-loan">Active loan</label>
                <select id="repayment-loan" value={repaymentLoanId} onChange={(event) => setRepaymentLoanId(event.target.value)} required disabled={!openLoans.length}>
                  <option value="" disabled>Select an active loan</option>
                  {openLoans.map((loan) => <option key={loan.id} value={loan.id}>{loan.reference} · {loan.fullName} · {currency.format(loan.outstandingBalance)} due</option>)}
                </select>
                <label htmlFor="repayment-amount">Payment amount</label>
                <div className="amount-input-wrap"><span>KES</span><input id="repayment-amount" type="number" min="0.01" step="0.01" value={repaymentAmount} onChange={(event) => setRepaymentAmount(event.target.value)} required /></div>
                <label htmlFor="repayment-description">Payment note <span className="optional-label">Optional</span></label>
                <input id="repayment-description" className="admin-text-input" type="text" maxLength={120} value={repaymentDescription} onChange={(event) => setRepaymentDescription(event.target.value)} placeholder="e.g. Monthly loan payment" />
                {!openLoans.length && <p className="admin-empty">There are no active loans with outstanding balances.</p>}
                <button className="submit-button" type="submit" disabled={submitting || !openLoans.length}><span>{submitting ? 'Recording payment…' : 'Record loan payment'}</span>{!submitting && <ArrowRight size={18} />}</button>
              </form>
              <section className="admin-recent-dividends">
                <h2>Open loans</h2>
                {openLoans.length ? openLoans.map((loan) => (
                  <article className="dividend-row" key={loan.id}>
                    <div><strong>{loan.fullName} · {loan.reference}</strong><span>{loan.repaymentMonths} months · <AnimatedFigure value={loan.totalRepayable} /> total due</span></div>
                    <strong><AnimatedFigure value={loan.outstandingBalance} /> due</strong>
                  </article>
                )) : <p className="admin-empty">No outstanding loan payments.</p>}
              </section>
            </div>
            <AdminStatementPanel type="repayments" title="Loan repayment statement" refreshKey={statementRefreshKey} />
          </>
        )}

        {view === 'bulk' && <BulkImportPanel onImported={onRefresh} />}

        {view === 'savings' && (
          <>
            <div className="admin-workspace">
              <form className="admin-entry-form" onSubmit={onSavingsEntry}>
                <label htmlFor="admin-member">Member account</label>
                <select id="admin-member" value={memberId} onChange={(event) => setMemberId(event.target.value)} required disabled={!approvedMembers.length}>
                  <option value="" disabled>Select an approved member</option>
                  {approvedMembers.map((member) => <option key={member.id} value={member.id}>{member.nationalId} · {member.fullName}</option>)}
                </select>
                <label htmlFor="admin-entry-amount">Amount</label>
                <div className="amount-input-wrap"><span>KES</span><input id="admin-entry-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div>
                <label htmlFor="admin-entry-description">Description <span className="optional-label">Optional</span></label>
                <input id="admin-entry-description" className="admin-text-input" type="text" maxLength={120} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Monthly contribution" />
                {!approvedMembers.length && <p className="admin-empty">No approved member accounts are available.</p>}
                <button className="submit-button" type="submit" disabled={submitting || !approvedMembers.length}><span>{submitting ? 'Recording deposit…' : 'Record savings deposit'}</span>{!submitting && <ArrowRight size={18} />}</button>
              </form>
              <aside className="admin-member-summary" aria-live="polite">
                <p className="section-kicker">SELECTED MEMBER</p>
                {selectedMember ? <><h2>{selectedMember.fullName}</h2><p className="admin-national-id">National ID · {selectedMember.nationalId}</p><div className="admin-current-balance"><span>Current savings</span><strong><AnimatedFigure value={selectedMember.savingsBalance} /></strong></div></> : <p className="admin-empty">Select an approved member to view their current total.</p>}
              </aside>
            </div>
            <AdminStatementPanel type="savings" title="Savings deposit statement" refreshKey={statementRefreshKey} />
          </>
        )}

        {view === 'dividends' && (
          <>
            <div className="admin-workspace">
              <form className="admin-entry-form" onSubmit={onDividendPayment}>
                <label htmlFor="dividend-member">Member account</label>
                <select id="dividend-member" value={memberId} onChange={(event) => setMemberId(event.target.value)} required disabled={!approvedMembers.length}>
                  <option value="" disabled>Select an approved member</option>
                  {approvedMembers.map((member) => <option key={member.id} value={member.id}>{member.nationalId} · {member.fullName}</option>)}
                </select>
                <label htmlFor="dividend-period">Financial period</label>
                <input id="dividend-period" className="admin-text-input" type="text" maxLength={24} placeholder="e.g. 2025/2026" value={dividendPeriod} onChange={(event) => setDividendPeriod(event.target.value)} required />
                <label htmlFor="dividend-amount">Dividend paid</label>
                <div className="amount-input-wrap"><span>KES</span><input id="dividend-amount" type="number" min="0.01" step="0.01" value={dividendAmount} onChange={(event) => setDividendAmount(event.target.value)} required /></div>
                <label htmlFor="dividend-description">Description <span className="optional-label">Optional</span></label>
                <input id="dividend-description" className="admin-text-input" type="text" maxLength={120} value={dividendDescription} onChange={(event) => setDividendDescription(event.target.value)} placeholder="Payment note" />
                <button className="submit-button" type="submit" disabled={submitting || !approvedMembers.length}><span>{submitting ? 'Recording payment…' : 'Record dividend payment'}</span>{!submitting && <ArrowRight size={18} />}</button>
              </form>
              <section className="admin-recent-dividends">
                <h2>Recent recorded payments</h2>
                {dividends.length ? dividends.slice(0, 8).map((payment) => (
                  <article className="dividend-row" key={payment.id}><div><strong>{payment.fullName}</strong><span>{payment.financialPeriod} · {formatDate(payment.paidAt)}</span></div><strong><AnimatedFigure value={payment.amount} /></strong></article>
                )) : <p className="admin-empty">No dividend payments recorded yet.</p>}
              </section>
            </div>
            <AdminStatementPanel type="dividends" title="Dividend payment statement" refreshKey={statementRefreshKey} />
          </>
        )}
        {view === 'terms' && (
          <form className="admin-record-list admin-terms-form" onSubmit={saveTerms}>
            <div className="member-details-form-heading">
              <div><p className="section-kicker">MEMBER-FACING POLICY</p><h2>Terms and conditions</h2></div>
              {termsUpdatedAt && <span>Last saved {formatDate(termsUpdatedAt)}</span>}
            </div>
            <p>Write the current SACCO rules and member terms. Members can read this text from their account menu.</p>
            <label htmlFor="admin-terms">Published terms <span className="optional-label">{terms.length}/20,000</span></label>
            <textarea id="admin-terms" className="admin-terms-editor" value={terms} onChange={(event) => { setTerms(event.target.value); setTermsMessage('') }} maxLength={20000} minLength={20} required />
            {termsMessage && <p className="form-message success" role="status">{termsMessage}</p>}
            <button className="submit-button" type="submit" disabled={termsSaving || terms.trim().length < 20}>
              <span>{termsSaving ? 'Publishing…' : 'Publish terms and conditions'}</span>
              {!termsSaving && <ArrowRight size={18} />}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
