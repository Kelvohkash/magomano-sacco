import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { currency } from '../format'
import { readJsonResponse, requestErrorMessage } from '../networkErrors'

interface AdminLedgerOperationsOptions {
  memberId: string
  amount: string
  description: string
  repaymentLoanId: string
  repaymentAmount: string
  repaymentDescription: string
  setAmount: Dispatch<SetStateAction<string>>
  setDescription: Dispatch<SetStateAction<string>>
  setRepaymentAmount: Dispatch<SetStateAction<string>>
  setRepaymentDescription: Dispatch<SetStateAction<string>>
  setSubmitting: Dispatch<SetStateAction<boolean>>
  setMessage: Dispatch<SetStateAction<string>>
  setMessageSuccess: Dispatch<SetStateAction<boolean>>
  refreshAdminData: () => Promise<void>
}

export function useAdminLedgerOperations(options: AdminLedgerOperationsOptions) {
  const {
    memberId, amount, description,
    repaymentLoanId, repaymentAmount, repaymentDescription,
    setAmount, setDescription, setRepaymentAmount, setRepaymentDescription,
    setSubmitting,
    setMessage, setMessageSuccess, refreshAdminData,
  } = options

  async function handleAdminSavingsEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, entryType: 'deposit', amount, description }),
      })
      const result = await readJsonResponse<{ message?: string; balance?: number; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not record the savings entry.')
      await refreshAdminData()
      setMessage(`${result.message} New savings balance: ${currency.format(result.balance ?? 0)}.`)
      setMessageSuccess(true)
      setAmount('')
      setDescription('')
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to reach the savings service.'))
      setMessageSuccess(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLoanRepayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/repayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: repaymentLoanId, amount: repaymentAmount, description: repaymentDescription }),
      })
      const result = await readJsonResponse<{ message?: string; outstandingBalance?: number; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not record the loan repayment.')
      await refreshAdminData()
      setMessage(`${result.message} Remaining balance: ${currency.format(result.outstandingBalance ?? 0)}.`)
      setMessageSuccess(true)
      setRepaymentAmount('')
      setRepaymentDescription('')
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to record the loan repayment.'))
      setMessageSuccess(false)
    } finally {
      setSubmitting(false)
    }
  }

  return { handleAdminSavingsEntry, handleLoanRepayment }
}
