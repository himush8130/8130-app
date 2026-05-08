import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { editComment, deleteComment } from '../lib/managerActions'
import { Button } from './ui/Button'
import type { CallComment } from '../types/db'

interface Props {
  comment: CallComment
  callId:  string
}

export function CommentItem({ comment, callId }: Props) {
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.text)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAuthor = employee?.employee_number === comment.author_employee_number
  const isManager = employee?.permissions === 'manager'
  const canModify = isAuthor || isManager

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['call_detail', callId] })
  }

  async function save() {
    if (!employee) return
    if (!draft.trim()) return
    setBusy(true); setError(null)
    const res = await editComment(employee.employee_number, comment.id, draft.trim())
    setBusy(false)
    if (!res.ok) { setError('שגיאה בעריכה'); return }
    setEditing(false)
    refresh()
  }

  async function remove() {
    if (!employee) return
    setBusy(true); setError(null)
    const res = await deleteComment(employee.employee_number, comment.id)
    setBusy(false)
    if (!res.ok) { setError('שגיאה במחיקה'); setConfirmDelete(false); return }
    refresh()
  }

  return (
    <li className="border-s-2 border-primary ps-3">
      <div className="text-xs text-muted flex items-center gap-2 flex-wrap">
        <span>{comment.author_employee_number ?? 'אנונימי'}</span>
        <span>·</span>
        <span>{new Date(comment.created_at).toLocaleString('he-IL')}</span>
        {canModify && !editing && !confirmDelete && (
          <span className="ms-auto flex gap-2">
            <button onClick={() => setEditing(true)} className="text-primary hover:underline">ערוך</button>
            <button onClick={() => setConfirmDelete(true)} className="text-danger hover:underline">מחק</button>
          </span>
        )}
      </div>
      {!editing ? (
        <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{comment.text}</p>
      ) : (
        <div className="mt-1 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="px-2 py-1 bg-card border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
          />
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy} className="text-xs px-3 py-1">{busy ? 'שומר...' : 'שמור'}</Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setDraft(comment.text) }} className="text-xs px-3 py-1">ביטול</Button>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="text-danger">למחוק את ההערה?</span>
          <Button onClick={remove} disabled={busy} className="text-xs px-3 py-1">{busy ? '...' : 'אשר'}</Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1">ביטול</Button>
        </div>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </li>
  )
}
