/**
 * Dynamic Screen & Font Size Normalizer
 *
 * Automatically detects if the user has set excessive OS text scaling (accessibility font size)
 * or oversized display zoom (DPI scaling) on mobile devices, and scales down the page
 * to prevent disoriented, clipped, or wrapping layouts.
 */

export function initScreenScaler(): () => void {
  function applyScale() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const root = document.documentElement

    // 1. Measure system text scaling via a DOM probe with explicit 16px font size
    let fontScale = 1
    try {
      const probe = document.createElement('div')
      probe.setAttribute('aria-hidden', 'true')
      probe.style.cssText =
        'position:fixed;left:-9999px;top:-9999px;font-size:16px !important;line-height:1;visibility:hidden;pointer-events:none;padding:0;margin:0;border:0;'
      probe.textContent = 'M'
      root.appendChild(probe)
      const computed = parseFloat(window.getComputedStyle(probe).fontSize)
      root.removeChild(probe)
      if (computed && computed > 0) {
        fontScale = computed / 16
      }
    } catch {
      fontScale = 1
    }

    const width = window.innerWidth || root.clientWidth || 390
    const isMobile = width < 768

    let targetScale = 1.0

    if (isMobile) {
      // If user's OS has enlarged font size (e.g., 1.2x, 1.5x, 2.0x)
      const fontRatio = fontScale > 1.04 ? 1 / fontScale : 1.0

      // If user's OS has enlarged display size, reducing CSS viewport below standard 380px
      const widthRatio = width < 380 ? Math.max(0.76, width / 380) : 1.0

      // Combine factors to neutralize OS enlargement
      targetScale = Math.min(fontRatio, widthRatio)

      // Clamp target scale between 0.70 and 1.0 to ensure text remains crisp and legible
      targetScale = Math.max(0.70, Math.min(1.0, targetScale))
    }

    if (Math.abs(targetScale - 1.0) > 0.02) {
      root.style.zoom = String(targetScale)
      root.style.setProperty('--app-scale', String(targetScale))
    } else {
      root.style.zoom = '1'
      root.style.setProperty('--app-scale', '1')
    }
  }

  applyScale()

  window.addEventListener('resize', applyScale, { passive: true })
  window.addEventListener('orientationchange', applyScale, { passive: true })
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyScale, { passive: true })
  }

  return () => {
    window.removeEventListener('resize', applyScale)
    window.removeEventListener('orientationchange', applyScale)
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', applyScale)
    }
  }
}

