import type { AdminLoanApplication, AdminMember } from '../../../types'

interface DocMemberSectionProps {
  application: AdminLoanApplication
  member?: AdminMember
}

export function DocMemberSection({ application, member }: DocMemberSectionProps) {
  const locationString = [member?.location, member?.subCounty, member?.county]
    .filter(Boolean)
    .join(', ') || '—'

  const payoutBankInfo = application.payoutBankName
    ? `${application.payoutBankName}${application.payoutBankBranch ? ` (${application.payoutBankBranch})` : ''}`
    : 'Primary Registered Account'

  return (
    <section className="doc-section doc-section-member">
      <div className="doc-sec-header">
        <span className="sec-num">SECTION 01</span>
        <h3 className="sec-title">Member &amp; Disbursement Information</h3>
      </div>

      <div className="doc-member-layout">
        <div className="doc-member-panel doc-member-particulars">
          <div className="doc-member-panel-heading">Member particulars</div>
          <div className="doc-grid-member">
            <div className="doc-member-field doc-member-name">
              <span className="cell-label">Full Name</span>
              <strong className="cell-val primary-text">{application.fullName}</strong>
            </div>
            <div className="doc-member-field">
              <span className="cell-label">National Identity No.</span>
              <strong className="cell-val">{application.nationalId}</strong>
            </div>
            <div className="doc-member-field">
              <span className="cell-label">Mobile Phone</span>
              <span className="cell-val">{member?.phoneNumber || '—'}</span>
            </div>
            <div className="doc-member-field">
              <span className="cell-label">Email Address</span>
              <span className="cell-val">{member?.email || '—'}</span>
            </div>
            <div className="doc-member-field">
              <span className="cell-label">County &amp; Location</span>
              <span className="cell-val">{locationString}</span>
            </div>
            <div className="doc-member-field">
              <span className="cell-label">Job Title / Role</span>
              <span className="cell-val">{member?.jobTitle || '—'}</span>
            </div>
            <div className="doc-member-field">
              <span className="cell-label">Work Branch</span>
              <span className="cell-val">{member?.workBranch || '—'}</span>
            </div>
          </div>
        </div>

        <div className="doc-member-panel doc-member-disbursement">
          <div className="doc-member-panel-heading">Disbursement details</div>
          <div className="doc-disbursement-grid">
            <div className="doc-member-field">
              <span className="cell-label">Bank &amp; Branch</span>
              <span className="cell-val">{payoutBankInfo}</span>
            </div>
            <div className="doc-member-field">
              <span className="cell-label">Account Number</span>
              <span className="cell-val">{application.payoutAccountNumber || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
