import type { Dispatch, SetStateAction } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { MemberRegistrationForm } from '../../types'
import { StepAddressBank } from './registration/StepAddressBank'
import { StepContacts } from './registration/StepContacts'
import { StepIdentity } from './registration/StepIdentity'
import { StepSecureAccount } from './registration/StepSecureAccount'

interface RegistrationFormProps {
  step: number
  setStep: Dispatch<SetStateAction<number>>
  totalSteps: number
  registration: MemberRegistrationForm
  setRegistration: Dispatch<SetStateAction<MemberRegistrationForm>>
  nationalId: string
  setNationalId: Dispatch<SetStateAction<string>>
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
  isSubmitting: boolean
  onContinue: () => void
  onBackToSignIn: () => void
}

export function RegistrationForm({
  step,
  setStep,
  totalSteps,
  registration,
  setRegistration,
  nationalId,
  setNationalId,
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
  isSubmitting,
  onContinue,
  onBackToSignIn,
}: RegistrationFormProps) {
  function setField<K extends keyof MemberRegistrationForm>(
    field: K,
    value: MemberRegistrationForm[K],
  ) {
    setRegistration((current) => ({ ...current, [field]: value }))
  }

  return (
    <>
      {step === 0 && (
        <StepIdentity
          registration={registration}
          setField={setField}
          nationalId={nationalId}
          setNationalId={setNationalId}
        />
      )}

      {step === 1 && (
        <StepAddressBank registration={registration} setField={setField} />
      )}

      {step === 2 && (
        <StepContacts registration={registration} setField={setField} />
      )}

      {step === 3 && (
        <StepSecureAccount
          registration={registration}
          setField={setField}
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
        />
      )}

      <div className="join-form-actions">
        {step > 0 && (
          <button
            type="button"
            className="join-back-button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft size={17} /> Back
          </button>
        )}
        <button type="button" className="join-sign-in-button" onClick={onBackToSignIn}>
          Back to sign in
        </button>
        {step < totalSteps - 1 ? (
          <button type="button" className="join-next-button" onClick={onContinue}>
            Continue <ArrowRight size={17} />
          </button>
        ) : (
          <button
            className="join-next-button"
            type="submit"
            disabled={isSubmitting || termsLoading || !terms || !termsVersion}
          >
            {isSubmitting ? 'Submitting application…' : 'Submit membership application'}
            {!isSubmitting && <ArrowRight size={17} />}
          </button>
        )}
      </div>
    </>
  )
}
