import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound, Landmark, MapPin, Save, UserRound } from 'lucide-react'
import { MemberContactsPage } from './MemberContactsPage'
import { readJsonResponse, requestErrorMessage } from '../../networkErrors'

type Profile = Record<string, string>
const fields: { key: string; label: string; group: string; type?: string }[] = [
  { key: 'phoneNumber', label: 'Phone number', group: 'Personal details', type: 'tel' },
  { key: 'email', label: 'Email address', group: 'Personal details', type: 'email' },
  { key: 'county', label: 'County', group: 'Address' },
  { key: 'subCounty', label: 'Sub-county', group: 'Address' },
  { key: 'location', label: 'Location', group: 'Address' },
  { key: 'bankName', label: 'Bank name', group: 'Primary bank account' },
  { key: 'bankBranch', label: 'Branch', group: 'Primary bank account' },
  { key: 'bankAccountName', label: 'Account holder', group: 'Primary bank account' },
  { key: 'bankAccountNumber', label: 'Account number', group: 'Primary bank account' },
  { key: 'bankTwoName', label: 'Bank name', group: 'Second bank account' },
  { key: 'bankTwoBranch', label: 'Branch', group: 'Second bank account' },
  { key: 'bankTwoAccountName', label: 'Account holder', group: 'Second bank account' },
  { key: 'bankTwoAccountNumber', label: 'Account number', group: 'Second bank account' },
  { key: 'nextKinName', label: 'Full name', group: 'Next of kin' },
  { key: 'nextKinRelationship', label: 'Relationship', group: 'Next of kin' },
  { key: 'nextKinPhone', label: 'Phone number', group: 'Next of kin', type: 'tel' },
]
const emptyProfile = Object.fromEntries(fields.map(({ key }) => [key, '']))

export function MemberAccountInfoPage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [profileLoadFailed, setProfileLoadFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setProfileLoadFailed(false)
    setError('')
    fetch('/api/member/profile', { signal: controller.signal })
      .then(async (response) => {
        const result = await readJsonResponse<{ profile?: Profile; error?: string }>(response)
        if (!response.ok) throw new Error(result.error ?? 'Could not load account information.')
        if (!result.profile) throw new Error('The account service returned no saved profile.')
        setProfile({ ...emptyProfile, ...result.profile })
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(requestErrorMessage(cause, 'Could not load account information.'))
        setProfileLoadFailed(true)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [loadAttempt])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/member/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
      const result = await readJsonResponse<{ profile?: Profile; message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not save account information.')
      if (result.profile) setProfile({ ...emptyProfile, ...result.profile })
      setMessage(result.message ?? 'Account information updated.')
    } catch (cause) { setError(requestErrorMessage(cause, 'Could not save account information.')) }
    finally { setSaving(false) }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordError(''); setPasswordMessage('')
    if (!currentPassword) { setPasswordError('Enter your current password first.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('The new passwords do not match.'); return }
    setPasswordSaving(true)
    try {
      const response = await fetch('/api/member/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not change password.')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordMessage(result.message ?? 'Password changed.')
    } catch (cause) { setPasswordError(requestErrorMessage(cause, 'Could not change password.')) }
    finally { setPasswordSaving(false) }
  }

  const groups = [...new Set(fields.map((field) => field.group))]
  return <section className="member-account-page">
    <div className="dashboard-intro"><p className="dashboard-kicker">YOUR ACCOUNT</p><h1>Account info</h1><p>Your registration details and saved contact persons appear here. Edit your details and press the update button to save changes.</p></div>
    {error && <p className="form-message error" role="alert">{error}</p>}
    {message && <p className="form-message success" role="status">{message}</p>}
    {loading ? <p className="admin-empty" role="status">Loading your saved account information…</p> : profileLoadFailed ? <div className="member-account-card"><p>We couldn’t load your saved details, so the form is unavailable to prevent overwriting them.</p><button type="button" className="member-details-cancel" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Try loading again</button></div> : <>
      <form className="member-account-card member-details-form" onSubmit={saveProfile}>
        <div className="member-account-card-heading"><span><UserRound size={18} /></span><div><h2>Personal and banking details</h2><p>Update the details held on your SACCO account</p></div></div>
        {groups.map((group) => <section key={group} className="account-info-group"><div className="member-details-form-heading"><div><p className="section-kicker">ACCOUNT SETTINGS</p><h2>{group}</h2></div>{group.includes('bank') && <Landmark size={17} />}{group === 'Address' && <MapPin size={17} />}</div>
          <div className="member-details-fields">{fields.filter((field) => field.group === group).map((field) => <label key={field.key}>{field.label}<input type={field.type ?? 'text'} value={profile[field.key] ?? ''} onChange={(event) => setProfile((current) => ({ ...current, [field.key]: event.target.value }))} autoComplete={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'off'} /></label>)}</div>
        </section>)}
        <button className="submit-button" type="submit" disabled={saving}><span>{saving ? 'Updating…' : 'Update account information'}</span><Save size={17} /></button>
      </form>
      <MemberContactsPage compact />
      <form className="member-account-card member-details-form" onSubmit={savePassword}>
        <div className="member-account-card-heading"><span><KeyRound size={18} /></span><div><h2>Change password</h2><p>Use your current password to set a new one</p></div></div>
        <div className="member-details-fields">{[
          ['current-password', 'Current password', currentPassword, setCurrentPassword, 'current-password'],
          ['new-password', 'New password', newPassword, setNewPassword, 'new-password'],
          ['confirm-password', 'Confirm new password', confirmPassword, setConfirmPassword, 'new-password'],
        ].map(([id, label, value, setter, autocomplete]) => <label key={id as string}>{label as string}<input id={id as string} type="password" autoComplete={autocomplete as string} minLength={id === 'current-password' ? undefined : 8} maxLength={256} required value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} /></label>)}</div>
        {passwordError && <p className="form-message error" role="alert">{passwordError}</p>}
        {passwordMessage && <p className="form-message success" role="status">{passwordMessage}</p>}
        <button className="submit-button" type="submit" disabled={passwordSaving}><span>{passwordSaving ? 'Updating…' : 'Update password'}</span><KeyRound size={17} /></button>
      </form>
    </>}
  </section>
}
