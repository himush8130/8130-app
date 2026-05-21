import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useFeedbackNotes } from '../hooks/useFeedbackNotes'
import { useAuthStore } from '../store/auth'
import {
  addFeedbackNote,
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

// Deterministic per-author tint. The same employee_number always
// maps to the same swatch — so a manager glancing at the log can
// tell at a glance who wrote what.
const AUTHOR_PALETTE: Array<{ bg: string; border: string; text: string }> = [
  { bg: '#fbe9df', border: '#c43d3d', text: '#7c2c06' }, // red
  { bg: '#faf2d8', border: '#c9941e', text: '#7e6017' }, // gold
  { bg: '#e0ebf5', border: '#4a7a9e', text: '#1f4a6e' }, // blue
  { bg: '#eef4e9', border: '#4a7d3e', text: '#234d18' }, // green
  { bg: '#f0e6f7', border: '#7a4d8c', text: '#46285a' }, // purple
  { bg: '#fbeee0', border: '#c9a96e', text: '#6d5320' }, // sand
  { bg: '#dde6f3', border: '#2c5282', text: '#1a3460' }, // navy
  { bg: '#eef0e3', border: '#6b7e3e', text: '#3b4720' }, // olive
]

function tintForAuthor(employeeNumber: number): { bg: string; border: string; text: string } {
  return AUTHOR_PALETTE[Math.abs(employeeNumber) % AUTHOR_PALETTE.length]
}

export function NotesPage() {
  const { data, isLoading, error } = useFeedbackNotes()
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  const notes = data ?? []
  const doneCount = notes.filter((n) => n.status === 'done').length
  const isManager = employee?.permissions === 'manager'

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
      <AppHeader subtitle="לוג הערות בין מנהלים" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3 pb-24">
        <ComponentBadge id={8002} />

        {isManager && <AddNote />}

        {doneCount > 0 && (
          <Card>
            <CardBody className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-muted">
                {doneCount} הערות מסומנות כבוצעו
              </span>
              {!bulkConfirm ? (
                <Button variant="secondary" onClick={() => setBulkConfirm(true)}>
                  מחק הערות שבוצעו
                </Button>
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

// ---------- Add a new note (manager only) ----------

function AddNote() {
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  async function send() {
    setError(null)
    if (text.trim().length === 0) return
    setBusy(true)
    const res = await addFeedbackNote(employee.employee_number, '/notes', text.trim())
    setBusy(false)
    if (!res.ok) { setError('שגיאה בשליחה'); return }
    setText('')
    setSavedId(res.note?.display_id ?? null)
    setTimeout(() => setSavedId(null), 2500)
    queryClient.invalidateQueries({ queryKey: ['feedback_notes'] })
  }

  const tint = tintForAuthor(employee.employee_number)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">הערה חדשה</span>
          <span
            className="text-xs px-2 py-0.5 rounded-md font-medium border"
            style={{ background: tint.bg, color: tint.text, borderColor: tint.border }}
          >
            {employee.name}
          </span>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="כתוב הערה למנהלים אחרים..."
          className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
        <div className="flex gap-2 items-center">
          <Button onClick={send} disabled={busy || text.trim().length === 0}>
            {busy ? 'שולח...' : 'שלח'}
          </Button>
          {savedId && <span className="text-xs text-success">✓ נשמרה: {savedId}</span>}
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      </CardBody>
    </Card>
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
  const queryClient = useQueryClient()

  const created = new Date(note.created_at).toLocaleString('he-IL')
  const wasEdited = note.updated_at !== note.created_at
  const isDone = note.status === 'done'
  const tint = tintForAuthor(note.author_employee_number)

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

  return (
    <Card
      className={isDone ? 'opacity-60' : ''}
      style={{ borderRightWidth: '4px', borderRightColor: tint.border }}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{note.display_id}</span>
            <Badge tone={isDone ? 'success' : 'info'}>
              {isDone ? 'בוצע' : 'חדש'}
            </Badge>
            <span
              className="text-xs px-2 py-0.5 rounded-md font-medium border"
              style={{ background: tint.bg, color: tint.text, borderColor: tint.border }}
            >
              {note.author_name}
            </span>
            <span className="text-xs text-muted">
              · {created}
              {wasEdited && <span className="text-faint italic ms-1">(נערך)</span>}
            </span>
          </div>
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

        {!confirmDelete && !editing && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button variant={isDone ? 'ghost' : 'primary'} onClick={toggleStatus} disabled={busy}>
              {busy ? '...' : isDone ? 'החזר לחדש' : 'סמן כבוצע'}
            </Button>
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
