import type { AdminMember } from '../../../types'

interface DocSignatoriesSectionProps {
  signatories: AdminMember[]
}

export function DocSignatoriesSection({ signatories }: DocSignatoriesSectionProps) {
  return (
    <section className="doc-section doc-section-signatories">
      <div className="doc-sec-header">
        <span className="sec-num">SECTION 04</span>
        <h3 className="sec-title">SaccoAuthorization</h3>
        <span className="sec-tag">Official Governance Sign-off</span>
      </div>

      <div className="doc-signatories-grid">
        {signatories.map((signatory) => (
          <div className="signatory-block" key={signatory.id}>
            <div className="signatory-title-row">
              <strong>{signatory.fullName}</strong>
              <span className="signatory-role">
                {[signatory.jobTitle || 'Authorized Signatory', signatory.workBranch].filter(Boolean).join(' · ')}
              </span>
            </div>
            <div className="signatory-signing-zone">
              <div className="sign-line" />
              <span className="sign-label">Authorized Signature</span>
            </div>
            <div className="date-line-wrap">
              <span className="date-label">Date:</span>
              <span className="date-blank">____ / ____ / 2026</span>
            </div>
          </div>
        ))}

      </div>
    </section>
  )
}
