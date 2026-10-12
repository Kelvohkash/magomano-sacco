import type { AdminLoanApplication, AdminMember } from '../../../types'
import { DocLetterhead } from './DocLetterhead'
import { DocMemberSection } from './DocMemberSection'
import { DocFacilitySection } from './DocFacilitySection'
import { DocDeclarationSection } from './DocDeclarationSection'
import { DocSignatoriesSection } from './DocSignatoriesSection'
import { DocFooter } from './DocFooter'

interface LoanDocumentSheetProps {
  application: AdminLoanApplication
  member?: AdminMember
  signatories: AdminMember[]
  refCode: string
  requestedAmount: number
  repaymentMonths: number
  totalInterest: number
  totalRepayable: number
  monthlyInstallment: number
}

export function LoanDocumentSheet({
  application,
  member,
  signatories,
  refCode,
  requestedAmount,
  repaymentMonths,
  totalInterest,
  totalRepayable,
  monthlyInstallment,
}: LoanDocumentSheetProps) {
  return (
    <div className="loan-sheet-wrapper">
      <article className="official-loan-document" id="printable-loan-document">
        <DocLetterhead application={application} refCode={refCode} />
        <DocMemberSection application={application} member={member} />
        <DocFacilitySection
          application={application}
          requestedAmount={requestedAmount}
          repaymentMonths={repaymentMonths}
          totalInterest={totalInterest}
          totalRepayable={totalRepayable}
          monthlyInstallment={monthlyInstallment}
        />
        <DocDeclarationSection application={application} />
        <DocSignatoriesSection signatories={signatories} />
        <DocFooter refCode={refCode} />
      </article>
    </div>
  )
}

