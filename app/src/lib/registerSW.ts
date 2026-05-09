// =====================================================================
// 8130 APP — Service-worker cleanup (deprecated registration path)
// =====================================================================
// The app no longer uses a service worker. Per user direction (online-
// only is fine, offline isn't required) we drop the entire SW machinery.
// On every load we:
//   1. Unregister any leftover SW from previous app versions.
//   2. Clear every cache the previous SW populated.
// The page itself is served straight from the network (with normal HTTP
// caching for the hashed asset files), eliminating a whole class of
// "stale shell, missing chunk" failures the warehouse + technicians
// were hitting.
// =====================================================================

export const APP_UPDATE_EVENT = 'app-update-available'  // legacy export, not dispatched

export function registerServiceWorker() {
  if (typeof navigator === 'undefined') return

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => { r.unregister().catch(() => {}) })
    }).catch(() => {})
  }

  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((k) => { caches.delete(k).catch(() => {}) })
    }).catch(() => {})
  }
}
