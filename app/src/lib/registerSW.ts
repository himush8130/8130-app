// =====================================================================
// 8130 APP — Service worker registration
// =====================================================================
// Registers /sw.js in production builds only. In dev (Vite HMR), the
// service worker can confuse the dev server, so we skip it.
// =====================================================================

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        console.warn('Service worker registration failed:', err)
      })
  })
}
