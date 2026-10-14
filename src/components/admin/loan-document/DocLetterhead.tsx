import { Landmark } from 'lucide-react'
import { formatDate } from '../../../format'
import type { AdminLoanApplication } from '../../../types'

interface DocLetterheadProps {
  application: AdminLoanApplication
  refCode: string
}

export function DocLetterhead({ application, refCode }: DocLetterheadProps) {
  return (
    <>
      <header className="doc-letterhead">
        <div className="doc-brand-block">
          <div className="doc-crest-icon">
            <Landmark size={28} strokeWidth={2.2} />
          </div>
          <div className="doc-org-text">
            <h1 className="doc-org-name">MAGOMANO COUNTY SACCO</h1>
            <p className="doc-org-address">
              Head Office: P.O. Box 482-00100 Thika, Kenya · Tel: +254 700 000 000 · Email: info@magomanosacco.co.ke
            </p>
          </div>
        </div>

        <div className="doc-badge-block">
          <div className="doc-ref-box">
            <span className="ref-label">DOCUMENT REF</span>
            <strong className="ref-code">{refCode}</strong>
          </div>
          <div className="doc-date-box">
            <span className="date-label">DATE SUBMITTED</span>
            <span className="date-val">{formatDate(application.appliedAt)}</span>
          </div>
        </div>
      </header>

      <div className="doc-banner-strip">
        <span className="banner-title">LOAN APPLICATION</span>
        <span className={`banner-status banner-status-${application.status}`}>
          STATUS: {application.status.toUpperCase()}
        </span>
      </div>
    </>
  )
}

