// Best-effort hard reload that works even when the SW or caches API
// hangs (observed in iOS Safari standalone PWA mode). Each step has
// a timeout; we always end up calling location.replace with a cache
// busting query string, so the network request bypasses any stale
// cached HTML.
export async function hardReload(): Promise<void> {
  // Run all cleanup steps in parallel with a single budget, so a
  // hung step can't stall the navigation.
  await withTimeout(Promise.all([
    unregisterServiceWorkers(),
    deleteAllCaches(),
  ]), 1500)

  const url = new URL(window.location.href)
  url.searchParams.set('_r', Date.now().toString())
  // replace() so the back button doesn't return to the broken state.
  window.location.replace(url.toString())
}

async function unregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)))
  } catch {
    // Best-effort; some browsers throw on locked-down origins.
  }
}

async function deleteAllCaches(): Promise<void> {
  if (!('caches' in window)) return
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch {
    // Best-effort; iOS sometimes throws here.
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    p,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ])
}
