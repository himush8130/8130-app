import { useEffect, useState } from 'react'
import { APP_UPDATE_EVENT } from '../lib/registerSW'

/**
 * Banner shown at the bottom of the screen when a new service worker
 * has finished installing. Clicking "טען עכשיו" tells the SW to
 * skip the waiting state; registerSW.ts catches the resulting
 * `controllerchange` and reloads the page once.
 */
export function UpdateBanner() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent<{ registration: ServiceWorkerRegistration }>).detail
      setRegistration(detail.registration)
      setDismissed(false)
    }
    window.addEventListener(APP_UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(APP_UPDATE_EVENT, onUpdate)
  }, [])

  if (!registration || dismissed) return null

  function reloadNow() {
    const waiting = registration?.waiting
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' })
    } else {
      // Fallback: force a network-first reload.
      window.location.reload()
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto bg-primary text-primary-fg shadow-lg rounded-t-md sm:rounded-md flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold">זמין עדכון לאפליקציה</span>
          <span className="text-xs opacity-90">לחץ "טען עכשיו" כדי לקבל את הגרסה החדשה</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={reloadNow}
            className="bg-card text-primary text-sm font-semibold px-3 py-1.5 rounded-md hover:opacity-90"
          >
            טען עכשיו
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="סגור"
            className="text-primary-fg/80 hover:text-primary-fg text-lg leading-none px-1"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
