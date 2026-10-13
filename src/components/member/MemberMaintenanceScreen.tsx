import { Clock3, LogOut, Wrench } from 'lucide-react'

interface MemberMaintenanceScreenProps {
  memberName: string
  message: string
  onLogout: () => void
}

export function MemberMaintenanceScreen({ memberName, message, onLogout }: MemberMaintenanceScreenProps) {
  const firstName = memberName.trim().split(/\s+/)[0] || 'Member'

  return (
    <main className="member-maintenance-screen">
      <section className="member-maintenance-card" aria-labelledby="maintenance-title">
        <div className="maintenance-brand-mark" aria-hidden="true"><Wrench size={24} /></div>
        <span className="maintenance-eyebrow"><Clock3 size={15} /> Temporary service notice</span>
        <h1 id="maintenance-title">We’ll be back soon, {firstName}</h1>
        <p className="maintenance-notice-message">{message}</p>
        <p className="maintenance-support-copy">
          Your account is safe. Member services will return when maintenance is complete.
        </p>
        <button type="button" className="maintenance-logout-button" onClick={onLogout}>
          <LogOut size={17} /> Sign out
        </button>
      </section>
    </main>
  )
}
