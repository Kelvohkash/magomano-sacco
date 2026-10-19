import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import type { PendingProfileChange } from '../../../types'

interface AdminAuthorizationsViewProps {
  onRefresh: () => Promise<void>
}

export function AdminAuthorizationsView({ onRefresh }: AdminAuthorizationsViewProps) {
  const [changes, setChanges] = useState<PendingProfileChange[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadChanges() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/profile-changes')
      if (res.ok) {
        const data = await res.json() as { changes: PendingProfileChange[] }
        setChanges(data.changes ?? [])
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadChanges()
  }, [])

  async function handleApprove(id: number) {
    setWorkingId(id)
    setMessage('')
    setError('')
    try {
      const res = await fetch(`/api/admin/profile-changes/${id}/approve`, { method: 'POST' })
      const data = await res.json() as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to authorize profile change.')
      setMessage(data.message ?? 'Profile change authorized and applied successfully.')
      await loadChanges()
      await onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to authorize changes.')
    } finally {
      setWorkingId(null)
    }
  }

  async function handleReject(id: number) {
    setWorkingId(id)
    setMessage('')
    setError('')
    try {
      const res = await fetch(`/api/admin/profile-changes/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to decline profile change.')
      setMessage(data.message ?? 'Profile change request declined.')
      setRejectingId(null)
      setRejectNote('')
      await loadChanges()
      await onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to decline changes.')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className="admin-view-panel admin-authorizations-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">
            <ShieldAlert size={24} className="title-icon-accent" />
            Profile Change Authorizations
          </h1>
          <p className="view-page-desc">
            Review and authorize member requests to update banking details, workplace station, next of kin, and personal information.
          </p>
        </div>
        <div className="view-intro-meta">
          <button
            type="button"
            className="table-btn-primary"
            onClick={() => void loadChanges()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
          <span className="count-pill">
            Awaiting Review: <strong>{changes.length}</strong>
          </span>
        </div>
      </div>

      {message && (
        <div className="admin-banner-alert alert-success" role="status">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="admin-banner-alert alert-error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="admin-card">
          <p className="admin-empty">Loading pending authorization requests…</p>
        </div>
      ) : changes.length === 0 ? (
        <div className="admin-card authorization-empty-card">
          <div className="auth-empty-icon-circle">
            <ShieldCheck size={36} />
          </div>
          <h2>All Profile Changes Are Up to Date</h2>
          <p>
            There are currently no member account updates awaiting admin authorization.
            When members submit changes to their banking or contact details, they will appear here for your approval.
          </p>
        </div>
      ) : (
        <div className="authorizations-list">
          {changes.map((change) => (
            <article key={change.id} className="authorization-card">
              <header className="authorization-card-header">
                <div className="auth-member-info">
                  <div className="auth-avatar">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="auth-member-name">{change.memberName}</h3>
                    <div className="auth-meta-row">
                      <span className="badge-id">{change.saccoNumber || 'No SACCO #'}</span>
                      <span className="auth-timestamp">
                        <Clock size={13} />
                        Submitted: {new Date(change.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="auth-status-pill">
                  Pending Authorization
                </span>
              </header>

              <div className="auth-diff-grid">
                {Object.entries(change.changes)
                  .filter(([, v]) => v)
                  .map(([key, val]) => (
                    <div key={key} className="auth-diff-item">
                      <span className="auth-diff-label">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                      </span>
                      <strong className="auth-diff-value">{val}</strong>
                    </div>
                  ))}
              </div>

              <footer className="authorization-card-footer">
                {rejectingId === change.id ? (
                  <div className="auth-decline-form">
                    <input
                      type="text"
                      placeholder="Reason for declining this update (optional)"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      className="auth-decline-input"
                    />
                    <button
                      type="button"
                      className="pending-action-btn is-reject"
                      disabled={workingId === change.id}
                      onClick={() => void handleReject(change.id)}
                    >
                      {workingId === change.id ? 'Declining…' : 'Confirm Decline'}
                    </button>
                    <button
                      type="button"
                      className="pending-action-btn"
                      onClick={() => {
                        setRejectingId(null)
                        setRejectNote('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="auth-action-buttons">
                    <button
                      type="button"
                      className="pending-action-btn is-approve auth-btn-lg"
                      disabled={workingId === change.id}
                      onClick={() => void handleApprove(change.id)}
                    >
                      <Check size={16} />
                      <span>{workingId === change.id ? 'Authorizing & Updating…' : 'Authorize & Apply Changes'}</span>
                    </button>
                    <button
                      type="button"
                      className="pending-action-btn is-reject"
                      disabled={workingId === change.id}
                      onClick={() => setRejectingId(change.id)}
                    >
                      <X size={15} />
                      <span>Decline</span>
                    </button>
                  </div>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
