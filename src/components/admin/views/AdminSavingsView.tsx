import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, WalletCards } from 'lucide-react'
import { AdminStatementPanel } from '../../AdminStatementPanel'
import { currency } from '../../../format'

interface InterestState { available: number; records: { id: number; amount: number; description: string; paidAt: string }[] }

export function AdminSavingsView({ statementRefreshKey, onRecordsChanged }: { statementRefreshKey: number; onRecordsChanged: () => Promise<void> }) {
  const [interest, setInterest] = useState<InterestState>({ available: 0, records: [] })
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  async function loadInterest() {
    const response = await fetch('/api/admin/interest-disbursements')
    if (response.ok) setInterest(await response.json() as InterestState)
  }
  useEffect(() => { void loadInterest() }, [statementRefreshKey])
  async function disburse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setNotice('')
    try {
      const response = await fetch('/api/admin/interest-disbursements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, description }) })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not record the interest payout.')
      setNotice(result.message ?? 'Interest payout recorded.')
      setAmount(''); setDescription('')
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
      <section className="terms-editor-card interest-disbursement-card">
        <div className="terms-editor-header"><div><h3>Interest held by the SACCO</h3><p>Interest received from member repayments is tracked separately from member savings.</p></div><strong>{currency.format(interest.available)}</strong></div>
        <form className="member-popup-form" onSubmit={(event) => void disburse(event)}>
          <label>Amount to disburse<input type="number" min="0.01" max={interest.available} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
          <label>Description<input maxLength={120} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Interest payout" /></label>
          <button className="submit-button" type="submit" disabled={busy || interest.available <= 0}><span>{busy ? 'Recording…' : 'Record interest payout'}</span><ArrowRight size={18} /></button>
        </form>
        {notice && <p role="status">{notice}</p>}
        {!!interest.records.length && <div className="member-popup-list">{interest.records.slice(0, 5).map((record) => <article className="member-popup-item" key={record.id}><div className="member-popup-item-copy"><strong>{currency.format(record.amount)}</strong><small>{record.description || 'Interest payout'} · {record.paidAt}</small></div></article>)}</div>}
      </section>
      <AdminStatementPanel type="savings" title="Savings Deposits" refreshKey={statementRefreshKey} onRecordsChanged={onRecordsChanged} />
    </div>
  )
}
