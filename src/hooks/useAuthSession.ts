import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { AuthMode, MemberRegistrationForm } from '../types'
import { readJsonResponse, requestErrorMessage } from '../networkErrors'

export const emptyRegistrationForm: MemberRegistrationForm = {
  firstName: '',
  secondName: '',
  lastName: '',
  phoneNumber: '',
  email: '',
  county: '',
  subCounty: '',
  location: '',
  bankName: '',
  bankBranch: '',
  bankAccountName: '',
  bankAccountNumber: '',
  bankTwoName: '',
  bankTwoBranch: '',
  bankTwoAccountName: '',
  bankTwoAccountNumber: '',
  contactName: '',
  contactRelationship: '',
  contactPhoneNumber: '',
  secondContactName: '',
  secondContactRelationship: '',
  secondContactPhoneNumber: '',
  acceptedTerms: false,
}

interface UseAuthSessionProps {
  onMemberAuthenticated: () => Promise<void>
  onAdminAuthenticated: (name: string) => Promise<void>
  onLogoutCompleted: () => void
}

export function useAuthSession({
  onMemberAuthenticated,
  onAdminAuthenticated,
  onLogoutCompleted,
}: UseAuthSessionProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [nationalId, setNationalId] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [registrationForm, setRegistrationForm] = useState<MemberRegistrationForm>({ ...emptyRegistrationForm })
  const [registrationTerms, setRegistrationTerms] = useState('')
  const [registrationTermsVersion, setRegistrationTermsVersion] = useState<string | null>(null)
  const [registrationTermsLoading, setRegistrationTermsLoading] = useState(false)
  const [registrationTermsError, setRegistrationTermsError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const sessionCheckStarted = useRef(false)

  useEffect(() => {
    // React Strict Mode replays effects in development. Keep the initial
    // session lookup to one request across that setup/cleanup/setup cycle.
    if (sessionCheckStarted.current) return
    sessionCheckStarted.current = true

    fetch('/api/auth/session')
      .then(async (response) => {
        const session = await readJsonResponse<{
          authenticated: boolean
          role?: 'member' | 'admin'
          admin?: { displayName: string }
        }>(response)
        if (!session.authenticated) return
        if (session.role === 'member') await onMemberAuthenticated()
        if (session.role === 'admin') {
          await onAdminAuthenticated(session.admin?.displayName ?? 'Administrator')
        }
      })
      .catch(() => undefined)
  }, [onMemberAuthenticated, onAdminAuthenticated])

  useEffect(() => {
    if (mode !== 'register') return
    const controller = new AbortController()
    fetch('/api/auth/terms', { signal: controller.signal })
      .then(async (response) => {
        const result = await readJsonResponse<{ terms?: string; updatedAt?: string | null; error?: string }>(response)
        if (!response.ok) throw new Error(result.error ?? 'Could not load the SACCO terms and conditions.')
        setRegistrationTerms(result.terms ?? '')
        setRegistrationTermsVersion(result.updatedAt ?? null)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setRegistrationTermsError(requestErrorMessage(error, 'Could not load the SACCO terms and conditions.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setRegistrationTermsLoading(false)
      })
    return () => controller.abort()
  }, [mode])

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setMessage('')
    setIsSuccess(false)
    if (nextMode === 'register') {
      setRegistrationTermsLoading(true)
      setRegistrationTermsError('')
    } else {
      setRegistrationForm({ ...emptyRegistrationForm })
      setRegistrationTermsLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'register' && !registrationTerms) {
      setIsSuccess(false)
      setMessage(registrationTermsError || 'The SACCO has not published terms and conditions yet.')
      return
    }
    if (mode === 'register' && password !== confirmPassword) {
      setIsSuccess(false)
      setMessage('The passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setIsSuccess(false)

    try {
      const isRegistering = mode === 'register'
      const isAdminLogin = mode === 'admin-login'
      const endpoint = isRegistering ? '/api/auth/register' : isAdminLogin ? '/api/admin/login' : '/api/auth/login'
      const body = isRegistering
        ? { nationalId, ...registrationForm, termsVersion: registrationTermsVersion, termsSnapshot: registrationTerms, password }
        : isAdminLogin
          ? { username: adminUsername, password }
          : { nationalId, password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await readJsonResponse<{
        member?: { nationalId: string; fullName: string }
        admin?: { username: string; displayName: string; isSuperAdmin?: boolean }
        message?: string
        error?: string
      }>(response)

      if (!response.ok) {
        if (isRegistering && response.status === 409 && result.error?.includes('terms and conditions have changed')) {
          const termsResponse = await fetch('/api/auth/terms')
          const currentTerms = await readJsonResponse<{ terms?: string; updatedAt?: string | null }>(termsResponse)
          if (termsResponse.ok) {
            setRegistrationTerms(currentTerms.terms ?? '')
            setRegistrationTermsVersion(currentTerms.updatedAt ?? null)
            setRegistrationForm((current) => ({ ...current, acceptedTerms: false }))
          }
        }
        throw new Error(result.error ?? 'We could not complete your request. Please try again.')
      }

      if (isRegistering) {
        setNationalId(result.member?.nationalId ?? nationalId.trim())
        setRegistrationForm({ ...emptyRegistrationForm })
        setPassword('')
        setConfirmPassword('')
        setMode('login')
        setMessage(result.message ?? 'Your account request has been submitted for review.')
        setIsSuccess(true)
        return
      }

      if (isAdminLogin) {
        await onAdminAuthenticated(result.admin?.displayName ?? result.admin?.username ?? 'Administrator')
        return
      }

      localStorage.removeItem('magomano-national-id')
      localStorage.removeItem('magomano-member-number')
      await onMemberAuthenticated()
    } catch (error) {
      setMessage(requestErrorMessage(error, 'Unable to reach the sign-in service.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      onLogoutCompleted()
      setPassword('')
      setMessage('')
      setIsSuccess(false)
    }
  }

  return {
    mode, setMode,
    nationalId, setNationalId,
    adminUsername, setAdminUsername,
    registrationForm, setRegistrationForm,
    registrationTerms, registrationTermsVersion,
    registrationTermsLoading, registrationTermsError,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    isSubmitting, message, isSuccess,
    changeMode,
    handleSubmit,
    handleLogout,
  }
}

