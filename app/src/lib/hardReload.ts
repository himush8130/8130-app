// Best-effort hard reload that works even when the SW or caches API
// hangs (observed in iOS Safari standalone PWA mode). Each step has
// a timeout; we always end up calling location.replace with a cache
// busting query string, so the network request bypasses any stale
// cached HTML.
export async function hardReload(): Promise<void> {
  await withTimeout(deleteAllCaches(), 1500)

  const url = new URL(window.location.href)
  url.searchParams.set('_r', Date.now().toString())
  // replace() so the back button doesn't return to the broken state.
  window.location.replace(url.toString())
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
