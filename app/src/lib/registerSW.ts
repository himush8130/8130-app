// =====================================================================
// 8130 APP — Service worker registration
// =====================================================================
// Registers /sw.js in production builds only. In dev (Vite HMR), the
// service worker can confuse the dev server, so we skip it.
//
// Auto-update flow:
//   1. Page loads → registers SW.
//   2. Every 60s and on tab focus, asks the SW to check for an update.
//   3. When a new SW takes control (controllerchange), reload exactly
//      once so the user sees the new build without closing the app.
// =====================================================================

const UPDATE_INTERVAL_MS = 60_000

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
        // Periodic + visibility-driven update checks.
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
