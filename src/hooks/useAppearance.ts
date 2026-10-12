import { useCallback, useLayoutEffect, useState } from 'react'
import { disable, enable } from 'darkreader'

const LIGHT_PREFERENCE = 'light'

export function useAppearance(memberId?: string) {
  const preferenceKey = memberId ? `magomano-appearance-${memberId}` : undefined
  const [, refreshPreference] = useState(0)
  const forceLight = preferenceKey
    ? window.localStorage.getItem(preferenceKey) === LIGHT_PREFERENCE
    : false

  useLayoutEffect(() => {
    if (forceLight) {
      disable()
    } else {
      enable({ mode: 1, brightness: 100, contrast: 90, sepia: 0 })
    }
  }, [forceLight])

  const toggleForceLight = useCallback(() => {
    if (!preferenceKey) return
    if (window.localStorage.getItem(preferenceKey) === LIGHT_PREFERENCE) {
      window.localStorage.removeItem(preferenceKey)
    } else {
      window.localStorage.setItem(preferenceKey, LIGHT_PREFERENCE)
    }
    refreshPreference((version) => version + 1)
  }, [preferenceKey])

  return { forceLight, toggleForceLight }
}
