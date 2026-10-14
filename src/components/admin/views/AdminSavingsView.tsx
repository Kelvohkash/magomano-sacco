import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, WalletCards } from 'lucide-react'
import { AdminStatementPanel } from '../../AdminStatementPanel'
import { currency } from '../../../format'
import type { AdminMember } from '../../../types'

interface InterestState { available: number; records: { id: number; amount: number; description: string; paidAt: string }[] }

interface Props {
  statementRefreshKey: number
  onRecordsChanged: () => Promise<void>
  members: AdminMember[]
  memberId: string
  setMemberId: (value: string) => void
  amount: string
  setAmount: (value: string) => void
  description: string
  setDescription: (value: string) => void
  onSavingsEntry: (event: FormEvent<HTMLFormElement>) => void
  submitting: boolean
}

export function AdminSavingsView({
  statementRefreshKey,
  onRecordsChanged,
  members,
  memberId,
  setMemberId,
  amount,
  setAmount,
  description,
  setDescription,
  onSavingsEntry,
  submitting,
}: Props) {
  const [interest, setInterest] = useState<InterestState>({ available: 0, records: [] })
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutDescription, setPayoutDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)
  const selectedMember = members.find((member) => String(member.id) === memberId)
  const normalizedMemberSearch = memberSearch.trim().toLocaleLowerCase()
  const matchingMembers = normalizedMemberSearch
    ? members.filter((member) =>
      `${member.fullName} ${member.nationalId} ${member.saccoNumber ?? ''} ${member.phoneNumber}`
        .toLocaleLowerCase()
        .includes(normalizedMemberSearch),
    )
    : []
  const selectedMemberLabel = selectedMember
    ? `${selectedMember.fullName} · ${selectedMember.saccoNumber || selectedMember.nationalId}`
    : ''

  async function loadInterest() {
    const response = await fetch('/api/admin/interest-disbursements')
    if (response.ok) setInterest(await response.json() as InterestState)
  }
  useEffect(() => { void loadInterest() }, [statementRefreshKey])
  async function disburse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setNotice('')
    try {
      const response = await fetch('/api/admin/interest-disbursements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: payoutAmount, description: payoutDescription }) })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not record the interest payout.')
      setNotice(result.message ?? 'Interest payout recorded.')
      setPayoutAmount(''); setPayoutDescription('')
      await loadInterest(); await onRecordsChanged()
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not record the interest payout.') }
    finally { setBusy(false) }
  }
  return (
    <div className="admin-view-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">Savings Ledger</h1>
          <p className="view-page-desc">Review member deposits and edit a saved entry from its details panel.</p>
        </div>
        <span className="view-intro-icon"><WalletCards size={20} /></span>
      </div>
      <form className="admin-create-panel savings-entry-form" onSubmit={onSavingsEntry}>
        <div className="admin-create-panel-heading"><h2>Record a savings deposit</h2><p>Add a deposit to a member’s savings ledger.</p></div>
        <div className="form-fields-grid">
          <div
            className="admin-search-picker"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMemberPickerOpen(false)
            }}
          >
            <label htmlFor="savings-member-search">Search member by name or ID</label>
            <input
              id="savings-member-search"
              type="search"
              aria-haspopup="listbox"
              aria-expanded={memberPickerOpen && Boolean(normalizedMemberSearch)}
              aria-controls="savings-member-results"
              value={memberSearch || selectedMemberLabel}
              onFocus={() => setMemberPickerOpen(true)}
              onChange={(event) => {
                setMemberSearch(event.target.value)
                setMemberId('')
                setMemberPickerOpen(true)
              }}
              placeholder="Type member name, SACCO number, or ID"
              required={!memberId}
            />
            {memberPickerOpen && normalizedMemberSearch && (
              <div className="admin-search-picker-results" id="savings-member-results" role="listbox" aria-label="Matching members">
                {matchingMembers.length > 0 ? matchingMembers.map((member) => (
                  <button
                    className="admin-search-picker-option"
                    key={member.id}
                    type="button"
                    role="option"
                    aria-selected={String(member.id) === memberId}
                    onClick={() => {
                      setMemberId(String(member.id))
                      setMemberSearch(`${member.fullName} · ${member.saccoNumber || member.nationalId}`)
                      setMemberPickerOpen(false)
                    }}
                  >
                    <span><strong>{member.fullName}</strong><small>SACCO: {member.saccoNumber || 'Not assigned'} · ID: {member.nationalId}</small></span>
                    <strong>{member.accountStatus}</strong>
                  </button>
                )) : <p className="admin-search-picker-empty" role="status">No members match that search.</p>}
              </div>
            )}
          </div>
          <label>Deposit amount<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
          <label>Description<input maxLength={120} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Savings deposit" /></label>
        </div>
        <div className="modal-actions-bar"><button className="submit-button" type="submit" disabled={submitting || members.length === 0}>{submitting ? 'Recording…' : 'Record deposit'}</button></div>
      </form>
      <section className="terms-editor-card interest-disbursement-card">
        <div className="terms-editor-header"><div><h3>Interest </h3><p>Interest received from member repayments is tracked separately from member savings.</p></div><strong>{currency.format(interest.available)}</strong></div>
        <form className="member-popup-form" onSubmit={(event) => void disburse(event)}>
          <label>Amount to disburse<input type="number" min="0.01" max={interest.available} step="0.01" value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} required /></label>
          <label>Description<input maxLength={120} value={payoutDescription} onChange={(event) => setPayoutDescription(event.target.value)} placeholder="Interest payout" /></label>
          <button className="submit-button" type="submit" disabled={busy || interest.available <= 0}><span>{busy ? 'Recording…' : 'Record interest payout'}</span><ArrowRight size={18} /></button>
        </form>
        {notice && <p role="status">{notice}</p>}
        {!!interest.records.length && <div className="member-popup-list">{interest.records.slice(0, 5).map((record) => <article className="member-popup-item" key={record.id}><div className="member-popup-item-copy"><strong>{currency.format(record.amount)}</strong><small>{record.description || 'Interest payout'} · {record.paidAt}</small></div></article>)}</div>}
      </section>
      <AdminStatementPanel type="savings" title="Savings Deposits" refreshKey={statementRefreshKey} onRecordsChanged={onRecordsChanged} />
    </div>
  )
}
