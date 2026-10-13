import { useState, type FormEvent } from 'react'
import type { AdminLoanApplication, AdminMember, MemberProfileUpdate } from '../types'

/**
 * Encapsulates AdminPortal's internal UI state (modal open/close, filters, forms)
 * and their derived handlers. This is separate from data-fetching state in useAdminOperations.
 */
export function useAdminPortalState(
  members: AdminMember[],
  applications: AdminLoanApplication[],
  onUpdateLoanApplication: (
    id: number,
    details: Pick<AdminLoanApplication, 'requestedAmount' | 'repaymentMonths' | 'purpose'>,
  ) => Promise<boolean>,
  onUpdateMember: (id: number, updates: MemberProfileUpdate) => Promise<boolean>,
  onDeleteMember: (id: number) => Promise<boolean>,
  onDeleteLoanApplication: (id: number) => Promise<boolean>,
  onRefresh: () => Promise<void>,
) {
  // Modal/selection state
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null)
  const [viewingMemberId, setViewingMemberId] = useState<number | null>(null)
  const [viewingApplicationId, setViewingApplicationId] = useState<number | null>(null)
  const [viewingDividendId, setViewingDividendId] = useState<number | null>(null)
  const [editingApplicationId, setEditingApplicationId] = useState<number | null>(null)
  const [memberSaving, setMemberSaving] = useState(false)
  const [termsSaving, setTermsSaving] = useState(false)
  const [termsMessage, setTermsMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filter state
  const [memberSearch, setMemberSearch] = useState('')
  const [memberFilter, setMemberFilter] = useState<'all' | 'pending' | 'approved' | 'signatory' | 'admin'>('all')
  const [loanSearch, setLoanSearch] = useState('')
  const [loanFilter, setLoanFilter] = useState<'all' | 'pending' | 'decision' | 'disbursed'>('all')
  const [repaymentSearch, setRepaymentSearch] = useState('')

  // Edit forms
  const [memberForm, setMemberForm] = useState<MemberProfileUpdate>({
    saccoNumber: '', nationalId: '', fullName: '', phoneNumber: '', email: '', county: '', subCounty: '',
    bankName: '', bankBranch: '', bankAccountName: '', bankAccountNumber: '',
    bankTwoName: '', bankTwoBranch: '', bankTwoAccountName: '', bankTwoAccountNumber: '',
    location: '', maritalStatus: '', nextKinName: '', nextKinRelationship: '', nextKinPhone: '',
  })
  const [applicationForm, setApplicationForm] = useState({
    requestedAmount: '',
    repaymentMonths: '',
    purpose: '',
  })

  // Derived collections
  const approvedMembers = members.filter((m) => m.accountStatus === 'approved')
  const pendingMembers = members.filter((m) => m.accountStatus === 'pending')
  const pendingApplications = applications.filter((a) => a.status === 'pending')
  const signatories = members.filter((m) => m.memberRole === 'signatory')
  const viewingApplication = applications.find((a) => a.id === viewingApplicationId)
  const viewingApplicationMember = viewingApplication
    ? members.find((m) => m.nationalId === viewingApplication.nationalId)
    : undefined
  const viewingMember = members.find((m) => m.id === viewingMemberId)
  const editingMember = members.find((m) => m.id === editingMemberId)

  // Filtered lists
  const filteredMembers = members.filter((m) => {
    if (memberFilter === 'pending' && m.accountStatus !== 'pending') return false
    if (memberFilter === 'approved' && m.accountStatus !== 'approved') return false
    if (memberFilter === 'signatory' && m.memberRole !== 'signatory') return false
    if (memberFilter === 'admin' && !m.isAdmin) return false
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase()
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.saccoNumber?.toLowerCase().includes(q) ||
        m.nationalId?.toLowerCase().includes(q) ||
        m.phoneNumber?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const filteredApplications = applications.filter((app) => {
    if (loanFilter === 'decision' && !['approved', 'rejected'].includes(app.status)) return false
    if (loanFilter !== 'all' && loanFilter !== 'decision' && app.status !== loanFilter) return false
    if (loanSearch.trim()) {
      const q = loanSearch.toLowerCase()
      return (
        app.fullName.toLowerCase().includes(q) ||
        app.nationalId.toLowerCase().includes(q) ||
        String(app.id).includes(q) ||
        app.purpose.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Handlers
  async function handleRefreshClick() {
    setIsRefreshing(true)
    try { await onRefresh() } finally {
      setTimeout(() => setIsRefreshing(false), 600)
    }
  }

  function beginMemberEdit(member: AdminMember) {
    setEditingMemberId(member.id)
    setMemberForm({
      saccoNumber: member.saccoNumber ?? '', nationalId: member.nationalId ?? '', fullName: member.fullName ?? '', phoneNumber: member.phoneNumber ?? '', email: member.email ?? '',
      county: member.county ?? '', subCounty: member.subCounty ?? '', bankName: member.bankName ?? '',
      bankBranch: member.bankBranch ?? '', bankAccountName: member.bankAccountName ?? '',
      bankAccountNumber: member.bankAccountNumber ?? '', bankTwoName: member.bankTwoName ?? '',
      bankTwoBranch: member.bankTwoBranch ?? '', bankTwoAccountName: member.bankTwoAccountName ?? '',
      bankTwoAccountNumber: member.bankTwoAccountNumber ?? '', location: member.location ?? '',
      maritalStatus: member.maritalStatus ?? '', nextKinName: member.nextKinName ?? '',
      nextKinRelationship: member.nextKinRelationship ?? '', nextKinPhone: member.nextKinPhone ?? '',
    })
  }

  function beginApplicationEdit(application: AdminLoanApplication) {
    setViewingApplicationId(application.id)
    setEditingApplicationId(application.id)
    setApplicationForm({
      requestedAmount: String(application.requestedAmount),
      repaymentMonths: String(application.repaymentMonths),
      purpose: application.purpose,
    })
  }

  async function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingApplicationId === null) return
    const saved = await onUpdateLoanApplication(editingApplicationId, {
      requestedAmount: Number(applicationForm.requestedAmount),
      repaymentMonths: Number(applicationForm.repaymentMonths),
      purpose: applicationForm.purpose,
    })
    if (saved) setEditingApplicationId(null)
  }

  async function removeMember(member: AdminMember) {
    if (!window.confirm(`Are you sure you want to delete member ${member.fullName}? Accounts with financial transactions or loans cannot be removed.`)) return
    await onDeleteMember(member.id)
    if (viewingMemberId === member.id) setViewingMemberId(null)
  }

  async function removeApplication(application: AdminLoanApplication) {
    if (!window.confirm(`Delete the ${application.status} loan application #${application.id} submitted by ${application.fullName}?`)) return
    await onDeleteLoanApplication(application.id)
    if (viewingApplicationId === application.id) setViewingApplicationId(null)
  }

  async function saveMemberDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingMemberId === null) return
    setMemberSaving(true)
    if (await onUpdateMember(editingMemberId, memberForm)) setEditingMemberId(null)
    setMemberSaving(false)
  }

  return {
    // Modal state
    editingMemberId, setEditingMemberId, viewingMemberId, setViewingMemberId,
    viewingApplicationId, setViewingApplicationId,
    viewingDividendId, setViewingDividendId,
    editingApplicationId, setEditingApplicationId,
    memberSaving, termsSaving, setTermsSaving,
    termsMessage, setTermsMessage,
    isRefreshing,
    // Filters
    memberSearch, setMemberSearch, memberFilter, setMemberFilter,
    loanSearch, setLoanSearch, loanFilter, setLoanFilter,
    repaymentSearch, setRepaymentSearch,
    // Forms
    memberForm, setMemberForm, applicationForm, setApplicationForm,
    // Derived
    approvedMembers, pendingMembers, pendingApplications, signatories,
    viewingApplication, viewingApplicationMember, viewingMember, editingMember,
    filteredMembers, filteredApplications,
    // Handlers
    handleRefreshClick, beginMemberEdit, beginApplicationEdit,
    saveApplication, removeMember, removeApplication, saveMemberDetails,
  }
}
