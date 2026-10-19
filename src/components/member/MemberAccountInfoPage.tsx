import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Landmark,
  MapPin,
  Save,
  UserRound,
  Users,
} from 'lucide-react'
import { MemberContactsPage } from './MemberContactsPage'
import { readJsonResponse, requestErrorMessage } from '../../networkErrors'

type Profile = Record<string, string>

type AccountTab = 'personal' | 'banking' | 'kin'

interface FieldDef {
  key: string
  label: string
  group: string
  tab: AccountTab
  type?: string
  placeholder?: string
}

const fields: FieldDef[] = [
  // Personal & Employment
  { key: 'email', label: 'Email address', group: 'Personal details', tab: 'personal', type: 'email', placeholder: "e.g. kelvin@gmail.com" },
  { key: 'workBranch', label: 'Branch', group: 'Employment & branch', tab: 'personal', placeholder: 'e.g. Kenol,Kagio' },
  { key: 'jobTitle', label: 'Job role / Department', group: 'Employment & branch', tab: 'personal', placeholder: 'e.g. Accounts,Line attendant,Cashier' },
  { key: 'county', label: 'County', group: 'Address', tab: 'personal', placeholder: 'e.g. Muranga' },
  { key: 'subCounty', label: 'Sub-county', group: 'Address', tab: 'personal', placeholder: 'e.g. Maragwa' },
  { key: 'location', label: 'Location / Town', group: 'Address', tab: 'personal', placeholder: 'e.g. Kenol' },

  // Banking
  { key: 'bankName', label: 'Bank name', group: 'Primary bank account', tab: 'banking', placeholder: 'e.g. DTB' },
  { key: 'bankBranch', label: 'Branch', group: 'Primary bank account', tab: 'banking', placeholder: 'e.g. Kenol Branch' },
  { key: 'bankAccountName', label: 'Account holder name', group: 'Primary bank account', tab: 'banking', placeholder: 'Official name on bank account' },
  { key: 'bankAccountNumber', label: 'Account number', group: 'Primary bank account', tab: 'banking', placeholder: 'Bank account number' },
  { key: 'bankTwoName', label: 'Bank name', group: 'Second bank account (optional)', tab: 'banking', placeholder: 'Optional secondary bank' },
  { key: 'bankTwoBranch', label: 'Branch', group: 'Second bank account (optional)', tab: 'banking', placeholder: 'Branch' },
  { key: 'bankTwoAccountName', label: 'Account holder name', group: 'Second bank account (optional)', tab: 'banking', placeholder: 'Account holder name' },
  { key: 'bankTwoAccountNumber', label: 'Account number', group: 'Second bank account (optional)', tab: 'banking', placeholder: 'Account number' },

  // Next of Kin
  { key: 'nextKinName', label: 'Full name', group: 'Next of kin', tab: 'kin', placeholder: 'Full name of next of kin' },
  { key: 'nextKinRelationship', label: 'Relationship', group: 'Next of kin', tab: 'kin', placeholder: 'e.g. Spouse, Sibling, Child' },
  { key: 'nextKinPhone', label: 'Phone number', group: 'Next of kin', tab: 'kin', type: 'tel', placeholder: 'e.g.0706391921' },
]

const emptyProfile = Object.fromEntries(fields.map(({ key }) => [key, '']))

