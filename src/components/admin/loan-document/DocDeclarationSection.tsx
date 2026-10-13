import { formatDate, standardizeName } from '../../../format'
import type { AdminLoanApplication } from '../../../types'

interface DocDeclarationSectionProps {
  application: AdminLoanApplication
}

export function DocDeclarationSection({ application }: DocDeclarationSectionProps) {
  const executionDate = application.electronicallySignedAt
    ? formatDate(application.electronicallySignedAt)
    : formatDate(application.appliedAt)

  return (
    <section className="doc-section doc-section-declaration">
      <div className="doc-sec-header">
        <span className="sec-num">SECTION 03</span>
        <h3 className="sec-title">Member Declaration &amp; Electronic Signature</h3>
      </div>

      <div className="doc-declaration-wrapper">
        <p className="declaration-legal-text">
          I hereby declare that the information provided in this application is true, accurate and complete.
          I authorize Magomano SACCO to recover any outstanding loan installments directly from my salary in accordance
           with the SACCO laws.
          I confirm that my accumulated member savings constitute valid security for this loan.
        </p>

        <div className="declaration-signature-card">
          <div className="signature-header">
            <span className="sig-type">MEMBER SIGNATURE</span>
          </div>
          <div className="signature-display">
            <span className="dancing-signature">
              {standardizeName(application.electronicSignatureName || application.fullName)}
            </span>
          </div>
          <div className="signature-meta">
            <span className="sig-date">Executed: {executionDate}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

