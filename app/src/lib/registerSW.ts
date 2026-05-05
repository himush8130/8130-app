// =====================================================================
// 8130 APP — Service worker registration
// =====================================================================
// Registers /sw.js in production builds only. In dev (Vite HMR), the
// service worker can confuse the dev server, so we skip it.
//
// Update flow:
//   1. Page loads → registers SW.
//   2. Every 60s and on tab focus, asks the SW to check for updates.
//   3. When a new SW is installed AND there is already a controller
//      (= this is an update, not a first install), dispatches a
//      `app-update-available` window event with the registration.
//      The UpdateBanner component listens and renders a UI asking the
//      user to reload. Clicking sends SKIP_WAITING → controllerchange
//      fires → page reloads exactly once.
// =====================================================================

const UPDATE_INTERVAL_MS = 60_000

export const APP_UPDATE_EVENT = 'app-update-available'

declare global {
  interface WindowEventMap {
    [APP_UPDATE_EVENT]: CustomEvent<{ registration: ServiceWorkerRegistration }>
  }
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // If a new SW is already waiting at register time, surface it.
        if (registration.waiting && navigator.serviceWorker.controller) {
          dispatchUpdate(registration)
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // Update available — page is currently controlled by the
              // old SW, the new one is sitting in `waiting`.
              dispatchUpdate(registration)
            }
          })
        })

        setInterval(() => { registration.update().catch(() => {}) }, UPDATE_INTERVAL_MS)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {})
          }
        })
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err)
      })
  })
}

function dispatchUpdate(registration: ServiceWorkerRegistration) {
  window.dispatchEvent(
    new CustomEvent(APP_UPDATE_EVENT, { detail: { registration } }),
  )
}
