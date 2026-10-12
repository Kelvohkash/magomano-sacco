import { useEffect, useState } from 'react'
import { Lightbulb } from 'lucide-react'

interface MemberWelcomeProps {
  firstName: string
  savingsBalance: number
  outstandingLoans: number
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function MemberWelcome({ firstName, savingsBalance, outstandingLoans }: MemberWelcomeProps) {
  const [greeting, setGreeting] = useState(getGreeting)
  const [tipIndex, setTipIndex] = useState(0)
  const greetingText = `${greeting}, ${firstName}`
  const tips = [
    savingsBalance > 0
      ? 'Regular savings, even in small amounts, can build a stronger financial cushion.'
      : 'Start building a financial cushion with regular savings that fit your budget.',
    outstandingLoans > 0
      ? 'Keeping loan repayments on schedule helps maintain a healthy borrowing record.'
      : 'Before borrowing, make sure the repayment plan fits comfortably into your budget.',
    'Review your savings and loan statements regularly to stay on top of account activity.',
  ]

  useEffect(() => {
    const greetingTimer = window.setInterval(() => setGreeting(getGreeting()), 60_000)
    const tipTimer = window.setInterval(() => setTipIndex((index) => (index + 1) % tips.length), 12_000)
    return () => {
      window.clearInterval(greetingTimer)
      window.clearInterval(tipTimer)
    }
  }, [tips.length])

  return (
    <>
      <h1 className="member-welcome-heading" title={greetingText}>{greetingText}</h1>
      <p className="member-welcome-tip" aria-live="polite">
        <Lightbulb size={15} aria-hidden="true" />
        <span key={tipIndex}>{tips[tipIndex]}</span>
      </p>
    </>
  )
}
