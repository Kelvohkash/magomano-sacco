import { useState, type Dispatch, type FormEvent, type FormEventHandler, type SetStateAction } from 'react'
import { ArrowRight, BellRing, CheckCircle2, Power, Trash2 } from 'lucide-react'
import { formatDate } from '../../../format'
import type { AdminMember, AdminPopupMessage, AdminPopupMessageCreate } from '../../../types'

interface AdminTermsViewProps {
  terms: string
  setTerms: Dispatch<SetStateAction<string>>
  termsUpdatedAt?: string | null
  termsSaving: boolean
  termsMessage: string
  setTermsMessage: (msg: string) => void
  onSaveTerms: FormEventHandler<HTMLFormElement>
  maintenanceEnabled: boolean
  maintenanceMessage: string
  setMaintenanceMessage: Dispatch<SetStateAction<string>>
  onUpdateMaintenance: (enabled: boolean, message: string) => Promise<boolean>
  maintenanceSaving: boolean
  members: AdminMember[]
  popupMessages: AdminPopupMessage[]
  onCreatePopupMessage: (input: AdminPopupMessageCreate) => Promise<boolean>
  onSetPopupMessageActive: (messageId: number, active: boolean) => Promise<boolean>
  onDeletePopupMessage: (messageId: number) => Promise<boolean>
  reviewingId: string | null
}

export function AdminTermsView({
  terms,
  setTerms,
  termsUpdatedAt,
  termsSaving,
  termsMessage,
  setTermsMessage,
  onSaveTerms,
  maintenanceEnabled,
  maintenanceMessage,
  setMaintenanceMessage,
  onUpdateMaintenance,
  maintenanceSaving,
  members,
  popupMessages,
  onCreatePopupMessage,
  onSetPopupMessageActive,
  onDeletePopupMessage,
  reviewingId,
}: AdminTermsViewProps) {
  const [popupTitle, setPopupTitle] = useState('')
  const [popupBody, setPopupBody] = useState('')
  const [popupTargetType, setPopupTargetType] = useState<'all' | 'member'>('all')
  const [popupTargetMemberIds, setPopupTargetMemberIds] = useState<number[]>([])
  const [memberSearch, setMemberSearch] = useState('')

  async function createPopupMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const created = await onCreatePopupMessage({
      title: popupTitle.trim(),
      body: popupBody.trim(),
      targetType: popupTargetType,
      targetMemberIds: popupTargetType === 'member' ? popupTargetMemberIds : [],
    })
    if (created) {
      setPopupTitle('')
      setPopupBody('')
      setPopupTargetType('all')
      setPopupTargetMemberIds([])
      setMemberSearch('')
    }
  }

  const approvedMembers = members.filter((member) => member.accountStatus === 'approved')

  return (
    <div className="admin-view-panel">
      <section className="terms-editor-card maintenance-admin-card">
        <div className="terms-editor-header">
          <div>
            <h3>Member maintenance mode</h3>
            <p>When enabled, members can sign in to see this notice instead of their regular portal. Member changes and loan applications are paused.</p>
          </div>
          <span className={`maintenance-status ${maintenanceEnabled ? 'is-on' : 'is-off'}`}>
            {maintenanceEnabled ? 'On' : 'Off'}
          </span>
        </div>
        <label className="maintenance-message-label" htmlFor="maintenance-message">
          Message shown to members
          <textarea
            id="maintenance-message"
            className="terms-textarea maintenance-message-input"
            value={maintenanceMessage}
            onChange={(event) => setMaintenanceMessage(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="We are carrying out maintenance. Please try again later."
          />
        </label>
        <div className="terms-actions-bar">
          <span className="terms-note">Changes take effect immediately and apply to all member accounts.</span>
          <button
            className={maintenanceEnabled ? 'maintenance-toggle-button is-on' : 'maintenance-toggle-button'}
            type="button"
            disabled={maintenanceSaving}
            onClick={() => void onUpdateMaintenance(!maintenanceEnabled, maintenanceMessage)}
          >
            {maintenanceSaving ? 'Updating…' : maintenanceEnabled ? 'Turn maintenance off' : 'Turn maintenance on'}
          </button>
        </div>
      </section>

      <section className="terms-editor-card member-popup-admin-card">
        <div className="terms-editor-header">
          <div>
            <h3><BellRing size={18} /> Login pop-up messages</h3>
            <p>Messages appear after a member signs in. Members can close them for the current login; they appear again next time until you deactivate or delete them.</p>
          </div>
        </div>

        <form className="member-popup-form" onSubmit={(event) => void createPopupMessage(event)}>
          <label>
            Message title
            <input value={popupTitle} onChange={(event) => setPopupTitle(event.target.value)} maxLength={120} required />
          </label>
          <label>
            Message
            <textarea value={popupBody} onChange={(event) => setPopupBody(event.target.value)} maxLength={2000} rows={4} required />
          </label>
          <div className="member-popup-form-row">
            <label>
              Show to
              <select value={popupTargetType} onChange={(event) => setPopupTargetType(event.target.value as 'all' | 'member')}>
                <option value="all">All members</option>
                <option value="member">Selected members</option>
              </select>
            </label>
            {popupTargetType === 'member' && <div className="popup-member-picker">
              <label>Search members
                <input type="search" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search name or SACCO number" />
              </label>
              <div className="popup-member-picker-results">
                {approvedMembers.filter((member) => `${member.fullName} ${member.saccoNumber ?? ''}`.toLowerCase().includes(memberSearch.toLowerCase()))
                  .map((member) => <label key={member.id} className="popup-member-option">
                    <input type="checkbox" checked={popupTargetMemberIds.includes(member.id)} onChange={(event) => setPopupTargetMemberIds((current) => event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} />
                    <span>{member.fullName} · {member.saccoNumber}</span>
                  </label>)}
              </div>
              <small>{popupTargetMemberIds.length} member{popupTargetMemberIds.length === 1 ? '' : 's'} selected</small>
            </div>}
            <button className="submit-button" type="submit" disabled={reviewingId === 'create-popup-message'}>
              <span>{reviewingId === 'create-popup-message' ? 'Creating…' : 'Create message'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

        <div className="member-popup-list">
          {popupMessages.length === 0 ? (
            <p className="terms-note">No login messages have been created.</p>
          ) : popupMessages.map((message) => {
            const busy = reviewingId === `popup-message-${message.id}`
            return (
              <article className={`member-popup-item ${message.active ? '' : 'is-inactive'}`} key={message.id}>
                <div className="member-popup-item-copy">
                  <div className="member-popup-item-heading">
                    <strong>{message.title}</strong>
                    <span className={`maintenance-status ${message.active ? 'is-on' : 'is-off'}`}>{message.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p>{message.body}</p>
                  <small>{message.targetType === 'all' ? 'All members' : `${message.targetMemberNames ?? message.targetMemberName ?? 'Member'}${message.targetMemberCount ? ` · ${message.targetMemberCount} selected` : ''}`} · Created {formatDate(message.createdAt)}</small>
                </div>
                <div className="member-popup-actions">
                  <button type="button" className="member-popup-action" disabled={busy} onClick={() => void onSetPopupMessageActive(message.id, !message.active)}>
                    <Power size={15} /> {message.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button type="button" className="member-popup-action is-delete" disabled={busy} onClick={() => void onDeletePopupMessage(message.id)}>
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

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

      <form className="terms-editor-card" onSubmit={onSaveTerms}>
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
  )
}
