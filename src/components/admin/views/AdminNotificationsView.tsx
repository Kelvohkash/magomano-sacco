import { useState, useEffect, type FormEvent } from 'react'
import { Bell, Send, Users, User, CheckCircle2, AlertCircle } from 'lucide-react'
import type { AdminMember, AdminNotification } from '../../../types'

interface AdminNotificationsViewProps {
  members: AdminMember[]
}

export function AdminNotificationsView({ members }: AdminNotificationsViewProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetType, setTargetType] = useState<'all' | 'member'>('all')
  const [targetMemberId, setTargetMemberId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/admin/notifications')
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json() as { notifications: AdminNotification[] }
        if (!cancelled) setNotifications(data.notifications ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [message])

  async function sendNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          targetType,
          targetMemberId: targetType === 'member' && targetMemberId ? Number(targetMemberId) : null,
        }),
      })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Failed to send notification.')
      setMessage(result.message ?? 'Notification dispatched successfully.')
      setTitle('')
      setBody('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to send notification.')
    } finally {
      setSending(false)
    }
  }

  const approvedMembers = members.filter((m) => m.accountStatus === 'approved')

  return (
    <section className="admin-notifications-view">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">Push Notifications</h1>
          <p className="view-page-desc">
            Broadcast system push notifications to all members or target individual member devices.
          </p>
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
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="admin-notif-grid">
        <div className="admin-card admin-notif-form-card">
          <div className="terms-editor-header">
            <h3><Send size={16} /> Compose Notification</h3>
            <p>Send a live push alert to registered member smartphones and PWA installations.</p>
          </div>
          <form className="admin-notif-form" onSubmit={(e) => void sendNotification(e)}>
            <div className="form-group">
              <label className="form-label">Recipient Target</label>
              <div className="admin-notif-target-row">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="targetType"
                    value="all"
                    checked={targetType === 'all'}
                    onChange={() => setTargetType('all')}
                  />
                  <Users size={15} /> All members
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="targetType"
                    value="member"
                    checked={targetType === 'member'}
                    onChange={() => setTargetType('member')}
                  />
                  <User size={15} /> Specific member
                </label>
              </div>
            </div>

            {targetType === 'member' && (
              <label>
                Select Member
                <select
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  required
                >
                  <option value="">Choose a member…</option>
                  {approvedMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.saccoNumber || 'No SACCO #'})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Notification Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={120}
                placeholder="e.g. Dividend distribution update"
              />
            </label>

            <label>
              Notification Message
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={500}
                rows={4}
                placeholder="Enter the alert content sent to member lock screens and notification trays…"
              />
            </label>

            <button type="submit" className="submit-button" disabled={sending}>
              <span>{sending ? 'Dispatching…' : 'Send Push Notification'}</span>
              <Send size={16} />
            </button>
          </form>
        </div>

        <div className="admin-card admin-notif-history-card">
          <div className="terms-editor-header">
            <h3><Bell size={16} /> Dispatched Notifications</h3>
            <p>History of alerts sent from this admin console.</p>
          </div>

          {loading ? (
            <p className="admin-empty">Loading notification history…</p>
          ) : notifications.length === 0 ? (
            <p className="admin-empty">No push notifications sent yet.</p>
          ) : (
            <div className="admin-notif-list">
              {notifications.map((notif) => (
                <div key={notif.id} className="admin-notif-item">
                  <div className="admin-notif-item-header">
                    <strong>{notif.title}</strong>
                    <span className="admin-notif-target-badge">
                      {notif.targetType === 'all' ? (
                        <>
                          <Users size={11} /> All members
                        </>
                      ) : (
                        <>
                          <User size={11} /> {notif.targetMemberName ?? 'Member'}
                        </>
                      )}
                    </span>
                  </div>
                  <p className="admin-notif-body">{notif.body}</p>
                  <div className="admin-notif-meta">
                    <span>{new Date(notif.createdAt).toLocaleString()}</span>
                    <span>{notif.sentCount} active subscription(s)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
