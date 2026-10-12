import { useEffect, useState } from 'react'

interface AnimatedFigureProps {
  value: number
  format?: 'currency' | 'number'
  className?: string
}

const currencyFormat = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 2,
})
const numberFormat = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 })
const durationMs = 720

function formatFigure(value: number, format: 'currency' | 'number') {
  return format === 'currency' ? currencyFormat.format(value) : numberFormat.format(value)
}

export function AnimatedFigure({ value, format = 'currency', className }: AnimatedFigureProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || value === 0) {
      setDisplayValue(value)
      return
    }

    let frame = 0
    const startTime = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1)
      const eased = 1 - (1 - progress) ** 4
      setDisplayValue(value * eased)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return (
    <span className={className} aria-label={formatFigure(value, format)}>
      {formatFigure(displayValue, format)}
    </span>
  )
}
