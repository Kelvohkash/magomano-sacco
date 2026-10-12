import type { Dispatch, SetStateAction } from 'react'
import type { AdminLoanApplication, AdminMember, MemberProfileUpdate } from '../types'
import { readJsonResponse, requestErrorMessage } from '../networkErrors'

interface AdminReviewOperationsOptions {
  setReviewingId: Dispatch<SetStateAction<string | null>>
  setMessage: Dispatch<SetStateAction<string>>
  setMessageSuccess: Dispatch<SetStateAction<boolean>>
  setTerms: Dispatch<SetStateAction<string>>
  setTermsUpdatedAt: Dispatch<SetStateAction<string | null>>
  refreshAdminData: () => Promise<void>
}

export function useAdminReviewOperations(options: AdminReviewOperationsOptions) {
  const { setReviewingId, setMessage, setMessageSuccess, setTerms, setTermsUpdatedAt, refreshAdminData } = options

  async function reviewMemberAccount(memberId: number, decision: 'approve' | 'reject') {
    setReviewingId(`member-${memberId}`)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/members/${memberId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not update member account status.')
      await refreshAdminData()
      setMessage(result.message ?? `Member ${decision}d.`)
      setMessageSuccess(true)
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to update member account.'))
      setMessageSuccess(false)
    } finally {
      setReviewingId(null)
    }
  }

  async function runAdminMutation(
    path: string,
    method: 'PUT' | 'DELETE',
    body: Record<string, string | number> | undefined,
    actionId: string,
    fallbackMessage: string,
  ): Promise<boolean> {
    setReviewingId(actionId)
    setMessage('')
    try {
      const response = await fetch(path, {
        method,
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? fallbackMessage)
      await refreshAdminData()
      setMessage(result.message ?? fallbackMessage)
      setMessageSuccess(true)
      return true
    } catch (error) {
      setMessage(requestErrorMessage(error, fallbackMessage))
      setMessageSuccess(false)
      return false
    } finally {
      setReviewingId(null)
    }
  }

  async function setMemberRole(memberId: number, role: AdminMember['memberRole']) {
    await runAdminMutation(`/api/admin/members/${memberId}/role`, 'PUT', { role }, `member-role-${memberId}`, 'Could not update member role.')
  }

  async function deleteMember(memberId: number) {
    return runAdminMutation(`/api/admin/members/${memberId}`, 'DELETE', undefined, `delete-member-${memberId}`, 'Could not delete this member.')
  }

  async function updateLoanApplication(
    applicationId: number,
    details: Pick<AdminLoanApplication, 'requestedAmount' | 'repaymentMonths' | 'purpose'>,
  ) {
    return runAdminMutation(`/api/admin/loan-applications/${applicationId}`, 'PUT', details, `edit-loan-${applicationId}`, 'Could not update this loan application.')
  }

  async function deleteLoanApplication(applicationId: number) {
    return runAdminMutation(`/api/admin/loan-applications/${applicationId}`, 'DELETE', undefined, `delete-loan-${applicationId}`, 'Could not delete this loan application.')
  }

  async function reviewLoanApplication(applicationId: number, decision: 'approve' | 'reject') {
    setReviewingId(`loan-${applicationId}`)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/loan-applications/${applicationId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not update loan application.')
      await refreshAdminData()
      setMessage(result.message ?? `Loan application ${decision}d.`)
      setMessageSuccess(true)
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to update loan application.'))
      setMessageSuccess(false)
    } finally {
      setReviewingId(null)
    }
  }

  async function updateMemberDetails(memberId: number, details: MemberProfileUpdate): Promise<boolean> {
    setReviewingId(`member-details-${memberId}`)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/members/${memberId}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not update member details.')
      await refreshAdminData()
      setMessage(result.message ?? 'Member details updated.')
      setMessageSuccess(true)
      return true
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to update member details.'))
      setMessageSuccess(false)
      return false
    } finally {
      setReviewingId(null)
    }
  }

  async function saveTerms(terms: string): Promise<boolean> {
    setMessage('')
    try {
      const response = await fetch('/api/admin/terms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms }),
      })
      const result = await readJsonResponse<{ terms?: string; updatedAt?: string; message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not save terms and conditions.')
      setTerms(result.terms ?? terms)
      setTermsUpdatedAt(result.updatedAt ?? new Date().toISOString())
      setMessage(result.message ?? 'Terms and conditions saved.')
      setMessageSuccess(true)
      return true
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to save terms and conditions.'))
      setMessageSuccess(false)
      return false
    }
  }

  return {
    reviewMemberAccount,
    setMemberRole,
    deleteMember,
    updateLoanApplication,
    deleteLoanApplication,
    reviewLoanApplication,
    updateMemberDetails,
    saveTerms,
  }
}
