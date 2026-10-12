import type { Dispatch, FormEventHandler, SetStateAction } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { formatDate } from '../../../format'

interface AdminTermsViewProps {
  terms: string
  setTerms: Dispatch<SetStateAction<string>>
  termsUpdatedAt?: string | null
  termsSaving: boolean
  termsMessage: string
  setTermsMessage: (msg: string) => void
  onSaveTerms: FormEventHandler<HTMLFormElement>
}

export function AdminTermsView({
  terms,
  setTerms,
  termsUpdatedAt,
  termsSaving,
  termsMessage,
  setTermsMessage,
  onSaveTerms,
}: AdminTermsViewProps) {
  return (
    <div className="admin-view-panel">
      <div className="view-intro-header">
        <div>
          <h1 className="view-page-title">Member Terms &amp; SACCO By-Laws</h1>
          <p className="view-page-desc">
            Draft, update, and publish official rules and credit terms presented to members on registration and within their account.
          </p>
        </div>
        {termsUpdatedAt && (
          <div className="view-intro-meta">
            <span className="timestamp-badge">Last published: {formatDate(termsUpdatedAt)}</span>
          </div>
        )}
      </div>

      <form className="terms-editor-card" onSubmit={onSaveTerms}>
        <div className="terms-editor-header">
          <div>
            <h3>Published SACCO Terms &amp; Policies</h3>
            <p>Enter the legally binding rules governing member savings, loans, and guarantees.</p>
          </div>
          <span className="char-counter">{terms.length} / 20,000 characters</span>
        </div>

        <textarea
          id="admin-terms"
          className="terms-textarea"
          value={terms}
          onChange={(e) => {
            setTerms(e.target.value)
            setTermsMessage('')
          }}
          rows={16}
          maxLength={20000}
          minLength={20}
          placeholder="Enter the official SACCO terms and conditions..."
          required
        />

        {termsMessage && (
          <div className="admin-banner-alert alert-success">
            <CheckCircle2 size={16} />
            <span>{termsMessage}</span>
          </div>
        )}

        <div className="terms-actions-bar">
          <span className="terms-note">
            Changes take effect immediately for all member sign-ups and loan applications.
          </span>
          <button
            className="submit-button"
            type="submit"
            disabled={termsSaving || terms.trim().length < 20}
          >
            <span>{termsSaving ? 'Publishing Terms…' : 'Publish Terms & Conditions'}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}