export function MemberAccountInfoPage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [activeTab, setActiveTab] = useState<AccountTab>('personal')
  const [loading, setLoading] = useState(true)
  const [profileLoadFailed, setProfileLoadFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pendingChange, setPendingChange] = useState<{ id: number; submittedAt: string } | null>(null)

  const inlineFeedbackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setProfileLoadFailed(false)
    setError('')
    fetch('/api/member/profile', { signal: controller.signal })
      .then(async (response) => {
        const result = await readJsonResponse<{ profile?: Profile; error?: string }>(response)
        if (!response.ok) throw new Error(result.error ?? 'Could not load account information.')
        if (!result.profile) throw new Error('The account service returned no saved profile.')
        setProfile({ ...emptyProfile, ...result.profile })
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(requestErrorMessage(cause, 'Could not load account information.'))
        setProfileLoadFailed(true)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [loadAttempt])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/member/profile/pending', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return
        const result = await response.json() as { pending?: { id: number; submittedAt: string } | null }
        setPendingChange(result.pending ?? null)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [loadAttempt])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const result = await readJsonResponse<{ profile?: Profile; message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(result.error ?? 'Could not save account information.')
      setPendingChange({ id: Date.now(), submittedAt: new Date().toISOString() })
      setMessage(result.message ?? 'Your changes have been submitted for admin authorization.')
      setTimeout(() => {
        inlineFeedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    } catch (cause) {
      setError(requestErrorMessage(cause, 'Could not save account information.'))
      setTimeout(() => {
        inlineFeedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    } finally {
      setSaving(false)
    }
  }

  // Get groups for the currently selected tab
  const tabFields = fields.filter((f) => f.tab === activeTab)
  const tabGroups = [...new Set(tabFields.map((f) => f.group))]

  return (
    <section className="member-account-page">
      <div className="dashboard-intro">
        <p className="dashboard-kicker">YOUR ACCOUNT</p>
        <h1>Account Info &amp; Settings</h1>
        <p>
          View and update your personal details, workplace branch, banking info, and designated next of kin.
        </p>
      </div>

      {pendingChange && (
        <div className="member-pending-change-notice" role="status">
          <Clock className="pending-clock-icon" size={24} />
          <div>
            <strong>Profile update awaiting admin authorization</strong>
            <p>
              Your requested updates were submitted and are pending review by the SACCO admin.
              Changes will take effect once authorized by the admin.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="admin-empty" role="status">Loading your saved account information…</p>
      ) : profileLoadFailed ? (
        <div className="member-account-card">
          <p>We couldn’t load your saved details, so the form is unavailable to prevent overwriting them.</p>
          <button
            type="button"
            className="member-details-cancel"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            Try loading again
          </button>
        </div>
      ) : (
        <>
          {/* Navigation Tabs */}
          <div className="member-account-nav-tabs" role="tablist" aria-label="Account sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'personal'}
              className={`member-account-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => { setActiveTab('personal'); setError(''); setMessage('') }}
            >
              <UserRound size={16} />
              <span>Personal &amp; Job</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'banking'}
              className={`member-account-tab-btn ${activeTab === 'banking' ? 'active' : ''}`}
              onClick={() => { setActiveTab('banking'); setError(''); setMessage('') }}
            >
              <Landmark size={16} />
              <span>Banking</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'kin'}
              className={`member-account-tab-btn ${activeTab === 'kin' ? 'active' : ''}`}
              onClick={() => { setActiveTab('kin'); setError(''); setMessage('') }}
            >
              <Users size={16} />
              <span>Next of Kin &amp; Contacts</span>
            </button>
          </div>

          {/* Form for Profile Data */}
          <form className="member-account-card member-details-form" onSubmit={saveProfile}>
            <div className="member-account-card-heading">
              <span>
                {activeTab === 'personal' && <UserRound size={18} />}
                {activeTab === 'banking' && <Landmark size={18} />}
                {activeTab === 'kin' && <Users size={18} />}
              </span>
              <div>
                <h2>
                  {activeTab === 'personal' && 'Personal, Employment & Address'}
                  {activeTab === 'banking' && 'Bank Account Details'}
                  {activeTab === 'kin' && 'Next of Kin Details'}
                </h2>
                <p>
                  {activeTab === 'personal' && 'Manage your phone, email, branch location and job role'}
                  {activeTab === 'banking' && 'Primary and secondary bank accounts for loan payouts and refunds'}
                  {activeTab === 'kin' && 'Designated next of kin on your SACCO record'}
                </p>
              </div>
            </div>

            {tabGroups.map((group) => (
              <section key={group} className="account-info-group">
                <div className="member-details-form-heading">
                  <div>
                    <p className="section-kicker">SECTION</p>
                    <h2>{group}</h2>
                  </div>
                  {group.includes('bank') && <Landmark size={17} />}
                  {group.includes('Address') && <MapPin size={17} />}
                  {group.includes('Employment') && <Briefcase size={17} />}
                </div>
                <div className="member-details-fields">
                  {tabFields
                    .filter((field) => field.group === group)
                    .map((field) => (
                      <label key={field.key}>
                        {field.label}
                        <input
                          type={field.type ?? 'text'}
                          value={profile[field.key] ?? ''}
                          onChange={(event) =>
                            setProfile((current) => ({ ...current, [field.key]: event.target.value }))
                          }
                          placeholder={field.placeholder}
                          autoComplete={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'off'}
                        />
                      </label>
                    ))}
                </div>
              </section>
            ))}

            {/* Inline Feedback Banner directly above the submit button */}
            <div ref={inlineFeedbackRef}>
              {message && (
                <div className="member-form-inline-alert alert-success" role="status">
                  <CheckCircle2 size={18} className="alert-icon" />
                  <div>
                    <strong>Success</strong>
                    <p>{message}</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="member-form-inline-alert alert-error" role="alert">
                  <AlertCircle size={18} className="alert-icon" />
                  <div>
                    <strong>Update Error</strong>
                    <p>{error}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="form-submit-footer">
              <button className="submit-button" type="submit" disabled={saving}>
                <span>
                  {saving
                    ? 'Submitting for Authorization…'
                    : pendingChange
                    ? 'Resubmit Changes for Authorization'
                    : 'Submit Changes for Authorization'}
                </span>
                <Save size={17} />
              </button>
            </div>
          </form>

          {/* Emergency Contacts on Kin tab */}
          {activeTab === 'kin' && (
            <div className="member-contacts-embedded-wrap">
              <MemberContactsPage compact />
            </div>
          )}
        </>
      )}
    </section>
  )
}
