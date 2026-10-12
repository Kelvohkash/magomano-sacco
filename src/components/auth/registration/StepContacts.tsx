import type { MemberRegistrationForm } from '../../../types'
import { RegistrationInput } from './RegistrationInput'

interface StepContactsProps {
  registration: MemberRegistrationForm
  setField: <K extends keyof MemberRegistrationForm>(field: K, value: MemberRegistrationForm[K]) => void
}

export function StepContacts({ registration, setField }: StepContactsProps) {
  return (
    <section className="join-step" aria-labelledby="join-step-title">
      <div className="join-step-heading">
        <span>03</span>
        <div>
          <h2 id="join-step-title">Contact persons</h2>
          <p>People the SACCO can reach about your account.</p>
        </div>
      </div>

      <div className="join-contact-card">
        <div className="join-subsection-heading">
          <div>
            <h3>Primary contact</h3>
            <p>One person is required.</p>
          </div>
          <span>Required</span>
        </div>
        <div className="join-fields-grid">
          <RegistrationInput
            id="join-contact-name"
            label="Full name"
            value={registration.contactName}
            onChange={(v) => setField('contactName', v)}
            options={{ autoComplete: 'name', maxLength: 100, required: true }}
          />
          <RegistrationInput
            id="join-contact-relationship"
            label="Relationship"
            value={registration.contactRelationship}
            onChange={(v) => setField('contactRelationship', v)}
            options={{ placeholder: 'e.g. Parent, sibling', maxLength: 60, required: true }}
          />
          <RegistrationInput
            id="join-contact-phone"
            label="Phone number"
            value={registration.contactPhoneNumber}
            onChange={(v) => setField('contactPhoneNumber', v)}
            options={{ type: 'tel', autoComplete: 'tel', placeholder: '+254 712 345 678', maxLength: 32, required: true }}
          />
        </div>
      </div>

      <details className="join-optional-details join-second-contact">
        <summary>
          <span>Add a second contact person</span>
          <small>Optional · up to 2</small>
        </summary>
        <div className="join-fields-grid">
          <RegistrationInput
            id="join-contact-two-name"
            label="Full name"
            value={registration.secondContactName}
            onChange={(v) => setField('secondContactName', v)}
            options={{ maxLength: 100 }}
          />
          <RegistrationInput
            id="join-contact-two-relationship"
            label="Relationship"
            value={registration.secondContactRelationship}
            onChange={(v) => setField('secondContactRelationship', v)}
            options={{ placeholder: 'e.g. Parent, sibling', maxLength: 60 }}
          />
          <RegistrationInput
            id="join-contact-two-phone"
            label="Phone number"
            value={registration.secondContactPhoneNumber}
            onChange={(v) => setField('secondContactPhoneNumber', v)}
            options={{ type: 'tel', maxLength: 32 }}
          />
        </div>
      </details>

      <p className="join-privacy-note">
        Please make sure each person knows they may be contacted by the SACCO.
      </p>
    </section>
  )
}

