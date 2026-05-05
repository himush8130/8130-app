import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches uncaught render errors from descendants. The most common
 * trigger in production is a chunk-load failure after a deploy, which
 * otherwise yields a blank screen with no recovery path.
 *
 * Behavior:
 *   - ChunkLoadError / dynamic-import errors: auto-reload once.
 *   - Anything else: show a minimal recovery UI in Hebrew so the user
 *     can hard-reload manually.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (isChunkLoadError(error) && !sessionStorage.getItem('chunkReloadAttempted')) {
      sessionStorage.setItem('chunkReloadAttempted', '1')
      hardReload()
    }
  }

  reset = () => {
    sessionStorage.removeItem('chunkReloadAttempted')
    hardReload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-md p-5 flex flex-col gap-3 text-center">
          <h2 className="text-lg font-semibold text-foreground">משהו השתבש</h2>
          <p className="text-sm text-muted">
            ייתכן שהאפליקציה התעדכנה בזמן שהיית כאן. לחץ "טען מחדש" כדי לקבל את הגרסה החדשה.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="bg-primary text-primary-fg text-sm font-semibold px-4 py-2 rounded-md hover:opacity-90"
          >
            טען מחדש
          </button>
          <details className="text-start">
            <summary className="text-xs text-muted cursor-pointer">פרטים טכניים</summary>
            <pre className="text-[11px] text-muted mt-1 whitespace-pre-wrap break-all">
              {this.state.error.message}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}

function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { name?: string; message?: string }
  if (e.name === 'ChunkLoadError') return true
  const msg = e.message ?? ''
  return /Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)
}

function hardReload() {
  // Clear all caches first so the next load is genuinely fresh.
  const reload = () => window.location.reload()
  if ('caches' in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .finally(reload)
  } else {
    reload()
  }
}
