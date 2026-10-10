import { useRef, useState, type Dispatch, type FormEventHandler, type SetStateAction } from 'react'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import type { AuthMode, MemberRegistrationForm } from '../types'

interface AuthScreenProps {
  mode: AuthMode
  nationalId: string
  setNationalId: Dispatch<SetStateAction<string>>
  adminUsername: string
  setAdminUsername: Dispatch<SetStateAction<string>>
  registration: MemberRegistrationForm
  setRegistration: Dispatch<SetStateAction<MemberRegistrationForm>>
  terms: string
  termsVersion: string | null
  termsLoading: boolean
  termsError: string
  password: string
  setPassword: Dispatch<SetStateAction<string>>
  confirmPassword: string
  setConfirmPassword: Dispatch<SetStateAction<string>>
  showPassword: boolean
  setShowPassword: Dispatch<SetStateAction<boolean>>
  isSubmitting: boolean
  message: string
  isSuccess: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  onChangeMode: (mode: AuthMode) => void
}

const registrationSteps = [
  { title: 'Your details', description: 'Names and contact information' },
  { title: 'Address & bank', description: 'Where you live and account details' },
  { title: 'Contacts', description: 'People the SACCO can reach' },
  { title: 'Secure your account', description: 'Password and terms' },
]

export function AuthScreen({
  mode,
  nationalId,
  setNationalId,
  adminUsername,
  setAdminUsername,
  registration,
  setRegistration,
  terms,
  termsVersion,
  termsLoading,
  termsError,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  isSubmitting,
  message,
  isSuccess,
  onSubmit,
  onChangeMode,
}: AuthScreenProps) {
  const [step, setStep] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  function setField<K extends keyof MemberRegistrationForm>(field: K, value: MemberRegistrationForm[K]) {
    setRegistration((current) => ({ ...current, [field]: value }))
  }

  function continueRegistration() {
    const form = formRef.current
    if (!form) return
    if (!form.reportValidity()) return
    setStep((current) => Math.min(current + 1, registrationSteps.length - 1))
    form.closest<HTMLElement>('.registration-panel')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function registrationInput(
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: {
      autoComplete?: string
      type?: string
      placeholder?: string
      maxLength?: number
      pattern?: string
      inputMode?: 'text' | 'numeric' | 'tel' | 'email'
      required?: boolean
    } = {},
  ) {
    return (
      <label className="join-field" htmlFor={id}>
        <span>{label}{options.required && <b aria-hidden="true"> *</b>}</span>
        <input
          id={id}
          type={options.type ?? 'text'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={options.autoComplete}
          placeholder={options.placeholder}
          maxLength={options.maxLength}
          pattern={options.pattern}
          inputMode={options.inputMode}
          required={options.required}
        />
      </label>
    )
  }

  return (
    <main className={`login-shell ${mode === 'register' ? 'join-shell' : ''}`}>
      <aside className="welcome-panel" aria-label="Magomano SACCO">
        <div className="welcome-copy">
          <h1 className="auth-wordmark"><span>MAGOMANO</span><em>SAVINGS SACCO</em></h1>
        </div>
        <div className="panel-decoration" aria-hidden="true"><span /><span /><span /></div>
      </aside>

      <section className={`form-panel ${mode === 'register' ? 'registration-panel' : ''}`}>
        <div className="mobile-auth-wordmark" aria-label="Magomano Savings SACCO">
          <strong>MAGOMANO</strong>
          <span>SAVINGS SACCO</span>
        </div>

        <div className="form-content" key={mode}>
          {mode === 'register' ? (
            <>
              <div className="join-heading">
                <span className="join-kicker">MEMBERSHIP APPLICATION</span>
                <h1>Join Magomano SACCO</h1>
                <p>Your details are saved securely and reviewed by our team.</p>
              </div>

              <div className="join-progress" aria-label={`Step ${step + 1} of ${registrationSteps.length}`}>
                <div className="join-progress-top">
                  <span>Step {step + 1} of {registrationSteps.length}</span>
                  <strong>{registrationSteps[step].title}</strong>
                </div>
                <div className="join-progress-track">
                  {registrationSteps.map((item, index) => (
                    <span
                      key={item.title}
                      className={`join-progress-segment ${index <= step ? 'complete' : ''}`}
                    />
                  ))}
                </div>
                <div className="join-step-labels">
                  {registrationSteps.map((item, index) => (
                    <span key={item.title} className={index === step ? 'current' : index < step ? 'complete' : ''}>
                      {index < step ? <Check size={12} aria-hidden="true" /> : index + 1}
                      <span>{item.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="form-heading">
              <h4>{mode === 'admin-login' ? 'Admin portal' : 'Welcome back'}</h4>
            </div>
          )}

          <form ref={formRef} onSubmit={onSubmit}>
            {mode === 'register' && step === 0 && (
              <section className="join-step join-step-identity" aria-labelledby="join-step-title">
                <div className="join-step-heading">
                  <span>01</span>
                  <div><h2 id="join-step-title">Your details</h2><p>Use the names shown on your National ID.</p></div>
                </div>
                <div className="join-fields-grid">
                  {registrationInput('join-first-name', 'First name', registration.firstName, (value) => setField('firstName', value), { autoComplete: 'given-name', maxLength: 60, required: true })}
                  {registrationInput('join-second-name', 'Second name', registration.secondName, (value) => setField('secondName', value), { autoComplete: 'additional-name', maxLength: 60, required: true })}
                  {registrationInput('join-last-name', 'Last name', registration.lastName, (value) => setField('lastName', value), { autoComplete: 'family-name', maxLength: 60, required: true })}
                  {registrationInput('join-national-id', 'National ID number', nationalId, setNationalId, { autoComplete: 'off', placeholder: 'e.g. 37765731', maxLength: 12, pattern: '[0-9]{6,12}', inputMode: 'numeric', required: true })}
                  {registrationInput('join-phone-number', 'Phone number', registration.phoneNumber, (value) => setField('phoneNumber', value), { type: 'tel', autoComplete: 'tel', placeholder: '+254 712 345 678', maxLength: 32, required: true })}
                  {registrationInput('join-email', 'Email address (optional)', registration.email, (value) => setField('email', value), { type: 'email', autoComplete: 'email', placeholder: 'you@example.com', maxLength: 254 })}
                </div>
                <p className="join-privacy-note">Your National ID number is used to identify your SACCO account.</p>
              </section>
            )}

            {mode === 'register' && step === 1 && (
              <section className="join-step" aria-labelledby="join-step-title">
                <div className="join-step-heading">
                  <span>02</span>
                  <div><h2 id="join-step-title">Address & bank account</h2><p>Tell us where you are based and where to send payments.</p></div>
                </div>
                <div className="join-subsection">
                  <h3>Location</h3>
                  <div className="join-fields-grid">
                    {registrationInput('join-county', 'County', registration.county, (value) => setField('county', value), { autoComplete: 'address-level1', maxLength: 100, required: true })}
                    {registrationInput('join-subcounty', 'Sub-county', registration.subCounty, (value) => setField('subCounty', value), { autoComplete: 'address-level2', maxLength: 100, required: true })}
                    {registrationInput('join-location', 'Town, village, or area', registration.location, (value) => setField('location', value), { autoComplete: 'address-line1', maxLength: 160, required: true })}
                  </div>
                </div>
                <div className="join-subsection">
                  <div className="join-subsection-heading"><div><h3>Bank account</h3><p>At least one account is required. Add another if needed.</p></div><span>1 of 2</span></div>
                  <div className="join-fields-grid">
                    {registrationInput('join-bank-name', 'Bank name', registration.bankName, (value) => setField('bankName', value), { maxLength: 100, required: true })}
                    {registrationInput('join-bank-branch', 'Branch (optional)', registration.bankBranch, (value) => setField('bankBranch', value), { maxLength: 100 })}
                    {registrationInput('join-account-name', 'Account holder name', registration.bankAccountName, (value) => setField('bankAccountName', value), { autoComplete: 'cc-name', maxLength: 100, placeholder: 'Name on the bank account' })}
                    {registrationInput('join-account-number', 'Account number', registration.bankAccountNumber, (value) => setField('bankAccountNumber', value), { autoComplete: 'off', maxLength: 50, required: true })}
                  </div>
                  <details className="join-optional-details">
                    <summary><span>Add a second bank account</span><small>Optional</small></summary>
                    <div className="join-fields-grid">
                      {registrationInput('join-bank-two-name', 'Bank name', registration.bankTwoName, (value) => setField('bankTwoName', value), { maxLength: 100 })}
                      {registrationInput('join-bank-two-branch', 'Branch', registration.bankTwoBranch, (value) => setField('bankTwoBranch', value), { maxLength: 100 })}
                      {registrationInput('join-bank-two-account-name', 'Account holder name', registration.bankTwoAccountName, (value) => setField('bankTwoAccountName', value), { maxLength: 100 })}
                      {registrationInput('join-bank-two-account-number', 'Account number', registration.bankTwoAccountNumber, (value) => setField('bankTwoAccountNumber', value), { autoComplete: 'off', maxLength: 50 })}
                    </div>
                  </details>
                </div>
              </section>
            )}

            {mode === 'register' && step === 2 && (
              <section className="join-step" aria-labelledby="join-step-title">
                <div className="join-step-heading">
                  <span>03</span>
                  <div><h2 id="join-step-title">Contact persons</h2><p>People the SACCO can reach about your account.</p></div>
                </div>
                <div className="join-contact-card">
                  <div className="join-subsection-heading"><div><h3>Primary contact</h3><p>One person is required.</p></div><span>Required</span></div>
                  <div className="join-fields-grid">
                    {registrationInput('join-contact-name', 'Full name', registration.contactName, (value) => setField('contactName', value), { autoComplete: 'name', maxLength: 100, required: true })}
                    {registrationInput('join-contact-relationship', 'Relationship', registration.contactRelationship, (value) => setField('contactRelationship', value), { placeholder: 'e.g. Parent, sibling', maxLength: 60, required: true })}
                    {registrationInput('join-contact-phone', 'Phone number', registration.contactPhoneNumber, (value) => setField('contactPhoneNumber', value), { type: 'tel', autoComplete: 'tel', placeholder: '+254 712 345 678', maxLength: 32, required: true })}
                  </div>
                </div>
                <details className="join-optional-details join-second-contact">
                  <summary><span>Add a second contact person</span><small>Optional · up to 2</small></summary>
                  <div className="join-fields-grid">
                    {registrationInput('join-contact-two-name', 'Full name', registration.secondContactName, (value) => setField('secondContactName', value), { maxLength: 100 })}
                    {registrationInput('join-contact-two-relationship', 'Relationship', registration.secondContactRelationship, (value) => setField('secondContactRelationship', value), { placeholder: 'e.g. Parent, sibling', maxLength: 60 })}
                    {registrationInput('join-contact-two-phone', 'Phone number', registration.secondContactPhoneNumber, (value) => setField('secondContactPhoneNumber', value), { type: 'tel', maxLength: 32 })}
                  </div>
                </details>
                <p className="join-privacy-note">Please make sure each person knows they may be contacted by the SACCO.</p>
              </section>
            )}

            {mode === 'register' && step === 3 && (
              <section className="join-step" aria-labelledby="join-step-title">
                <div className="join-step-heading">
                  <span>04</span>
                  <div><h2 id="join-step-title">Secure your account</h2><p>Choose a password and review the SACCO terms.</p></div>
                </div>
                <div className="join-password-grid">
                  <div className="join-password-group">
                    <label className="join-field" htmlFor="password"><span>Create password <b aria-hidden="true">*</b></span></label>
                    <div className="password-field">
                      <LockKeyhole className="field-icon" size={17} strokeWidth={1.8} aria-hidden="true" />
                      <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                      <button className="visibility-button" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="join-password-group">
                    <label className="join-field" htmlFor="confirm-password"><span>Confirm password <b aria-hidden="true">*</b></span></label>
                    <div className="password-field">
                      <LockKeyhole className="field-icon" size={17} strokeWidth={1.8} aria-hidden="true" />
                      <input id="confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter the password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                      <button className="visibility-button" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <section className="join-terms-card" aria-labelledby="join-terms-title">
                  <div className="join-terms-heading">
                    <span><Check size={17} /></span>
                    <div><h3 id="join-terms-title">Terms & conditions</h3><p>Review the current terms before submitting your application.</p></div>
                  </div>
                  {termsLoading ? <p className="join-terms-status">Loading current terms…</p>
                    : termsError ? <p className="join-terms-status error" role="alert">{termsError}</p>
                      : terms ? (
                        <details className="join-terms-details">
                          <summary>Read the SACCO terms and conditions</summary>
                          <div className="join-terms-content">{terms}</div>
                        </details>
                      ) : <p className="join-terms-status error">The SACCO has not published its terms yet. You can complete the application when they are available.</p>}
                  <label className="join-consent">
                    <input
                      type="checkbox"
                      checked={registration.acceptedTerms}
                      onChange={(event) => setField('acceptedTerms', event.target.checked)}
                      required
                      disabled={termsLoading || !terms || !termsVersion}
                    />
                    <span>I have read and agree to the current Magomano SACCO terms and conditions.</span>
                  </label>
                </section>
              </section>
            )}

            {mode === 'admin-login' ? (
              <>
                <label className="field-label" htmlFor="admin-username">Admin username</label>
                <input id="admin-username" name="username" type="text" autoComplete="username" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} required />
                <div className="password-label-row">
                  <label className="field-label" htmlFor="admin-password">Admin password</label>
                </div>
                <div className="password-field">
                  <LockKeyhole className="field-icon" size={17} strokeWidth={1.8} aria-hidden="true" />
                  <input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your admin password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                  <button className="visibility-button" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </>
            ) : mode === 'login' ? (
              <>
                <label className="field-label" htmlFor="national-id">National ID</label>
                <input id="national-id" name="nationalId" type="text" autoComplete="username" inputMode="numeric" placeholder="e.g. 37765731" value={nationalId} onChange={(event) => setNationalId(event.target.value)} pattern="[0-9]{6,12}" maxLength={12} title="Enter 6 to 12 digits" required />
                <div className="password-label-row">
                  <label className="field-label" htmlFor="password">Password</label>
                </div>
                <div className="password-field">
                  <LockKeyhole className="field-icon" size={17} strokeWidth={1.8} aria-hidden="true" />
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                  <button className="visibility-button" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </>
            ) : null}

            {message && <div className={`form-message ${isSuccess ? 'success' : 'error'}`} role="status">{message}</div>}

            {mode === 'register' ? (
              <div className="join-form-actions">
                {step > 0 && (
                  <button type="button" className="join-back-button" onClick={() => setStep((current) => Math.max(0, current - 1))}>
                    <ArrowLeft size={17} /> Back
                  </button>
                )}
                {step < registrationSteps.length - 1 ? (
                  <button type="button" className="join-next-button" onClick={continueRegistration}>
                    Continue <ArrowRight size={17} />
                  </button>
                ) : (
                  <button className="join-next-button" type="submit" disabled={isSubmitting || termsLoading || !terms || !termsVersion}>
                    {isSubmitting ? 'Submitting application…' : 'Submit membership application'}
                    {!isSubmitting && <ArrowRight size={17} />}
                  </button>
                )}
              </div>
            ) : (
              <button className="submit-button" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Signing in…' : mode === 'admin-login' ? 'Admin sign in' : 'Sign in'}</span>
                {!isSubmitting && <ArrowRight size={18} strokeWidth={1.8} />}
              </button>
            )}
          </form>

          <div className="auth-divider"><span>or</span></div>
          <button
            type="button"
            className="secondary-auth-button"
            onClick={() => onChangeMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'register' ? 'Back to sign in' : mode === 'admin-login' ? 'Member sign in' : 'Join the SACCO'}
          </button>
          {mode === 'login' && <button type="button" className="admin-entry-link" onClick={() => onChangeMode('admin-login')}>Admin sign in</button>}
        </div>
      </section>
    </main>
  )
}
