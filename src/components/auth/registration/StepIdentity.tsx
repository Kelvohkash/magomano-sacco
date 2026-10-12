import type { MemberRegistrationForm } from '../../../types'
import { RegistrationInput } from './RegistrationInput'

interface StepIdentityProps {
  registration: MemberRegistrationForm
  setField: <K extends keyof MemberRegistrationForm>(field: K, value: MemberRegistrationForm[K]) => void
  nationalId: string
  setNationalId: (value: string) => void
}

export function StepIdentity({
  registration,
  setField,
  nationalId,
  setNationalId,
}: StepIdentityProps) {
  return (
    <section className="join-step join-step-identity" aria-labelledby="join-step-title">
      <div className="join-step-heading">
        <span>01</span>
        <div>
          <h2 id="join-step-title">Your details</h2>
          <p>Use the names shown on your National ID.</p>
        </div>
      </div>
      <div className="join-fields-grid">
        <RegistrationInput
          id="join-first-name"
          label="First name"
          value={registration.firstName}
          onChange={(v) => setField('firstName', v)}
          options={{ autoComplete: 'given-name', maxLength: 60, required: true }}
        />
        <RegistrationInput
          id="join-second-name"
          label="Second name"
          value={registration.secondName}
          onChange={(v) => setField('secondName', v)}
          options={{ autoComplete: 'additional-name', maxLength: 60, required: true }}
        />
        <RegistrationInput
          id="join-last-name"
          label="Last name"
          value={registration.lastName}
          onChange={(v) => setField('lastName', v)}
          options={{ autoComplete: 'family-name', maxLength: 60, required: true }}
        />
        <RegistrationInput
          id="join-national-id"
          label="National ID number"
          value={nationalId}
          onChange={setNationalId}
          options={{
            autoComplete: 'off',
            placeholder: 'e.g. 37765731',
            maxLength: 12,
            pattern: '[0-9]{6,12}',
            inputMode: 'numeric',
            required: true,
          }}
        />
        <RegistrationInput
          id="join-phone-number"
          label="Phone number"
          value={registration.phoneNumber}
          onChange={(v) => setField('phoneNumber', v)}
          options={{
            type: 'tel',
            autoComplete: 'tel',
            placeholder: '+254 712 345 678',
            maxLength: 32,
            required: true,
          }}
        />
        <RegistrationInput
          id="join-email"
          label="Email address (optional)"
          value={registration.email}
          onChange={(v) => setField('email', v)}
          options={{
            type: 'email',
            autoComplete: 'email',
            placeholder: 'you@example.com',
            maxLength: 254,
          }}
        />
      </div>
      <p className="join-privacy-note">Your National ID number is used to identify your SACCO account.</p>
    </section>
  )
}

