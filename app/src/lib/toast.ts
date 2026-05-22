// Lightweight global toast. Any module can `showToast(...)` without
// needing to wire React context through every screen. ToastHost mounts
// once at the app root and renders into a portal.

export type ToastTone = 'warning' | 'success' | 'danger' | 'info'

export interface ToastEvent {
  text:     string
  tone:     ToastTone
  duration: number
}

type Listener = (e: ToastEvent) => void

const listeners = new Set<Listener>()

export function subscribeToast(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function showToast(text: string, tone: ToastTone = 'info', duration = 2000) {
  for (const fn of listeners) fn({ text, tone, duration })
}
