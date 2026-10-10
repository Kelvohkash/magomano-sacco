import { useEffect, useState, type FormEvent } from 'react'
import { FileText, Phone, Plus, Trash2, UsersRound } from 'lucide-react'
import { formatDate } from '../format'
import type { MemberContact } from '../types'

export function MemberContactsPage() {
  const [contacts, setContacts] = useState<MemberContact[]>([])
  const [fullName, setFullName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/member/contacts', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { contacts?: MemberContact[]; error?: string }
        if (!response.ok) throw new Error(result.error ?? 'Could not load your contacts.')
        setContacts(result.contacts ?? [])
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load your contacts.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/member/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, relationship, phoneNumber }),
      })
      const result = await response.json() as { contact?: MemberContact; message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not add this contact.')
      const addedContact = result.contact
      if (!addedContact) throw new Error('The contact was saved but the server did not return it.')
      setContacts((current) => [...current, addedContact])
      setFullName('')
      setRelationship('')
      setPhoneNumber('')
      setMessage(result.message ?? 'Contact added.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add this contact.')
    } finally {
      setSaving(false)
    }
  }

  async function removeContact(contact: MemberContact) {
    setRemovingId(contact.id)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/member/contacts/${contact.id}`, { method: 'DELETE' })
      const result = await response.json() as { message?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not remove this contact.')
      setContacts((current) => current.filter((entry) => entry.id !== contact.id))
      setMessage(result.message ?? 'Contact removed.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove this contact.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="member-account-page">
      <div className="dashboard-intro">
        <p className="dashboard-kicker">YOUR ACCOUNT</p>
        <h1>Contact persons</h1>
        <p>Manage up to two people the SACCO may contact about your account and record how they are related to you.</p>
      </div>
      <div className="member-account-grid">
        <form className="member-account-card member-contact-form" onSubmit={addContact}>
          <div className="member-account-card-heading">
            <span><UsersRound size={18} /></span>
            <div><h2>Add a contact</h2><p>Up to two contacts</p></div>
          </div>
          <label htmlFor="contact-full-name">Full name</label>
          <input id="contact-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={100} autoComplete="name" required />
          <label htmlFor="contact-relationship">Relationship to you</label>
          <input id="contact-relationship" value={relationship} onChange={(event) => setRelationship(event.target.value)} maxLength={60} placeholder="e.g. Parent, spouse, colleague" required />
          <label htmlFor="contact-phone">Phone number</label>
          <input id="contact-phone" type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} maxLength={32} autoComplete="tel" required />
          {error && <p className="form-message error" role="alert">{error}</p>}
          {message && <p className="form-message success" role="status">{message}</p>}
          <button className="submit-button" type="submit" disabled={saving || contacts.length >= 2}>
            <span>{saving ? 'Adding contact…' : 'Add contact'}</span>
            {!saving && <Plus size={18} />}
          </button>
          {contacts.length >= 2 && <p className="member-account-note">You have reached the two-contact limit. Remove a contact before adding another.</p>}
        </form>
        <section className="member-account-card member-contact-list" aria-label="Your contacts">
          <div className="member-account-card-heading">
            <span><Phone size={18} /></span>
            <div><h2>Saved contacts</h2><p>{loading ? 'Loading…' : `${contacts.length} of 2`}</p></div>
          </div>
          {loading ? <p className="admin-empty">Loading contacts…</p> : contacts.length ? contacts.map((contact) => (
            <article className="member-contact-row" key={contact.id}>
              <div><strong>{contact.fullName}</strong><span>{contact.relationship} · {contact.phoneNumber}</span></div>
              <button
                type="button"
                className="member-contact-remove"
                aria-label={`Remove ${contact.fullName}`}
                disabled={removingId === contact.id}
                onClick={() => void removeContact(contact)}
              >
                <Trash2 size={16} />
              </button>
            </article>
          )) : <p className="admin-empty">No additional contacts have been added yet.</p>}
        </section>
      </div>
    </section>
  )
}

export function MemberTermsPage() {
  const [terms, setTerms] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/member/terms', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { terms?: string; updatedAt?: string | null; error?: string }
        if (!response.ok) throw new Error(result.error ?? 'Could not load the terms and conditions.')
        setTerms(result.terms ?? '')
        setUpdatedAt(result.updatedAt ?? null)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load the terms and conditions.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return (
    <section className="member-account-page">
      <div className="dashboard-intro">
        <p className="dashboard-kicker">SACCO INFORMATION</p>
        <h1>Terms and conditions</h1>
        <p>Review the current terms set by your SACCO administrator.</p>
      </div>
      <article className="member-account-card member-terms-card">
        <div className="member-account-card-heading">
          <span><FileText size={18} /></span>
          <div><h2>Magomano SACCO terms</h2>{updatedAt && <p>Last updated {formatDate(updatedAt)}</p>}</div>
        </div>
        {error ? <p className="form-message error" role="alert">{error}</p>
          : loading ? <p className="admin-empty">Loading terms and conditions…</p>
            : terms ? <div className="member-terms-content">{terms}</div>
              : <p className="admin-empty">The SACCO has not published its terms and conditions yet.</p>}
      </article>
    </section>
  )
}
