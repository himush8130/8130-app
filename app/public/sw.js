/* =====================================================================
 * 8130 APP — Service Worker
 * =====================================================================
 * Strategy:
 *   • App shell (HTML, JS, CSS, icons): cache-first. Same shell on
 *     every load even when offline.
 *   • Supabase API (REST + functions): network-first; if the network
 *     fails, fall back to a cached response if we have one.
 *
 * The cache name is bumped per release (see CACHE_VERSION). On
 * activate, all old caches are deleted.
 * ===================================================================== */

const CACHE_VERSION = 'v1'
const SHELL_CACHE   = `8130-shell-${CACHE_VERSION}`
const API_CACHE     = `8130-api-${CACHE_VERSION}`

const SHELL_PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-maskable.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Supabase API — network-first with cache fallback.
  if (url.host.endsWith('.supabase.co')) {
    event.respondWith(networkFirst(req))
    return
  }

  // Same origin: cache-first for the app shell + assets.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req))
    return
  }

  // Anything else (e.g. Google Fonts): just pass through.
})

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch (err) {
    // Last-ditch: return the cached root document for navigations,
    // letting the SPA handle the 404.
    if (req.mode === 'navigate') {
      const root = await caches.match('/')
      if (root) return root
    }
    throw err
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch (err) {
    const cached = await caches.match(req)
    if (cached) return cached
    throw err
  }
}
