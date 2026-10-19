import { useCallback, useState } from 'react'
import { useAdminLedgerOperations } from './useAdminLedgerOperations'
import { useAdminReviewOperations } from './useAdminReviewOperations'
import type {
  AdminLoanApplication,
  AdminMember,
  AdminOpenLoan,
  AdminSummary,
  AdminPopupMessage,
  AdminView,
} from '../types'
import { readJsonResponse } from '../networkErrors'

export function useAdminOperations() {
  const [signedInAdmin, setSignedInAdmin] = useState<string | null>(null)
  const [adminView, setAdminView] = useState<AdminView>('overview')
  const [adminMembers, setAdminMembers] = useState<AdminMember[]>([])
  const [adminApplications, setAdminApplications] = useState<AdminLoanApplication[]>([])
  const [adminOpenLoans, setAdminOpenLoans] = useState<AdminOpenLoan[]>([])
  const [adminTerms, setAdminTerms] = useState('')
  const [adminTermsUpdatedAt, setAdminTermsUpdatedAt] = useState<string | null>(null)
  const [adminMaintenanceEnabled, setAdminMaintenanceEnabled] = useState(false)
  const [adminMaintenanceMessage, setAdminMaintenanceMessage] = useState('We are carrying out maintenance. Please try again later.')
  const [adminPopupMessages, setAdminPopupMessages] = useState<AdminPopupMessage[]>([])
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null)
  const [adminStatementRefreshKey, setAdminStatementRefreshKey] = useState(0)
  const [pendingAuthorizationsCount, setPendingAuthorizationsCount] = useState(0)

  const [adminMemberId, setAdminMemberId] = useState('')
  const [adminAmount, setAdminAmount] = useState('')
  const [adminDescription, setAdminDescription] = useState('')
  const [repaymentLoanId, setRepaymentLoanId] = useState('')
  const [repaymentAmount, setRepaymentAmount] = useState('')
  const [repaymentDescription, setRepaymentDescription] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  const [adminMessageSuccess, setAdminMessageSuccess] = useState(false)
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const [adminReviewingId, setAdminReviewingId] = useState<string | null>(null)

  const refreshAdminData = useCallback(async () => {
    const [summaryRes, membersRes, appsRes, repayRes, termsRes, maintenanceRes, popupMessagesRes, profileChangesRes] = await Promise.all([
      fetch('/api/admin/dashboard'),
      fetch('/api/admin/members'),
      fetch('/api/admin/loan-applications'),
      fetch('/api/admin/repayments'),
      fetch('/api/admin/terms'),
      fetch('/api/admin/maintenance'),
      fetch('/api/admin/member-messages'),
      fetch('/api/admin/profile-changes'),
    ])
    const [summaryResult, membersResult, applicationsResult, repaymentsResult, termsResult, maintenanceResult, popupMessagesResult] =
      await Promise.all([
        readJsonResponse<AdminSummary & { error?: string }>(summaryRes),
        readJsonResponse<{ members?: AdminMember[]; error?: string }>(membersRes),
        readJsonResponse<{ applications?: AdminLoanApplication[]; error?: string }>(appsRes),
        readJsonResponse<{ loans?: AdminOpenLoan[]; error?: string }>(repayRes),
        readJsonResponse<{ terms?: string; updatedAt?: string | null; error?: string }>(termsRes),
        readJsonResponse<{ enabled?: boolean; message?: string; error?: string }>(maintenanceRes),
        readJsonResponse<{ messages?: AdminPopupMessage[]; error?: string }>(popupMessagesRes),
      ])

    if (!summaryRes.ok || !membersRes.ok || !appsRes.ok || !repayRes.ok || !termsRes.ok || !maintenanceRes.ok || !popupMessagesRes.ok) {
      throw new Error(
        summaryResult.error ??
          membersResult.error ??
          applicationsResult.error ??
          repaymentsResult.error ??
          termsResult.error ??
          maintenanceResult.error ??
          popupMessagesResult.error ??
          'Could not load admin records.',
      )
    }

    const members = membersResult.members ?? []
    const openLoans = repaymentsResult.loans ?? []
    setAdminSummary(summaryResult)
    setAdminStatementRefreshKey((version) => version + 1)
    setAdminMembers(members)
    setAdminApplications(applicationsResult.applications ?? [])
    setAdminTerms(termsResult.terms ?? '')
    setAdminTermsUpdatedAt(termsResult.updatedAt ?? null)
    setAdminMaintenanceEnabled(Boolean(maintenanceResult.enabled))
    setAdminMaintenanceMessage(maintenanceResult.message ?? 'We are carrying out maintenance. Please try again later.')
    setAdminPopupMessages(popupMessagesResult.messages ?? [])
    setAdminOpenLoans(openLoans)
    setRepaymentLoanId((curr) => (openLoans.some((loan) => String(loan.id) === curr) ? curr : ''))
    setAdminMemberId((curr) => (members.some((member) => String(member.id) === curr) ? curr : ''))

    if (profileChangesRes.ok) {
      try {
        const changesData = await profileChangesRes.json() as { changes?: unknown[] }
        setPendingAuthorizationsCount(changesData.changes?.length ?? 0)
      } catch {
        setPendingAuthorizationsCount(0)
      }
    } else {
      setPendingAuthorizationsCount(0)
    }
  }, [])

  const ledgerOperations = useAdminLedgerOperations({
    memberId: adminMemberId,
    amount: adminAmount,
    description: adminDescription,
    repaymentLoanId,
    repaymentAmount,
    repaymentDescription,
    setAmount: setAdminAmount,
    setDescription: setAdminDescription,
    setRepaymentAmount,
    setRepaymentDescription,
    setSubmitting: setAdminSubmitting,
    setMessage: setAdminMessage,
    setMessageSuccess: setAdminMessageSuccess,
    refreshAdminData,
  })
  const reviewOperations = useAdminReviewOperations({
    setReviewingId: setAdminReviewingId,
    setMessage: setAdminMessage,
    setMessageSuccess: setAdminMessageSuccess,
    setTerms: setAdminTerms,
    setTermsUpdatedAt: setAdminTermsUpdatedAt,
    setMaintenanceEnabled: setAdminMaintenanceEnabled,
    setMaintenanceMessage: setAdminMaintenanceMessage,
    setPopupMessages: setAdminPopupMessages,
    refreshAdminData,
  })

  const resetAdminState = useCallback(() => {
    setSignedInAdmin(null)
    setAdminMembers([])
    setAdminApplications([])
    setAdminOpenLoans([])
    setAdminSummary(null)
    setPendingAuthorizationsCount(0)
    setAdminView('overview')
  }, [])

  return {
    signedInAdmin, setSignedInAdmin,
    adminView, setAdminView,
    adminMembers, adminApplications, adminOpenLoans,
    adminTerms, setAdminTerms, adminTermsUpdatedAt, adminSummary, adminStatementRefreshKey,
    adminMaintenanceEnabled, adminMaintenanceMessage, setAdminMaintenanceMessage,
    adminPopupMessages,
    pendingAuthorizationsCount,
    adminMemberId, setAdminMemberId,
    adminAmount, setAdminAmount,
    adminDescription, setAdminDescription,
    repaymentLoanId, setRepaymentLoanId,
    repaymentAmount, setRepaymentAmount,
    repaymentDescription, setRepaymentDescription,
    adminMessage, adminMessageSuccess,
    adminSubmitting, adminReviewingId,
    refreshAdminData,
    ...ledgerOperations,
    ...reviewOperations,
    resetAdminState,
  }
}
