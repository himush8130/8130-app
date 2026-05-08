/* =====================================================================
 * 8130 APP — Service Worker
 * =====================================================================
 * Strategy:
 *   • Navigation / HTML: NETWORK-FIRST. The HTML must always reflect
 *     the latest deploy so it points to the freshest hashed assets.
 *     Falls back to cached '/' only when offline.
 *   • Hashed assets (/assets/*): cache-first, immutable. Vite emits
 *     content-hashed filenames, so a new build means a new URL.
 *   • Other static (manifest, icons): cache-first.
 *   • Supabase API: network-first with cache fallback.
 *
 * Updates: install → skipWaiting; activate → clients.claim. The page
 * (registerSW.ts) reloads exactly once on `controllerchange`, so users
 * pick up the new build automatically without closing the app.
 * ===================================================================== */

const SHELL_CACHE = '8130-shell'
const ASSET_CACHE = '8130-assets'
const API_CACHE   = '8130-api'

const SHELL_PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_PRECACHE))
  )
  // No skipWaiting() here. The new SW stays in `waiting` state until
  // the page sends a SKIP_WAITING message (triggered by the user
  // clicking "עדכן עכשיו" in the UpdateBanner).
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE && k !== API_CACHE)
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
    event.respondWith(networkFirst(req, API_CACHE))
    return
  }

  if (url.origin !== self.location.origin) return

  // SPA navigation: always try network so we get the latest HTML
  // (which references the latest content-hashed JS/CSS).
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstHTML(req))
    return
  }

  // Hashed assets: immutable, safe to serve from cache forever.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(req, ASSET_CACHE))
    return
  }

  // Other same-origin static (manifest, icons): cache-first.
  event.respondWith(cacheFirst(req, SHELL_CACHE))
})

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req)
  if (cached) return cached
  const res = await fetch(req)
  if (res.ok) {
    const cache = await caches.open(cacheName)
    cache.put(req, res.clone())
  }
  return res
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(cacheName)
      cache.put(req, res.clone())
    }
    return res
  } catch (err) {
    const cached = await caches.match(req)
    if (cached) return cached
    throw err
  }
}

async function networkFirstHTML(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put('/', res.clone())
    }
    return res
  } catch {
    const cached = await caches.match('/')
    if (cached) return cached
    return new Response('Offline', { status: 503 })
  }
}
