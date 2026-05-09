/* =====================================================================
 * 8130 APP — Self-uninstall service-worker stub
 * =====================================================================
 * The app no longer uses a service worker. This stub takes any
 * client that still has a SW registered, wipes its caches, and
 * unregisters itself. After the next reload the page is served
 * straight from the network with no SW in between.
 * ===================================================================== */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch { /* ignore */ }
    try { await self.registration.unregister() } catch { /* ignore */ }
    // Reload every controlled window so the next request goes
    // through the network (no SW interception).
    const wins = await self.clients.matchAll({ type: 'window' })
    for (const w of wins) {
      try { w.navigate(w.url) } catch { /* ignore */ }
    }
  })())
})

// Pass-through fetch — no caching.
self.addEventListener('fetch', () => {})
