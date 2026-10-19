import { useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react'
import { readJsonResponse, requestErrorMessage } from '../../networkErrors'

export function MemberChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!currentPassword) {
      setError('Enter your current password first.')
      return
    }
    if (newPassword.length < 8) {
      setError('Your new password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/member/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not change password.')

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage(result.message ?? 'Password changed successfully. Your new password is now active.')
    } catch (cause) {
      setError(requestErrorMessage(cause, 'Could not change password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="member-account-page member-password-page">
      <div className="dashboard-intro">
        <p className="dashboard-kicker">SECURITY &amp; CREDENTIALS</p>
        <h1>Change Password</h1>
        <p>
          Update your member portal password anytime. Changes take effect immediately without requiring any admin approval.
        </p>
      </div>

      <div className="member-immediate-security-note">
        <ShieldCheck size={20} className="security-note-icon" />
        <div>
          <strong>Direct &amp; Instant Update</strong>
          <p>
            For your security, password updates are processed instantly and apply directly to your account.
            All other active sessions on other devices will be signed out.
          </p>
        </div>
      </div>

      <form className="member-account-card member-details-form member-password-form" onSubmit={handlePasswordSubmit}>
        <div className="member-account-card-heading">
          <span><KeyRound size={18} /></span>
          <div>
            <h2>Set a New Password</h2>
            <p>Enter your current login credentials and choose a strong new password</p>
          </div>
        </div>

        <div className="member-details-fields member-password-fields">
          <label>
            Current Password
            <input
              id="member-current-password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>

          <label>
            New Password (min 8 characters)
            <input
              id="member-new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={256}
              required
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <label>
            Confirm New Password
            <input
              id="member-confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={256}
              required
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
        </div>

        {/* Immediate inline feedback directly above the button */}
        {message && (
          <div className="member-form-inline-alert alert-success" role="status">
            <CheckCircle2 size={18} className="alert-icon" />
            <div>
              <strong>Password Changed</strong>
              <p>{message}</p>
            </div>
          </div>
        )}
        {error && (
          <div className="member-form-inline-alert alert-error" role="alert">
            <AlertCircle size={18} className="alert-icon" />
            <div>
              <strong>Password Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="form-submit-footer">
          <button className="submit-button" type="submit" disabled={saving}>
            <span>{saving ? 'Updating Password…' : 'Update Password Now'}</span>
            <KeyRound size={17} />
          </button>
        </div>
      </form>
    </section>
  )
}
