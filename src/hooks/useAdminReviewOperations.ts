import type { Dispatch, SetStateAction } from 'react'
import type {
  AdminLoanApplication,
  AdminLoanCreate,
  AdminMember,
  AdminMemberCreate,
  AdminPopupMessageCreate,
  MemberProfileUpdate,
} from '../types'
import { readJsonResponse, requestErrorMessage } from '../networkErrors'

interface AdminReviewOperationsOptions {
  setReviewingId: Dispatch<SetStateAction<string | null>>
  setMessage: Dispatch<SetStateAction<string>>
  setMessageSuccess: Dispatch<SetStateAction<boolean>>
  setTerms: Dispatch<SetStateAction<string>>
  setTermsUpdatedAt: Dispatch<SetStateAction<string | null>>
  setMaintenanceEnabled: Dispatch<SetStateAction<boolean>>
  setMaintenanceMessage: Dispatch<SetStateAction<string>>
  setPopupMessages: Dispatch<SetStateAction<import('../types').AdminPopupMessage[]>>
  refreshAdminData: () => Promise<void>
}

export function useAdminReviewOperations(options: AdminReviewOperationsOptions) {
  const {
    setReviewingId, setMessage, setMessageSuccess, setTerms, setTermsUpdatedAt,
    setMaintenanceEnabled, setMaintenanceMessage, refreshAdminData,
    setPopupMessages,
  } = options

  async function reviewMemberAccount(memberId: number, decision: 'approve' | 'reject') {
    if (!window.confirm(`Do you want to ${decision} member account #${memberId}?`)) return
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
    method: 'PUT' | 'POST' | 'DELETE',
    body: Record<string, string | number> | undefined,
    actionId: string,
    fallbackMessage: string,
    confirmationMessage?: string,
  ): Promise<boolean> {
    if (confirmationMessage && !window.confirm(confirmationMessage)) return false
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
    await runAdminMutation(`/api/admin/members/${memberId}/role`, 'PUT', { role }, `member-role-${memberId}`, 'Could not update member role.', `Change this member’s role to ${role}?`)
  }

  async function resetMemberPassword(memberId: number) {
    await runAdminMutation(`/api/admin/members/${memberId}/password-reset`, 'POST', {}, `member-password-reset-${memberId}`, 'Could not reset this member password.', 'Reset this member’s password to 1234 and sign out their other sessions?')
  }

  async function deleteMember(memberId: number) {
    return runAdminMutation(`/api/admin/members/${memberId}`, 'DELETE', undefined, `delete-member-${memberId}`, 'Could not delete this member.')
  }

  async function updateLoanApplication(
    applicationId: number,
    details: Pick<AdminLoanApplication, 'requestedAmount' | 'repaymentMonths' | 'purpose'>,
  ) {
    return runAdminMutation(`/api/admin/loan-applications/${applicationId}`, 'PUT', details, `edit-loan-${applicationId}`, 'Could not update this loan application.', 'Save these changes to the loan application?')
  }

  async function deleteLoanApplication(applicationId: number) {
    return runAdminMutation(`/api/admin/loan-applications/${applicationId}`, 'DELETE', undefined, `delete-loan-${applicationId}`, 'Could not delete this loan application.')
  }

  async function reviewLoanApplication(applicationId: number, decision: 'approve' | 'reject', chequeNumber?: string) {
    const normalizedChequeNumber = chequeNumber?.trim() ?? ''
    if (decision === 'approve' && !normalizedChequeNumber) {
      setMessage('Enter a cheque number before approving this loan.')
      setMessageSuccess(false)
      return
    }
    if (!window.confirm(`Do you want to ${decision} loan application #${applicationId}?${decision === 'approve' ? ` Cheque number: ${normalizedChequeNumber}. Funds will be handled in a separate disbursement step.` : ''}`)) return
    setReviewingId(`loan-${applicationId}`)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/loan-applications/${applicationId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          ...(decision === 'approve' ? { chequeNumber: normalizedChequeNumber } : {}),
        }),
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

  async function disburseLoanApplication(applicationId: number, bankName: string, accountNumber: string) {
    const accountEnding = accountNumber.slice(-4)
    if (!window.confirm(`Mark loan application #${applicationId} as disbursed to ${bankName}, account ending ${accountEnding}? The member will be told to allow 2–3 business days for funds to reflect.`)) return
    setReviewingId(`disburse-loan-${applicationId}`)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/loan-applications/${applicationId}/disbursement`, { method: 'POST' })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not record loan disbursement.')
      await refreshAdminData()
      setMessage(result.message ?? 'Loan disbursement recorded.')
      setMessageSuccess(true)
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to record loan disbursement.'))
      setMessageSuccess(false)
    } finally {
      setReviewingId(null)
    }
  }

  async function updateMemberDetails(memberId: number, details: MemberProfileUpdate): Promise<boolean> {
    if (!window.confirm('Save these changes to the member account?')) return false
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
    if (!window.confirm('Publish these terms and conditions?')) return false
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

  async function updateMaintenance(enabled: boolean, message: string): Promise<boolean> {
    const action = enabled ? 'turn on maintenance mode' : 'turn off maintenance mode'
    if (!window.confirm(`Do you want to ${action}? Members will ${enabled ? 'see the maintenance screen and be unable to make changes' : 'return to the normal member portal'}.`)) return false
    setReviewingId('maintenance-mode')
    setMessage('')
    try {
      const response = await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, message }),
      })
      const result = await readJsonResponse<{ enabled?: boolean; message?: string; notice?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not update maintenance mode.')
      setMaintenanceEnabled(Boolean(result.enabled))
      setMaintenanceMessage(result.message ?? message)
      setMessage(result.notice ?? 'Maintenance mode updated.')
      setMessageSuccess(true)
      return true
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to update maintenance mode.'))
      setMessageSuccess(false)
      return false
    } finally {
      setReviewingId(null)
    }
  }

  async function createPopupMessage(input: AdminPopupMessageCreate): Promise<boolean> {
    const audience = input.targetType === 'all' ? 'all members' : `${input.targetMemberIds.length} selected member${input.targetMemberIds.length === 1 ? '' : 's'}`
    if (!window.confirm(`Publish “${input.title}” as a login pop-up for ${audience}? Members will keep seeing it on each login until it is deactivated or deleted.`)) return false
    setReviewingId('create-popup-message')
    setMessage('')
    try {
      const response = await fetch('/api/admin/member-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not publish this member message.')
      await refreshAdminData()
      setMessage(result.message ?? 'Member message created.')
      setMessageSuccess(true)
      return true
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to publish this member message.'))
      setMessageSuccess(false)
      return false
    } finally {
      setReviewingId(null)
    }
  }

  async function setPopupMessageActive(messageId: number, active: boolean): Promise<boolean> {
    if (!window.confirm(`${active ? 'Reactivate' : 'Deactivate'} this login pop-up message?${active ? ' Members in its audience will see it again on their next login.' : ''}`)) return false
    setReviewingId(`popup-message-${messageId}`)
    try {
      const response = await fetch(`/api/admin/member-messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not update this member message.')
      await refreshAdminData()
      setMessage(result.message ?? 'Member message updated.')
      setMessageSuccess(true)
      return true
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to update this member message.'))
      setMessageSuccess(false)
      return false
    } finally {
      setReviewingId(null)
    }
  }

  async function deletePopupMessage(messageId: number): Promise<boolean> {
    if (!window.confirm('Delete this login pop-up message? This cannot be undone.')) return false
    setReviewingId(`popup-message-${messageId}`)
    try {
      const response = await fetch(`/api/admin/member-messages/${messageId}`, { method: 'DELETE' })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not delete this member message.')
      setPopupMessages((messages) => messages.filter((message) => message.id !== messageId))
      setMessage(result.message ?? 'Member message deleted.')
      setMessageSuccess(true)
      return true
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to delete this member message.'))
      setMessageSuccess(false)
      return false
    } finally {
      setReviewingId(null)
    }
  }

  async function createMember(input: AdminMemberCreate): Promise<boolean> {
    if (!window.confirm(`Add ${input.fullName} as SACCO member ${input.saccoNumber}? They will use the shared temporary password.`)) return false
    setReviewingId('create-member')
    setMessage('')
    try {
      const response = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not add this member.')
      await refreshAdminData()
      setMessage(result.message ?? 'Member added.')
      setMessageSuccess(true)
      return true
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to add this member.'))
      setMessageSuccess(false)
      return false
    } finally {
      setReviewingId(null)
    }
  }

  async function issueLoan(input: AdminLoanCreate): Promise<boolean> {
    const total = Math.round(input.principalAmount * 1.1 * 100) / 100
    if (!window.confirm(`Issue principal of ${input.principalAmount.toFixed(2)}? Total repayment with 10% interest will be ${total.toFixed(2)}.`)) return false
    setReviewingId('issue-loan')
    setMessage('')
    try {
      const response = await fetch('/api/admin/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not issue this loan.')
      await refreshAdminData()
      setMessage(result.message ?? 'Loan issued.')
      setMessageSuccess(true)
      return true
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to issue this loan.'))
      setMessageSuccess(false)
      return false
    } finally {
      setReviewingId(null)
    }
  }

  return {
    reviewMemberAccount,
    setMemberRole,
    resetMemberPassword,
    deleteMember,
    updateLoanApplication,
    deleteLoanApplication,
    reviewLoanApplication,
    disburseLoanApplication,
    updateMemberDetails,
    saveTerms,
    createMember,
    issueLoan,
    updateMaintenance,
    createPopupMessage,
    setPopupMessageActive,
    deletePopupMessage,
  }
}
