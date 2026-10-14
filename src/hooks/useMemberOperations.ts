import { useCallback, useState, type FormEvent } from 'react'
import type { DashboardData, MemberView } from '../types'
import { readJsonResponse, requestErrorMessage, requireOnline } from '../networkErrors'
import { forceSync } from '../platform/syncCache'

export function useMemberOperations() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [memberView, setMemberView] = useState<MemberView>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loanAmount, setLoanAmount] = useState('')
  const [repaymentMonths, setRepaymentMonths] = useState('12')
  const [loanPurpose, setLoanPurpose] = useState('')
  const [loanMessage, setLoanMessage] = useState('')
  const [loanMessageSuccess, setLoanMessageSuccess] = useState(false)
  const [loanSubmitting, setLoanSubmitting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')

  const refreshDashboard = useCallback(async () => {
    const response = await fetch('/api/member/dashboard')
    const result = await readJsonResponse<DashboardData & { error?: string }>(response)
    if (!response.ok) throw new Error(result.error ?? 'Could not load your member dashboard.')
    setDashboard(result)
  }, [])

  /**
   * Manual sync: clears the local SQLite cache so the next dashboard fetch
   * bypasses ETags and pulls the latest data straight from the server.
   */
  const syncDashboard = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    setSyncError('')
    try {
      requireOnline()
      await forceSync()
      await refreshDashboard()
    } catch (error) {
      setSyncError(requestErrorMessage(error, 'Could not sync. Please try again.'))
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, refreshDashboard])

  async function handleLoanApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Loan applications require an active internet connection.
    try { requireOnline() } catch (error) {
      setLoanMessage(requestErrorMessage(error, 'Unable to reach the application service.'))
      setLoanMessageSuccess(false)
      return
    }
    setLoanSubmitting(true)
    setLoanMessage('')
    setLoanMessageSuccess(false)
    try {
      const formData = new FormData(event.currentTarget)
      const response = await fetch('/api/member/loan-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedAmount: loanAmount,
          repaymentMonths,
          purpose: loanPurpose,
          securityType: 'savings',
          payoutAccount: formData.get('payoutAccount'),
          electronicSignature: formData.get('electronicSignature') === 'on',
        }),
      })
      const result = await readJsonResponse<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not submit your application.')
      setLoanMessage(result.message ?? 'Your application has been submitted for review.')
      setLoanMessageSuccess(true)
      setLoanAmount('')
      setLoanPurpose('')
      void refreshDashboard().catch(() => undefined)
      setMemberView('loan-status')
    } catch (error) {
      setLoanMessage(requestErrorMessage(error, 'Unable to reach the application service.'))
      setLoanMessageSuccess(false)
    } finally {
      setLoanSubmitting(false)
    }
  }

  const resetMemberState = useCallback(() => {
    setDashboard(null)
    setMemberView('overview')
    setMenuOpen(false)
  }, [])

  return {
    dashboard,
    setDashboard,
    memberView,
    setMemberView,
    menuOpen,
    setMenuOpen,
    loanAmount,
    setLoanAmount,
    repaymentMonths,
    setRepaymentMonths,
    loanPurpose,
    setLoanPurpose,
    loanMessage,
    loanMessageSuccess,
    loanSubmitting,
    isSyncing,
    syncError,
    refreshDashboard,
    syncDashboard,
    handleLoanApplication,
    resetMemberState,
  }
}
