import { Component, type ErrorInfo, type ReactNode } from 'react'
import { hardReload } from '../lib/hardReload'
import { logError } from '../lib/errorLog'

interface Props {
  children: ReactNode
  /** Identifier for sessionStorage so each route gets its own retry budget. */
  scope?: string
}

interface State {
  error: Error | null
}

/**
 * Wraps a sub-tree and recovers from render errors automatically.
 *
 * Flow:
 *   1st error in this scope this session  → log + silent hardReload
 *   2nd error                              → show recovery UI
 * The user clicking "טען מחדש" resets the budget.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  private get key(): string {
    return `eb-tried-${this.props.scope ?? window.location.pathname}`
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Best-effort server log first, regardless of recovery path.
    logError(error, { componentStack: info.componentStack ?? '' })

    if (!sessionStorage.getItem(this.key)) {
      sessionStorage.setItem(this.key, '1')
      // Defer to next tick so the state.error commit lands first; we
      // briefly show the recovery UI then auto-reload, which is much
      // less jarring than React's default white screen.
      setTimeout(() => { hardReload() }, 250)
    }
  }

  reset = () => {
    sessionStorage.removeItem(this.key)
    hardReload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-md p-5 flex flex-col gap-3 text-center">
          <h2 className="text-lg font-semibold text-foreground">משהו השתבש</h2>
          <p className="text-sm text-muted">
            ייתכן שהאפליקציה התעדכנה בזמן שהיית כאן. אנחנו מנסים לטעון מחדש אוטומטית — אם זה לא עזר, לחץ על הכפתור.
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
