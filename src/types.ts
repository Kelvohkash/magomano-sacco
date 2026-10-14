export interface DashboardData {
  maintenance: {
    enabled: boolean
    message: string
  }
  memberMessages: MemberPopupMessage[]
  member: {
    national_id: string
    full_name: string
    bankAccounts: {
      id: 'primary' | 'secondary'
      bankName: string
      branch: string
      accountName: string
      accountNumber: string
    }[]
  }
  borrowingCapacity: {
    savingsBalance: number
    activeLoanBalance: number
    pendingApplications: number
    availableBalance: number
  }
  savings: {
    balance: number
    statement: {
      entryType: 'deposit'
      amount: number
      description: string
      occurredAt: string
    }[]
  }
  loans: {
    outstandingBalance: number
    repayments: {
      loanReference: string
      loanAmount: number
      amount: number
      description: string
      paidAt: string
    }[]
    statement: {
      reference: string
      principalAmount: number
      interestRate: number
      repaymentMonths: number
      totalRepayable: number
      paidAmount: number
      outstandingBalance: number
      securityType: 'savings'
      status: string
      issuedAt: string
    }[]
  }
}

export interface MemberPopupMessage {
  id: number
  title: string
  body: string
  createdAt: string
}

export interface AdminPopupMessage extends MemberPopupMessage {
  targetType: 'all' | 'member'
  targetMemberId: number | null
  targetMemberName: string | null
  targetSaccoNumber: string | null
  targetMemberNames?: string | null
  targetMemberCount?: number
  active: boolean
}

export interface AdminPopupMessageCreate {
  title: string
  body: string
  targetType: 'all' | 'member'
  targetMemberIds: number[]
}

export interface SavingsTransaction {
  entryType: 'deposit'
  amount: number
  description: string
  occurredAt: string
}

export interface MemberLoanRecord {
  reference: string
  principalAmount: number
  interestRate: number
  repaymentMonths: number
  totalRepayable: number
  paidAmount: number
  outstandingBalance: number
  securityType: 'savings'
  status: string
  issuedAt: string
}

export interface LoanRepayment {
  loanReference: string
  loanAmount: number
  amount: number
  description: string
  paidAt: string
}

export interface MemberStatementPage<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface MemberLoanApplication {
  id: number
  requestedAmount: number
  repaymentMonths: number
  purpose: string
  securityType: 'savings'
  status: 'pending' | 'approved' | 'rejected' | 'disbursed'
  appliedAt: string
  payoutBankName: string
  payoutBankBranch: string
  payoutAccountName: string
  payoutAccountNumber: string
  disbursedAt: string | null
  disbursedLoanReference: string | null
  disbursementMessage: string
}

export interface AdminMember {
  id: number
  saccoNumber: string | null
  nationalId: string
  fullName: string
  firstName: string
  secondName: string
  lastName: string
  phoneNumber: string
  email: string
  county: string
  subCounty: string
  accountStatus: 'pending' | 'approved' | 'rejected' | 'terminated'
  bankName: string
  bankBranch: string
  bankAccountName: string
  bankAccountNumber: string
  bankTwoName: string
  bankTwoBranch: string
  bankTwoAccountName: string
  bankTwoAccountNumber: string
  location: string
  maritalStatus: '' | 'single' | 'married' | 'divorced' | 'widowed' | 'other'
  nextKinName: string
  nextKinRelationship: string
  nextKinPhone: string
  contacts: MemberContact[]
  termsAcceptedAt: string | null
  savingsBalance: number
  activeLoanBalance: number
  pendingLoanPayment: number
  pendingLoanAmount: number
  availableBalance: number
  activeLoans: {
    id: number
    reference: string
    principalAmount: number
    outstandingBalance: number
    repaymentMonths: number
    status: string
    issuedAt: string
  }[]
  memberRole: 'member' | 'signatory'
  isAdmin: boolean
}

export interface MemberProfileUpdate {
  saccoNumber: string
  nationalId: string
  fullName: string
  phoneNumber: string
  email: string
  county: string
  subCounty: string
  bankName: string
  bankBranch: string
  bankAccountName: string
  bankAccountNumber: string
  bankTwoName: string
  bankTwoBranch: string
  bankTwoAccountName: string
  bankTwoAccountNumber: string
  location: string
  maritalStatus: AdminMember['maritalStatus']
  nextKinName: string
  nextKinRelationship: string
  nextKinPhone: string
}

export interface AdminMemberCreate {
  saccoNumber: string
  fullName: string
  nationalId: string
}

export interface AdminLoanCreate {
  memberId: number
  principalAmount: number
  repaymentMonths: number
  purpose: string
}

export interface MemberRegistrationForm {
  firstName: string
  secondName: string
  lastName: string
  phoneNumber: string
  email: string
  county: string
  subCounty: string
  location: string
  bankName: string
  bankBranch: string
  bankAccountName: string
  bankAccountNumber: string
  bankTwoName: string
  bankTwoBranch: string
  bankTwoAccountName: string
  bankTwoAccountNumber: string
  contactName: string
  contactRelationship: string
  contactPhoneNumber: string
  secondContactName: string
  secondContactRelationship: string
  secondContactPhoneNumber: string
  acceptedTerms: boolean
}

export interface MemberContact {
  id: number
  fullName: string
  relationship: string
  phoneNumber: string
}

export interface AdminSummary {
  members: { totalMembers: number; pendingMembers: number; approvedMembers: number }
  totalSavings: number
  loansIssued: number
  pendingPayments: number
  interestHeld: number
  dividendsPaid: number
  pendingLoanApplications: number
}

export interface AdminLoanApplication {
  id: number
  requestedAmount: number
  repaymentMonths: number
  purpose: string
  securityType: 'savings'
  status: 'pending' | 'approved' | 'rejected' | 'disbursed'
  appliedAt: string
  nationalId: string
  fullName: string
  payoutBankName: string
  payoutBankBranch: string
  payoutAccountName: string
  payoutAccountNumber: string
  electronicSignatureName: string
  electronicallySignedAt: string | null
  disbursedAt: string | null
  disbursedLoanReference: string | null
  disbursementMessage: string
  securityHash: string
}

export interface AdminOpenLoan {
  id: number
  reference: string
  principalAmount: number
  totalRepayable: number
  outstandingBalance: number
  securityType: 'savings'
  repaymentMonths: number
  status: string
  issuedAt: string
  nationalId: string
  fullName: string
}

export type AdminView = 'overview' | 'members' | 'loans' | 'repayments' | 'savings' | 'bulk' | 'terms'
export type AuthMode = 'login' | 'register' | 'admin-login'
export type MemberView = 'overview' | 'apply-loan' | 'loan-status' | 'savings' | 'activity' | 'account-info' | 'terms'
