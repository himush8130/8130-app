import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useFeedbackNotes } from '../hooks/useFeedbackNotes'
import { useAuthStore } from '../store/auth'
import { useFeedbackMode } from '../store/feedbackMode'
import {
  editFeedbackNote,
  deleteFeedbackNote,
  setFeedbackNoteStatus,
  deleteDoneFeedbackNotes,
} from '../lib/feedbackActions'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { RenderNoteText } from '../feedback/RenderNoteText'
import type { FeedbackNote } from '../types/feedback'

export function NotesPage() {
  const { data, isLoading, error } = useFeedbackNotes()
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  const notes = data ?? []
  const doneCount = notes.filter((n) => n.status === 'done').length

  async function handleBulkDelete() {
    if (!employee) return
    setBulkBusy(true)
    const res = await deleteDoneFeedbackNotes(employee.employee_number)
    setBulkBusy(false)
    setBulkConfirm(false)
    if (res.ok) {
      setBulkResult(`נמחקו ${doneCount} הערות שבוצעו`)
      setTimeout(() => setBulkResult(null), 3000)
      queryClient.invalidateQueries({ queryKey: ['feedback_notes'] })
    } else {
      setBulkResult('שגיאה במחיקה')
    }
  }

  return (
    <>
      <AppHeader subtitle="לוג הערות UI" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3 pb-24">
        <ComponentBadge id={8002} />

        {doneCount > 0 && (
          <Card>
            <CardBody className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-muted">
                {doneCount} הערות מסומנות כבוצעו
              </span>
              {!bulkConfirm ? (
                <span className="contents">
                  <ComponentBadge id={8005} />
                  <Button variant="secondary" onClick={() => setBulkConfirm(true)}>
                    מחק הערות שבוצעו
                  </Button>
                </span>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleBulkDelete} disabled={bulkBusy}>
                    {bulkBusy ? 'מוחק...' : `אשר מחיקה (${doneCount})`}
                  </Button>
                  <Button variant="ghost" onClick={() => setBulkConfirm(false)}>
                    ביטול
                  </Button>
                </div>
              )}
              {bulkResult && <span className="text-xs text-success">{bulkResult}</span>}
            </CardBody>
          </Card>
        )}

        {isLoading && <p className="text-sm text-muted text-center py-4">טוען...</p>}

        {error && (
          <Card>
            <CardBody>
              <p className="text-danger text-sm">שגיאה בטעינת ההערות</p>
            </CardBody>
          </Card>
        )}

        {!isLoading && notes.length === 0 && (
          <Card>
            <CardBody>
              <p className="text-muted text-center text-sm py-4">לוג ההערות ריק</p>
            </CardBody>
          </Card>
        )}

        {notes.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            isAuthor={employee?.employee_number === note.author_employee_number}
          />
        ))}
      </main>
    </>
  )
}

// ---------- Single note ----------

function NoteItem({ note, isAuthor }: { note: FeedbackNote; isAuthor: boolean }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.text)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const employee = useAuthStore((s) => s.employee)
  const setFeedbackMode = useFeedbackMode((s) => s.setEnabled)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const created = new Date(note.created_at).toLocaleString('he-IL')
  const wasEdited = note.updated_at !== note.created_at
  const isDone = note.status === 'done'

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['feedback_notes'] })
  }

  async function save() {
    if (!employee) return
    setError(null)
    if (text.trim().length === 0) { setError('טקסט ריק'); return }
    setBusy(true)
    const res = await editFeedbackNote(employee.employee_number, note.id, text)
    setBusy(false)
    if (!res.ok) { setError('שגיאה בעדכון'); return }
    setEditing(false)
    refresh()
  }

  async function remove() {
    if (!employee) return
    setError(null)
    setBusy(true)
    const res = await deleteFeedbackNote(employee.employee_number, note.id)
    setBusy(false)
    if (!res.ok) { setError('שגיאה במחיקה'); return }
    refresh()
  }

  async function toggleStatus() {
    if (!employee) return
    setError(null)
    setBusy(true)
    const next = isDone ? 'new' : 'done'
    const res = await setFeedbackNoteStatus(employee.employee_number, note.id, next)
    setBusy(false)
    if (!res.ok) { setError('שגיאה בעדכון סטטוס'); return }
    refresh()
  }

  function jumpToPage() {
    setFeedbackMode(true)
    navigate(note.page_path)
  }

  return (
    <Card className={isDone ? 'opacity-60' : ''}>
      <ComponentBadge id={8003} />
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{note.display_id}</span>
            <Badge tone={isDone ? 'success' : 'info'}>
              {isDone ? 'בוצע' : 'חדש'}
            </Badge>
            <span className="text-xs text-muted">
              {note.author_name} ({note.author_employee_number}) · {created}
              {wasEdited && <span className="text-faint italic ms-1">(נערך)</span>}
            </span>
          </div>
          <button
            type="button"
            onClick={jumpToPage}
            className="text-xs text-primary hover:underline"
            title="עבור לדף בו ההערה נשלחה (מצב הערות יידלק אוטומטית)"
          >
            דף: {note.page_path} ↗
          </button>
        </div>
      </CardHeader>

      <CardBody>
        {!editing ? (
          <p className="text-sm text-foreground">
            <RenderNoteText text={note.text} />
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <span className="text-xs text-danger">{error}</span>}
          </div>
        )}

        {note.component_ids.length > 0 && !editing && (
          <div className="text-xs text-muted mt-2">
            רכיבים מוזכרים: {note.component_ids.map((id) => `#${id}`).join(' · ')}
          </div>
        )}

        {!confirmDelete && !editing && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="contents">
              <ComponentBadge id={8004} />
              <Button variant={isDone ? 'ghost' : 'primary'} onClick={toggleStatus} disabled={busy}>
                {busy ? '...' : isDone ? 'החזר לחדש' : 'סמן כבוצע'}
              </Button>
            </span>
            {isAuthor && (
              <>
                <Button variant="secondary" onClick={() => { setEditing(true); setText(note.text) }}>
                  ערוך
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                  מחק
                </Button>
              </>
            )}
            {error && <span className="text-xs text-danger self-center">{error}</span>}
          </div>
        )}

        {editing && (
          <div className="flex gap-2 mt-3">
            <Button onClick={save} disabled={busy}>
              {busy ? 'שומר...' : 'שמור'}
            </Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setText(note.text); setError(null) }}>
              ביטול
            </Button>
          </div>
        )}

        {isAuthor && confirmDelete && (
          <div className="flex flex-col gap-2 mt-3 p-2 bg-danger/5 rounded-md">
            <p className="text-sm text-foreground">למחוק את ההערה הזו?</p>
            <div className="flex gap-2">
              <Button onClick={remove} disabled={busy}>
                {busy ? 'מוחק...' : 'אשר מחיקה'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>ביטול</Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
