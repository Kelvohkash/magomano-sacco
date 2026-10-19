import { useEffect } from 'react'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushNotifications(memberId: number | undefined): void {
  useEffect(() => {
    if (!memberId || !VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    let cancelled = false

    async function subscribe() {
      try {
        const registration = await navigator.serviceWorker.ready
        let subscription = await registration.pushManager.getSubscription()
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as unknown as BufferSource,
          })
        }
        if (cancelled) return
        const subJson = subscription.toJSON()
        await fetch('/api/member/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
        })
      } catch {
        // Push may be blocked or unsupported — silent fail
      }
    }

    void subscribe()
    return () => { cancelled = true }
  }, [memberId])
}
