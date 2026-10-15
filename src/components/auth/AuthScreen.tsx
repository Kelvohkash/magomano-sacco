import { useRef, useState, type Dispatch, type FormEventHandler, type SetStateAction } from 'react'
import type { AuthMode, MemberRegistrationForm } from '../../types'
import countyLogo from '../../../Logo.webp'
import { AdminLoginForm } from './AdminLoginForm'
import { AuthWelcomeAside } from './AuthWelcomeAside'
import { MemberLoginForm } from './MemberLoginForm'
import { RegistrationForm } from './RegistrationForm'
import { RegistrationStepsIndicator } from './RegistrationStepsIndicator'
import { useMobileBackHandler } from '../../hooks/useMobileBackHandler'

export interface AuthScreenProps {
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
  const logoSrc = typeof window !== 'undefined' && (window as any).__NEW_LOGO_BASE64__ ? (window as any).__NEW_LOGO_BASE64__ : countyLogo

  function continueRegistration() {
    const form = formRef.current
    if (!form) return
    if (!form.reportValidity()) return
    setStep((current) => Math.min(current + 1, registrationSteps.length - 1))
    form.closest<HTMLElement>('.registration-panel')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Back Button Navigation & Double-Back to Exit
  let activeModalClose: (() => void) | null = null
  if (mode === 'register' && step > 0) {
    activeModalClose = () => setStep((s) => Math.max(0, s - 1))
  }

  const isRoot = mode === 'login'

  const { showExitToast } = useMobileBackHandler({
    activeModalClose,
    currentView: mode,
    onGoToRoot: () => onChangeMode('login'),
    isRoot,
  })

  return (
    <main className={`login-shell ${mode === 'register' ? 'join-shell' : ''}`}>
      {showExitToast && (
        <div className="mobile-exit-toast" role="status" aria-live="polite">
          Swipe back again to exit
        </div>
      )}
      <AuthWelcomeAside />

      <section className={`form-panel ${mode === 'register' ? 'registration-panel' : ''}`}>
        <div className="mobile-auth-wordmark" aria-label="Magomano County SACCO">
          <img className="mobile-auth-emblem" src={logoSrc} alt="" />
          <strong>MAGOMANO</strong>
          <span className="mobile-auth-tagline">COUNTY SACCO</span>
        </div>

        <div className="form-content" key={mode}>
          {mode === 'register' ? (
            <RegistrationStepsIndicator step={step} steps={registrationSteps} />
          ) : (
            <div className="form-heading">
              <h4>{mode === 'admin-login' ? 'Admin portal' : 'Welcome back'}</h4>
            </div>
          )}

          <form ref={formRef} onSubmit={onSubmit}>
            {mode === 'register' ? (
              <RegistrationForm
                step={step}
                setStep={setStep}
                totalSteps={registrationSteps.length}
                registration={registration}
                setRegistration={setRegistration}
                nationalId={nationalId}
                setNationalId={setNationalId}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                terms={terms}
                termsVersion={termsVersion}
                termsLoading={termsLoading}
                termsError={termsError}
                isSubmitting={isSubmitting}
                onContinue={continueRegistration}
                onBackToSignIn={() => onChangeMode('login')}
              />
            ) : mode === 'admin-login' ? (
              <AdminLoginForm
                adminUsername={adminUsername}
                setAdminUsername={setAdminUsername}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                isSubmitting={isSubmitting}
              />
            ) : (
              <MemberLoginForm
                nationalId={nationalId}
                setNationalId={setNationalId}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                isSubmitting={isSubmitting}
              />
            )}

            {message && (
              <div className={`form-message ${isSuccess ? 'success' : 'error'}`} role="status">
                {message}
              </div>
            )}
          </form>

          {mode !== 'register' && (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className={`secondary-auth-button ${mode === 'login' ? 'join-sacco-button' : ''}`}
                onClick={() => onChangeMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'admin-login' ? 'Member sign in' : 'Join the SACCO'}
              </button>
            </>
          )}

          {mode === 'login' && (
            <button
              type="button"
              className="admin-entry-link"
              onClick={() => onChangeMode('admin-login')}
            >
              Admin sign in
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
