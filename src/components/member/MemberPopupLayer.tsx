import { useState, type ReactNode } from 'react'
import { BellRing } from 'lucide-react'
import type { MemberPopupMessage } from '../../types'

interface MemberPopupLayerProps {
  messages: MemberPopupMessage[]
  children: ReactNode
}

export function MemberPopupLayer({ messages, children }: MemberPopupLayerProps) {
  const [dismissedIds, setDismissedIds] = useState<number[]>([])
  const currentMessage = messages.find((message) => !dismissedIds.includes(message.id))

  return (
    <>
      {children}
      {currentMessage && (
        <div className="member-message-overlay" role="presentation">
          <section className="member-message-dialog" role="dialog" aria-modal="true" aria-labelledby="member-message-title">
            <div className="member-message-icon"><BellRing size={23} /></div>
            <span className="member-message-eyebrow">Message from Magomano County Sacco</span>
            <h2 id="member-message-title">{currentMessage.title}</h2>
            <p>{currentMessage.body}</p>
            <button
              type="button"
              className="member-message-dismiss"
              onClick={() => setDismissedIds((current) => [...current, currentMessage.id])}
            >
              Continue
            </button>
          </section>
        </div>
      )}
    </>
  )
}
