import { formatDate, standardizeName } from '../../../format'
import type { AdminLoanApplication } from '../../../types'

interface DocDeclarationSectionProps {
  application: AdminLoanApplication
}

export function DocDeclarationSection({ application }: DocDeclarationSectionProps) {
  const hasElectronicSignature = Boolean(application.electronicSignatureName && application.electronicallySignedAt)
  const executionDate = formatDate(application.electronicallySignedAt ?? application.appliedAt)

  return (
    <section className="doc-section doc-section-declaration">
      <div className="doc-sec-header">
        <span className="sec-num">SECTION 03</span>
        <h3 className="sec-title">
          {hasElectronicSignature ? 'Member Declaration & Electronic Signature' : 'Administrator Issuance Record'}
        </h3>
      </div>

      <div className="doc-declaration-wrapper">
        {hasElectronicSignature ? (
          <p className="declaration-legal-text">
            I hereby declare that the information provided in this application is true, accurate and complete.
            I authorize Magomano County Sacco to recover any outstanding loan installments directly from my salary in accordance
             with the SACCO laws.
            I confirm that my accumulated member savings constitute valid security for this loan.
          </p>
        ) : (
          <p className="declaration-legal-text">
            This loan was issued directly by the SACCO administration and was not submitted or electronically signed by the member.
          </p>
        )}

        <div className="declaration-signature-card">
          <div className="signature-display">
            <span className="dancing-signature">
              {hasElectronicSignature
                ? standardizeName(application.electronicSignatureName)
                : 'Administrator-issued loan record'}
            </span>
          </div>
          <div className="signature-meta">
            <span className="sig-date">
              {hasElectronicSignature
                ? `Member electronic signature, signed on: ${executionDate}`
                : `Issued on: ${executionDate}`}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
