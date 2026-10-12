import type { MemberRegistrationForm } from '../../../types'
import { RegistrationInput } from './RegistrationInput'

interface StepAddressBankProps {
  registration: MemberRegistrationForm
  setField: <K extends keyof MemberRegistrationForm>(field: K, value: MemberRegistrationForm[K]) => void
}

export function StepAddressBank({ registration, setField }: StepAddressBankProps) {
  return (
    <section className="join-step" aria-labelledby="join-step-title">
      <div className="join-step-heading">
        <span>02</span>
        <div>
          <h2 id="join-step-title">Address & bank account</h2>
          <p>Tell us where you are based and where to send payments.</p>
        </div>
      </div>

      <div className="join-subsection">
        <h3>Location</h3>
        <div className="join-fields-grid">
          <RegistrationInput
            id="join-county"
            label="County"
            value={registration.county}
            onChange={(v) => setField('county', v)}
            options={{ autoComplete: 'address-level1', maxLength: 100, required: true }}
          />
          <RegistrationInput
            id="join-subcounty"
            label="Sub-county"
            value={registration.subCounty}
            onChange={(v) => setField('subCounty', v)}
            options={{ autoComplete: 'address-level2', maxLength: 100, required: true }}
          />
          <RegistrationInput
            id="join-location"
            label="Town, village, or area"
            value={registration.location}
            onChange={(v) => setField('location', v)}
            options={{ autoComplete: 'address-line1', maxLength: 160, required: true }}
          />
        </div>
      </div>

      <div className="join-subsection">
        <div className="join-subsection-heading">
          <div>
            <h3>Bank account</h3>
            <p>At least one account is required. Add another if needed.</p>
          </div>
          <span>1 of 2</span>
        </div>
        <div className="join-fields-grid">
          <RegistrationInput
            id="join-bank-name"
            label="Bank name"
            value={registration.bankName}
            onChange={(v) => setField('bankName', v)}
            options={{ maxLength: 100, required: true }}
          />
          <RegistrationInput
            id="join-bank-branch"
            label="Branch (optional)"
            value={registration.bankBranch}
            onChange={(v) => setField('bankBranch', v)}
            options={{ maxLength: 100 }}
          />
          <RegistrationInput
            id="join-account-name"
            label="Account holder name"
            value={registration.bankAccountName}
            onChange={(v) => setField('bankAccountName', v)}
            options={{ autoComplete: 'cc-name', maxLength: 100, placeholder: 'Name on the bank account' }}
          />
          <RegistrationInput
            id="join-account-number"
            label="Account number"
            value={registration.bankAccountNumber}
            onChange={(v) => setField('bankAccountNumber', v)}
            options={{ autoComplete: 'off', maxLength: 50, required: true }}
          />
        </div>

        <details className="join-optional-details">
          <summary>
            <span>Add a second bank account</span>
            <small>Optional</small>
          </summary>
          <div className="join-fields-grid">
            <RegistrationInput
              id="join-bank-two-name"
              label="Bank name"
              value={registration.bankTwoName}
              onChange={(v) => setField('bankTwoName', v)}
              options={{ maxLength: 100 }}
            />
            <RegistrationInput
              id="join-bank-two-branch"
              label="Branch"
              value={registration.bankTwoBranch}
              onChange={(v) => setField('bankTwoBranch', v)}
              options={{ maxLength: 100 }}
            />
            <RegistrationInput
              id="join-bank-two-account-name"
              label="Account holder name"
              value={registration.bankTwoAccountName}
              onChange={(v) => setField('bankTwoAccountName', v)}
              options={{ maxLength: 100 }}
            />
            <RegistrationInput
              id="join-bank-two-account-number"
              label="Account number"
              value={registration.bankTwoAccountNumber}
              onChange={(v) => setField('bankTwoAccountNumber', v)}
              options={{ autoComplete: 'off', maxLength: 50 }}
            />
          </div>
        </details>
      </div>
    </section>
  )
}

