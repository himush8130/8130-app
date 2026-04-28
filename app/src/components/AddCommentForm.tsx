import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/Button'
import { useAuthStore } from '../store/auth'
import { addComment } from '../lib/managerActions'

export function AddCommentForm({ callId }: { callId: string }) {
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    if (text.trim().length === 0) return
    setBusy(true)
    const res = await addComment(employee.employee_number, callId, text)
    setBusy(false)
    if (!res.ok) {
      setError('שגיאה בהוספת הערה')
      return
    }
    setText('')
    queryClient.invalidateQueries({ queryKey: ['call_detail', callId] })
  }

  return (
    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="הוסף הערה..."
        rows={2}
        className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary resize-y"
      />
      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={busy || text.trim().length === 0}>
          {busy ? 'שולח...' : 'הוסף הערה'}
        </Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  )
}
