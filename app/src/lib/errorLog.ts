import { supabase } from './supabase'
import { useAuthStore } from '../store/auth'
import { BUILD_TIME } from '../releaseNotes'

/** Best-effort write of an unhandled error to the app_errors table.
 *  Never throws — clipboards and network blips here would make
 *  things worse. */
export async function logError(error: unknown, extra?: { componentStack?: string }) {
  try {
    const employee = useAuthStore.getState().employee
    const err = error instanceof Error ? error : new Error(String(error))
    const stack = (err.stack ?? '') + (extra?.componentStack ? `\n--- React component stack ---${extra.componentStack}` : '')
    await supabase.from('app_errors').insert({
      message:         err.message?.slice(0, 4000) ?? null,
      stack:           stack.slice(0, 8000) || null,
      url:             typeof window !== 'undefined' ? window.location.href : null,
      user_agent:      typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      employee_number: employee?.employee_number ?? null,
      build_time:      BUILD_TIME,
    })
  } catch {
    /* swallow — logging must not break the app */
  }
}
