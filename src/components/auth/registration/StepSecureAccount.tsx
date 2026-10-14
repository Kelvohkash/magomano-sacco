import type { Dispatch, SetStateAction } from 'react'
import { Check, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import type { MemberRegistrationForm } from '../../../types'

interface StepSecureAccountProps {
  registration: MemberRegistrationForm
  setField: <K extends keyof MemberRegistrationForm>(field: K, value: MemberRegistrationForm[K]) => void
  password: string
  setPassword: Dispatch<SetStateAction<string>>
  confirmPassword: string
  setConfirmPassword: Dispatch<SetStateAction<string>>
  showPassword: boolean
  setShowPassword: Dispatch<SetStateAction<boolean>>
  terms: string
  termsVersion: string | null
  termsLoading: boolean
  termsError: string
}

export function StepSecureAccount({
  registration,
  setField,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  terms,
  termsVersion,
  termsLoading,
  termsError,
}: StepSecureAccountProps) {
  return (
    <section className="join-step" aria-labelledby="join-step-title">
      <div className="join-step-heading">
        <span>04</span>
        <div>
          <h2 id="join-step-title">Secure your account</h2>
          <p>Choose a password and review the SACCO terms.</p>
        </div>
      </div>

      <div className="join-password-grid">
        <div className="join-password-group">
          <label className="join-field" htmlFor="password">
            <span>Create password <b aria-hidden="true">*</b></span>
          </label>
          <div className="password-field">
            <LockKeyhole className="field-icon" size={17} strokeWidth={1.8} aria-hidden="true" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              className="visibility-button"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="join-password-group">
          <label className="join-field" htmlFor="confirm-password">
            <span>Confirm password <b aria-hidden="true">*</b></span>
          </label>
          <div className="password-field">
            <LockKeyhole className="field-icon" size={17} strokeWidth={1.8} aria-hidden="true" />
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Enter the password again"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              className="visibility-button"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <section className="join-terms-card" aria-labelledby="join-terms-title">
        <div className="join-terms-heading">
          <span><Check size={17} /></span>
          <div>
            <h3 id="join-terms-title">Terms & conditions</h3>
            <p>Review the current terms before submitting your application.</p>
          </div>
        </div>
        {termsLoading ? (
          <p className="join-terms-status">Loading current terms…</p>
        ) : termsError ? (
          <p className="join-terms-status error" role="alert">{termsError}</p>
        ) : terms ? (
          <details className="join-terms-details">
            <summary>Read the SACCO terms and conditions</summary>
            <div className="join-terms-content">{terms}</div>
          </details>
        ) : (
          <p className="join-terms-status error">
            The SACCO has not published its terms yet. You can complete the application when they are available.
          </p>
        )}
        <label className="join-consent">
          <input
            type="checkbox"
            checked={registration.acceptedTerms}
            onChange={(e) => setField('acceptedTerms', e.target.checked)}
            required
            disabled={termsLoading || !terms || !termsVersion}
          />
          <span>I have read and agree to the current Magomano County Sacco terms and conditions.</span>
        </label>
      </section>
    </section>
  )
}

