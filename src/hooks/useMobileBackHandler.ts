import { useEffect, useRef, useState } from 'react'

export interface BackHandlerOptions {
  /** If a modal, sheet, or overlay is currently open, a function to close it */
  activeModalClose?: (() => void) | null
  /** Current sub-view, e.g. 'loans', 'members', 'apply', etc. */
  currentView?: string
  /** Function to return to the root overview */
  onGoToRoot?: (() => void) | null
  /** Whether the user is currently at the root / main menu */
  isRoot?: boolean
}

/**
 * Mobile Hardware/Gesture Back Button Handler
 *
 * - Closes open modals/drawers first
 * - Goes back to overview if inside a subview
 * - Requires double-back / double-swipe within 2 seconds to exit when on root
 */
export function useMobileBackHandler({
  activeModalClose,
  currentView,
  onGoToRoot,
  isRoot = true,
}: BackHandlerOptions) {
  const [showExitToast, setShowExitToast] = useState(false)
  const lastBackPressRef = useRef<number>(0)
  const toastTimeoutRef = useRef<number | null>(null)

  // Keep latest handlers in refs to avoid stale closures in popstate listener
  const activeModalCloseRef = useRef(activeModalClose)
  activeModalCloseRef.current = activeModalClose

  const onGoToRootRef = useRef(onGoToRoot)
  onGoToRootRef.current = onGoToRoot

  const isRootRef = useRef(isRoot)
  isRootRef.current = isRoot

  const currentViewRef = useRef(currentView)
  currentViewRef.current = currentView

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Ensure a sentinel history entry exists
    try {
      window.history.pushState({ app: 'magomano', state: 'active' }, '')
    } catch {}

    function handlePopState() {
      // 1. If a modal, drawer, or dialog is open, close it first
      if (activeModalCloseRef.current) {
        activeModalCloseRef.current()
        try {
          window.history.pushState({ app: 'magomano', state: 'active' }, '')
        } catch {}
        return
      }

      // 2. If user is in a subview instead of root overview, navigate to root
      if (!isRootRef.current && onGoToRootRef.current) {
        onGoToRootRef.current()
        try {
          window.history.pushState({ app: 'magomano', state: 'active' }, '')
        } catch {}
        return
      }

      // 3. User is at the root / main menu -> require double-back to exit
      const now = Date.now()
      if (now - lastBackPressRef.current < 2000) {
        // Double-back detected -> allow exit
        setShowExitToast(false)
        window.history.back()
      } else {
        // First back press -> intercept and prompt
        lastBackPressRef.current = now
        try {
          window.history.pushState({ app: 'magomano', state: 'active' }, '')
        } catch {}

        setShowExitToast(true)
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = window.setTimeout(() => {
          setShowExitToast(false)
        }, 2000)
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  return { showExitToast }
}

