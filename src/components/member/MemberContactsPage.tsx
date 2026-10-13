import { useEffect, useState, type FormEvent } from 'react'
import { Phone, Plus, Trash2, UsersRound } from 'lucide-react'
import type { MemberContact } from '../../types'
import { readJsonResponse, requestErrorMessage } from '../../networkErrors'

export function MemberContactsPage({ compact = false }: { compact?: boolean }) {
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
        const result = await readJsonResponse<{ contacts?: MemberContact[]; error?: string }>(response)
        if (!response.ok) throw new Error(result.error ?? 'Could not load your contacts.')
        setContacts(result.contacts ?? [])
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(requestErrorMessage(cause, 'Could not load your contacts.'))
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
      const result = await readJsonResponse<{ contact?: MemberContact; message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not add this contact.')
      const addedContact = result.contact
      if (!addedContact) throw new Error('The contact was saved but the server did not return it.')
      setContacts((current) => [...current, addedContact])
      setFullName('')
      setRelationship('')
      setPhoneNumber('')
      setMessage(result.message ?? 'Contact added.')
    } catch (cause) {
      setError(requestErrorMessage(cause, 'Could not add this contact.'))
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
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not remove this contact.')
      setContacts((current) => current.filter((entry) => entry.id !== contact.id))
      setMessage(result.message ?? 'Contact removed.')
    } catch (cause) {
      setError(requestErrorMessage(cause, 'Could not remove this contact.'))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className={compact ? 'member-contacts-embedded' : 'member-account-page'}>
      {!compact && <div className="dashboard-intro">
        <p className="dashboard-kicker">YOUR ACCOUNT</p>
        <h1>Contact persons</h1>
        <p>Manage up to two people the SACCO may contact about your account and record how they are related to you.</p>
      </div>}
      <div className="member-account-grid">
        <form className="member-account-card member-contact-form" onSubmit={addContact}>
          <div className="member-account-card-heading">
            <span><UsersRound size={18} /></span>
            <div><h2>Add a contact</h2><p>Up to two contacts</p></div>
          </div>
          <label className="member-contact-field" htmlFor="contact-full-name">Full name<input id="contact-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={100} autoComplete="name" required /></label>
          <label className="member-contact-field" htmlFor="contact-relationship">Relationship to you<input id="contact-relationship" value={relationship} onChange={(event) => setRelationship(event.target.value)} maxLength={60} placeholder="e.g. Parent, spouse, colleague" required /></label>
          <label className="member-contact-field" htmlFor="contact-phone">Phone number<input id="contact-phone" type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} maxLength={32} autoComplete="tel" required /></label>
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
