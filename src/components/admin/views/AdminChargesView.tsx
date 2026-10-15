import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { HandCoins, UsersRound } from 'lucide-react'
import type { AdminMember } from '../../../types'
import { formatDate } from '../../../format'
import { readJsonResponse, requestErrorMessage } from '../../../networkErrors'

interface AdminChargesViewProps {
  members: AdminMember[]
  onRefresh: () => Promise<void>
}

interface AdminChargeRecord {
  id: number
  description: string
  amount: number
  targetType: 'individual' | 'group' | 'all'
  createdAt: string
  targetCount: number
  appliedCount: number
  insufficientCount: number
}

async function fetchAdminCharges() {
  const response = await fetch('/api/admin/charges')
  const result = await readJsonResponse<{ charges?: AdminChargeRecord[]; error?: string }>(response)
  if (!response.ok) {
    const message = response.status === 404
      ? 'Admin charges API is not available. Rebuild and restart the Pages dev server.'
      : result.error ?? 'Could not load admin charges.'
    throw new Error(message)
  }
  return result.charges ?? []
}

export function AdminChargesView({ members, onRefresh }: AdminChargesViewProps) {
  const approvedMembers = members.filter((member) => member.accountStatus === 'approved')
  const [targetType, setTargetType] = useState<'individual' | 'group' | 'all'>('individual')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [records, setRecords] = useState<AdminChargeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadCharges = useCallback(async () => {
    setLoading(true)
    setHistoryError('')
    try {
      setRecords(await fetchAdminCharges())
    } catch (loadError) {
      setHistoryError(requestErrorMessage(loadError, 'Could not load admin charges.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchAdminCharges()
      .then((charges) => {
        if (active) setRecords(charges)
      })
      .catch((loadError: unknown) => {
        if (active) setHistoryError(requestErrorMessage(loadError, 'Could not load admin charges.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  function updateTargetType(value: 'individual' | 'group' | 'all') {
    setTargetType(value)
    if (value === 'all') setSelectedIds([])
    else if (value === 'individual' && selectedIds.length > 1) setSelectedIds(selectedIds.slice(0, 1))
  }

  function toggleMember(memberId: number) {
    setSelectedIds((current) => {
      if (current.includes(memberId)) return current.filter((id) => id !== memberId)
      if (targetType === 'individual') return [memberId]
      if (current.length >= 500) return current
      return [...current, memberId]
    })
  }

  async function createCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a positive charge amount.')
      return
    }
    if (targetType !== 'all' && selectedIds.length === 0) {
      setError('Select at least one approved member.')
      return
    }
    const count = targetType === 'all' ? approvedMembers.length : selectedIds.length
    const total = Math.round(numericAmount * 100) / 100 * count
    const audience = targetType === 'all'
      ? `all ${count} approved members`
      : `${count} selected member${count === 1 ? '' : 's'}`
    if (!window.confirm(`Issue “${description.trim()}” for ${numericAmount.toFixed(2)} to ${audience}? Estimated total: ${total.toFixed(2)}. Members with insufficient savings will not be charged.`)) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: numericAmount,
          targetType,
          memberIds: targetType === 'all' ? [] : selectedIds,
        }),
      })
      const result = await readJsonResponse<{
        message?: string
        error?: string
      }>(response)
      if (!response.ok) {
        const message = response.status === 404
          ? 'Admin charges API is not available. Rebuild and restart the Pages dev server.'
          : result.error ?? 'Could not issue this charge.'
        throw new Error(message)
      }
      setNotice(result.message ?? 'Admin charge issued.')
      setDescription('')
      setAmount('')
      setSelectedIds([])
      await Promise.all([loadCharges(), onRefresh()])
    } catch (submitError) {
      setError(requestErrorMessage(submitError, 'Could not issue this charge.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-view-panel admin-charges-view">
      <header className="view-intro-header">
        <div>
          <h1 className="view-page-title">Admin Charges</h1>
          <p className="view-page-desc">Issue a charge to a member, selected group, or all approved members. Successful charges are recorded as savings withdrawals.</p>
        </div>
      </header>

      <form className="admin-charge-form admin-section-card" onSubmit={createCharge}>
        <div className="admin-charge-form-heading">
          <span className="admin-charge-form-icon"><HandCoins size={20} /></span>
          <div>
            <h2>Create a charge</h2>
            <p>Members with insufficient savings are logged as not applied; their balances will not go negative.</p>
          </div>
        </div>

        <div className="admin-charge-fields">
          <label>
            Charge description
            <input
              required
              maxLength={160}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Annual administration fee"
            />
          </label>
          <label>
            Amount per member
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </label>
        </div>

        <fieldset className="admin-charge-audience">
          <legend>Apply to</legend>
          <div className="admin-charge-target-options">
            {([
              ['individual', 'One member'],
              ['group', 'Selected group'],
              ['all', 'All approved members'],
            ] as const).map(([value, label]) => (
              <label key={value} className={targetType === value ? 'is-selected' : ''}>
                <input
                  type="radio"
                  name="charge-target-type"
                  value={value}
                  checked={targetType === value}
                  onChange={() => updateTargetType(value)}
                />
                {label}
              </label>
            ))}
          </div>

          {targetType !== 'all' && (
            <div className={`admin-charge-members ${targetType === 'individual' ? 'is-single' : ''}`}>
              <div className="admin-charge-member-count">
                <UsersRound size={16} />
                <span>{selectedIds.length} selected · {approvedMembers.length} approved members</span>
              </div>
              {approvedMembers.map((member) => (
                <label key={member.id} className="admin-charge-member-option">
                  <input
                    type={targetType === 'individual' ? 'radio' : 'checkbox'}
                    name="charge-members"
                    checked={selectedIds.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                  />
                  <span>{member.fullName}</span>
                  <small>{member.saccoNumber || member.nationalId}</small>
                </label>
              ))}
              {!approvedMembers.length && <p>No approved members are available.</p>}
            </div>
          )}

          {targetType === 'all' && (
            <p className="admin-charge-audience-summary">
              This charge will be evaluated for {approvedMembers.length} approved members.
            </p>
          )}
        </fieldset>

        {error && <p className="admin-charge-feedback is-error" role="alert">{error}</p>}
        {notice && <p className="admin-charge-feedback is-success" role="status">{notice}</p>}
        <div className="admin-charge-form-actions">
          <span>Maximum targeted group: 500 members.</span>
          <button type="submit" className="admin-primary-button" disabled={submitting || !approvedMembers.length}>
            {submitting ? 'Issuing charge…' : 'Review and issue charge'}
          </button>
        </div>
      </form>

      <section className="admin-section-card admin-charge-history">
        <div className="admin-charge-history-heading">
          <div>
            <h2>Issued charges</h2>
            <p>Application counts include members skipped for insufficient savings.</p>
          </div>
          <button type="button" className="admin-secondary-button" onClick={() => void loadCharges()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {historyError && <p className="admin-charge-feedback is-error" role="alert">{historyError}</p>}
        {loading ? (
          <p className="admin-charge-empty">Loading charge history…</p>
        ) : records.length ? (
          <div className="admin-charge-history-list">
            {records.map((charge) => (
              <article className="admin-charge-record" key={charge.id}>
                <div>
                  <strong>{charge.description}</strong>
                  <span>{formatDate(charge.createdAt)} · {charge.targetType === 'all' ? 'All members' : charge.targetType === 'group' ? 'Selected group' : 'Individual'}</span>
                </div>
                <strong>{charge.amount.toFixed(2)} per member</strong>
                <span>{charge.appliedCount}/{charge.targetCount} charged</span>
                {charge.insufficientCount > 0 && <small>{charge.insufficientCount} skipped: insufficient savings</small>}
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-charge-empty">No admin charges have been issued.</p>
        )}
      </section>
    </div>
  )
}
