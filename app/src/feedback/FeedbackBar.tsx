import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useFeedbackMode } from '../store/feedbackMode'
import { useAuthStore } from '../store/auth'
import { addFeedbackNote } from '../lib/feedbackActions'
import { ComponentBadge } from './ComponentBadge'

export function FeedbackBar() {
  const enabled = useFeedbackMode((s) => s.enabled)
  const employee = useAuthStore((s) => s.employee)
  const location = useLocation()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!enabled || !employee) return null

  async function send() {
    setError(null)
    if (text.trim().length === 0) return
    setBusy(true)
    const res = await addFeedbackNote(employee!.employee_number, location.pathname, text)
    setBusy(false)
    if (!res.ok) {
      setError('שגיאה בשליחת ההערה')
      return
    }
    setText('')
    setLastSaved(res.note?.display_id ?? null)
    setTimeout(() => setLastSaved(null), 3000)
    queryClient.invalidateQueries({ queryKey: ['feedback_notes'] })
  }

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 bg-card border-t-2 border-primary/60 shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-3xl mx-auto p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          <ComponentBadge id={8001} />
          <span>מצב הערות פעיל · דף נוכחי: <code className="text-foreground">{location.pathname}</code></span>
          {lastSaved && <span className="text-success">✓ נשמרה: {lastSaved}</span>}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="כתוב הערה. הזכר רכיבים עם #ID, למשל: #3009 צריך טקסט ארוך יותר"
            className="flex-1 min-w-0 px-3 py-2 bg-card border border-border rounded-md text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || text.trim().length === 0}
            className="px-4 py-2 bg-primary text-primary-fg rounded-md font-medium disabled:opacity-50"
          >
            {busy ? '...' : 'שלח'}
          </button>
        </div>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  )
}
