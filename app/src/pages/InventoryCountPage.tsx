import { useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useParts } from '../hooks/useParts'
import { useAuthStore } from '../store/auth'
import { AppHeader } from '../components/AppHeader'
import { ExchangeBadge } from '../components/ExchangeBadge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { Part } from '../types/parts'

// --------------- localStorage persistence ---------------

const LS_SESSION   = 'ic_session'
const LS_ENTRIES   = 'ic_entries'
const LS_NOTES     = 'ic_notes'

interface IcSession {
  id: string
  openedBy: number
  openedAt: string
  status: 'open' | 'closed'
}

interface IcEntry {
  partId:         string
  countedQty:     number
  expectedQty:    number
  countedBy:      number
  countedAt:      string
  note:           string
}

interface IcNote {
  id:        string
  text:      string
  author:    string
  createdAt: string
}

function loadSession(): IcSession | null {
  try { const r = localStorage.getItem(LS_SESSION); return r ? JSON.parse(r) : null } catch { return null }
}
function saveSession(s: IcSession | null) {
  if (s) localStorage.setItem(LS_SESSION, JSON.stringify(s))
  else   localStorage.removeItem(LS_SESSION)
}

function loadEntries(): Map<string, IcEntry> {
  try {
    const r = localStorage.getItem(LS_ENTRIES)
    if (!r) return new Map()
    const arr: [string, IcEntry][] = JSON.parse(r)
    return new Map(arr)
  } catch { return new Map() }
}
function saveEntries(m: Map<string, IcEntry>) {
  localStorage.setItem(LS_ENTRIES, JSON.stringify([...m.entries()]))
}

function loadNotes(): IcNote[] {
  try { const r = localStorage.getItem(LS_NOTES); return r ? JSON.parse(r) : [] } catch { return [] }
}
function saveNotes(n: IcNote[]) {
  localStorage.setItem(LS_NOTES, JSON.stringify(n))
}

// --------------- location helpers ---------------

function locKey(p: Part): string {
  return [p.warehouse ?? '', p.cabinet ?? '', p.storage_type ?? '', p.storage_number ?? '', p.cell_number ?? ''].join('|')
}

function locLabel(p: Part): string {
  const parts: string[] = []
  if (p.warehouse)                                     parts.push(p.warehouse)
  if (p.cabinet != null && p.cabinet !== 0)            parts.push(`ארון ${p.cabinet}`)
  if (p.storage_type)                                  parts.push(p.storage_type)
  if (p.storage_number != null && p.storage_number !== 0) parts.push(`#${p.storage_number}`)
  if (p.cell_number != null && p.cell_number !== 0)    parts.push(`תא ${p.cell_number}`)
  return parts.length > 0 ? parts.join(' · ') : 'ללא מיקום'
}

interface LocGroup {
  key:    string
  label:  string
  parts:  Part[]
}

// --------------- page ---------------

export function InventoryCountPage() {
  const employee = useAuthStore((s) => s.employee)!
  const { data: allParts, isLoading } = useParts()

  const [session, setSessionState] = useState<IcSession | null>(() => loadSession())
  const [entries, setEntriesState] = useState<Map<string, IcEntry>>(() => loadEntries())
  const [notes, setNotesState]     = useState<IcNote[]>(() => loadNotes())

  function setSession(s: IcSession | null) { setSessionState(s); saveSession(s) }
  function setEntries(m: Map<string, IcEntry>) { setEntriesState(m); saveEntries(m) }
  function setNotes(n: IcNote[]) { setNotesState(n); saveNotes(n) }

  // drill-down state
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null)
  const [skuSearch, setSkuSearch]     = useState('')

  // group parts by location
  const locations: LocGroup[] = useMemo(() => {
    const map = new Map<string, LocGroup>()
    for (const p of allParts ?? []) {
      const k = locKey(p)
      const existing = map.get(k)
      if (existing) { existing.parts.push(p); continue }
      map.set(k, { key: k, label: locLabel(p), parts: [p] })
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'he'))
  }, [allParts])

  const selectedGroup = selectedLoc ? locations.find((g) => g.key === selectedLoc) ?? null : null

  // SKU search across all parts
  const skuMatches = useMemo(() => {
    const q = skuSearch.trim().replace(/\D/g, '')
    if (!q || q.length < 2) return []
    return (allParts ?? []).filter((p) => p.sku.replace(/\D/g, '').startsWith(q)).slice(0, 20)
  }, [allParts, skuSearch])

  // session actions
  function openSession() {
    const s: IcSession = {
      id: `ic-${Date.now()}`,
      openedBy: employee.employee_number,
      openedAt: new Date().toISOString(),
      status: 'open',
    }
    setSession(s)
    setEntries(new Map())
  }

  function toggleSessionStatus() {
    if (!session) return
    setSession({ ...session, status: session.status === 'open' ? 'closed' : 'open' })
  }

  const [confirmReset, setConfirmReset] = useState(false)
  function resetSession() {
    setSession(null)
    setEntries(new Map())
    setConfirmReset(false)
  }

  // entry actions
  const upsertEntry = useCallback((part: Part, countedQty: number, note: string) => {
    const next = new Map(entries)
    next.set(part.id, {
      partId:      part.id,
      countedQty,
      expectedQty: part.quantity,
      countedBy:   employee.employee_number,
      countedAt:   new Date().toISOString(),
      note,
    })
    setEntries(next)
  }, [entries, employee.employee_number, setEntries])

  // notes
  const [noteText, setNoteText] = useState('')
  function addNote() {
    if (!noteText.trim()) return
    const n: IcNote = {
      id: `n-${Date.now()}`,
      text: noteText.trim(),
      author: employee.name,
      createdAt: new Date().toISOString(),
    }
    setNotes([n, ...notes])
    setNoteText('')
  }

  // stats
  const totalParts = (allParts ?? []).length
  const countedCount = entries.size
  const withDelta = [...entries.values()].filter((e) => e.countedQty !== e.expectedQty).length

  return (
    <>
      <AppHeader subtitle="ספירת מלאי" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4 pb-24">
        <Link to="/warehouse" className="self-start text-sm text-primary hover:underline">
          → חזור למחסנאי
        </Link>

        <div className="bg-warning/10 border border-warning/30 rounded-md px-3 py-2 text-xs text-warning font-medium text-center">
          מצב פיתוח — הנתונים נשמרים בדפדפן בלבד ולא משפיעים על הקטלוג
        </div>

        {isLoading && <p className="text-sm text-muted text-center py-8">טוען קטלוג...</p>}

        {/* Session control */}
        {!session && (
          <Card>
            <CardBody className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted">אין ספירה פעילה</p>
              <Button onClick={openSession}>פתח ספירת מלאי חדשה</Button>
            </CardBody>
          </Card>
        )}

        {session && (
          <>
            {/* Stats bar */}
            <Card>
              <CardBody className="flex items-center justify-between gap-3 flex-wrap text-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${session.status === 'open' ? 'bg-success/15 text-success' : 'bg-muted-surface text-muted'}`}>
                    {session.status === 'open' ? 'ספירה פעילה' : 'ספירה סגורה'}
                  </span>
                  <span className="text-muted">נספרו: <span className="font-semibold text-foreground">{countedCount}</span> / {totalParts}</span>
                  {withDelta > 0 && (
                    <span className="text-warning">פערים: <span className="font-semibold">{withDelta}</span></span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={toggleSessionStatus} className="text-xs px-3 py-1">
                    {session.status === 'open' ? 'סגור ספירה' : 'פתח מחדש'}
                  </Button>
                  {!confirmReset ? (
                    <Button variant="ghost" onClick={() => setConfirmReset(true)} className="text-xs px-3 py-1 text-danger">
                      אפס הכל
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 bg-danger/5 rounded-md px-2 py-1">
                      <span className="text-[11px] text-danger">פעולה זו אינה הפיכה</span>
                      <Button onClick={resetSession} className="text-[11px] px-2 py-0.5 bg-danger hover:bg-danger/90 text-white">
                        אשר
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmReset(false)} className="text-[11px] px-2 py-0.5">
                        בטל
                      </Button>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* SKU quick search */}
            <Card>
              <CardBody className="flex flex-col gap-2">
                <Input
                  label="חיפוש מהיר לפי מק״ט"
                  name="ic-sku-search"
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  placeholder="הקלד מק״ט..."
                />
                {skuMatches.length > 0 && (
                  <ul className="bg-card border border-border rounded-md max-h-48 overflow-y-auto">
                    {skuMatches.map((p) => (
                      <CountRow
                        key={p.id}
                        part={p}
                        entry={entries.get(p.id)}
                        sessionOpen={session.status === 'open'}
                        onSave={upsertEntry}
                      />
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            {/* Location drill-down */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-foreground">ספירה לפי מיקום</h3>
              </CardHeader>
              <CardBody className="flex flex-col gap-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-60 overflow-y-auto">
                  {locations.map((g) => {
                    const active = selectedLoc === g.key
                    const countedInGroup = g.parts.filter((p) => entries.has(p.id)).length
                    const allCounted = countedInGroup === g.parts.length && g.parts.length > 0
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setSelectedLoc(active ? null : g.key)}
                        aria-expanded={active}
                        className={`text-start rounded-md px-2 py-2 text-xs transition-colors border ${
                          active
                            ? 'bg-primary/10 border-primary border-2 font-semibold'
                            : allCounted
                              ? 'bg-success/5 border-success/40 text-success'
                              : 'bg-card border-border hover:bg-muted-surface'
                        }`}
                      >
                        <div className="truncate text-foreground">{g.label}</div>
                        <div className="text-muted mt-0.5">
                          {countedInGroup}/{g.parts.length} נספרו
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardBody>
            </Card>

            {/* Parts in selected location */}
            {selectedGroup && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{selectedGroup.label}</h3>
                    <span className="text-xs text-muted">{selectedGroup.parts.length} פריטים</span>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <ul>
                    {selectedGroup.parts
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name, 'he'))
                      .map((p) => (
                        <CountRow
                          key={p.id}
                          part={p}
                          entry={entries.get(p.id)}
                          sessionOpen={session.status === 'open'}
                          onSave={upsertEntry}
                        />
                      ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {/* Report summary (live) */}
            {countedCount > 0 && (
              <ReportSummary allParts={allParts ?? []} entries={entries} />
            )}

            {/* Notes */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-foreground">הערות ספירה</h3>
              </CardHeader>
              <CardBody className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                    placeholder="הערה לגבי הספירה..."
                    className="flex-1 px-3 py-2 bg-card border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  />
                  <Button onClick={addNote} disabled={!noteText.trim()} className="self-end">
                    הוסף
                  </Button>
                </div>
                {notes.length > 0 && (
                  <ul className="flex flex-col gap-1.5 mt-2">
                    {notes.map((n) => (
                      <li key={n.id} className="text-xs bg-muted-surface rounded px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{n.author}</span>
                          <span className="text-muted">{new Date(n.createdAt).toLocaleString('he-IL')}</span>
                        </div>
                        <p className="text-foreground mt-0.5 whitespace-pre-wrap">{n.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </>
        )}

        {/* Scroll-to-top */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="self-center text-xs px-4 py-2 rounded-md border border-border bg-card text-muted hover:bg-muted-surface"
        >
          ↑ חזרה לראש הדף
        </button>
      </main>
    </>
  )
}

// --------------- count row ---------------

function CountRow({
  part, entry, sessionOpen, onSave,
}: {
  part:        Part
  entry:       IcEntry | undefined
  sessionOpen: boolean
  onSave:      (part: Part, qty: number, note: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [qty, setQty]     = useState(entry?.countedQty?.toString() ?? '')
  const [note, setNote]   = useState(entry?.note ?? '')

  const counted = entry != null
  const hasDelta = counted && entry!.countedQty !== entry!.expectedQty
  const delta = counted ? entry!.countedQty - entry!.expectedQty : 0

  function save() {
    const n = parseInt(qty, 10)
    if (!Number.isFinite(n) || n < 0) return
    onSave(part, n, note.trim())
    setEditing(false)
  }

  function startEdit() {
    setQty(entry?.countedQty?.toString() ?? part.quantity.toString())
    setNote(entry?.note ?? '')
    setEditing(true)
  }

  return (
    <li className={`px-3 py-2 border-b border-border last:border-0 ${hasDelta ? 'bg-warning/5' : counted ? 'bg-success/5' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap flex-1">
          <span className="text-sm text-foreground font-medium truncate">{part.name}</span>
          <ExchangeBadge active={part.is_exchange} />
          <span className="font-mono text-[11px] text-muted">{part.sku}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs">
          <span className="text-muted">רשום: {part.quantity}</span>
          {counted && (
            <span className={hasDelta ? 'font-semibold text-warning' : 'text-success'}>
              נספר: {entry!.countedQty}
              {hasDelta && ` (${delta > 0 ? '+' : ''}${delta})`}
            </span>
          )}
        </div>
      </div>

      {!editing && sessionOpen && (
        <div className="mt-1">
          <button
            type="button"
            onClick={startEdit}
            className="text-xs text-primary hover:underline"
          >
            {counted ? 'ערוך ספירה' : 'ספור'}
          </button>
        </div>
      )}

      {editing && (
        <div className="flex items-end gap-2 mt-2 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted">כמות שנספרה</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-20 px-2 py-1 bg-card border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[8rem]">
            <label className="text-[11px] text-muted">הערה (אופציונלי)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-2 py-1 bg-card border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="הערה..."
            />
          </div>
          <Button onClick={save} className="text-xs px-3 py-1">שמור</Button>
          <Button variant="ghost" onClick={() => setEditing(false)} className="text-xs px-3 py-1">בטל</Button>
        </div>
      )}

      {counted && entry!.note && !editing && (
        <div className="text-[11px] text-muted mt-1">📝 {entry!.note}</div>
      )}
    </li>
  )
}

// --------------- report summary ---------------

function ReportSummary({ allParts, entries }: { allParts: Part[]; entries: Map<string, IcEntry> }) {
  const { matching, deltas, notCounted } = useMemo(() => {
    const matching:   Array<{ part: Part; entry: IcEntry }> = []
    const deltas:     Array<{ part: Part; entry: IcEntry; delta: number }> = []
    const notCounted: Part[] = []

    for (const p of allParts) {
      const e = entries.get(p.id)
      if (!e) { notCounted.push(p); continue }
      if (e.countedQty === e.expectedQty) matching.push({ part: p, entry: e })
      else deltas.push({ part: p, entry: e, delta: e.countedQty - e.expectedQty })
    }
    deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    return { matching, deltas, notCounted }
  }, [allParts, entries])

  const [showMatching, setShowMatching] = useState(false)

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-foreground">דוח ספירה (חי)</h3>
      </CardHeader>
      <CardBody className="flex flex-col gap-3 text-xs">
        {/* Deltas */}
        {deltas.length > 0 && (
          <div>
            <div className="font-semibold text-warning mb-1">פערים ({deltas.length})</div>
            <table className="w-full">
              <thead>
                <tr className="text-muted text-[11px] border-b border-border">
                  <th className="text-start py-1 font-medium">שם</th>
                  <th className="text-start py-1 font-medium">מק״ט</th>
                  <th className="text-start py-1 font-medium">רשום</th>
                  <th className="text-start py-1 font-medium">נספר</th>
                  <th className="text-start py-1 font-medium">פער</th>
                </tr>
              </thead>
              <tbody>
                {deltas.map(({ part, entry, delta }) => (
                  <tr key={part.id} className="border-b border-border last:border-0">
                    <td className="py-1 text-foreground">{part.name}</td>
                    <td className="py-1 font-mono text-muted">{part.sku}</td>
                    <td className="py-1 text-muted">{entry.expectedQty}</td>
                    <td className="py-1 text-foreground font-medium">{entry.countedQty}</td>
                    <td className={`py-1 font-semibold ${delta > 0 ? 'text-success' : 'text-danger'}`}>
                      {delta > 0 ? `+${delta}` : delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Not counted */}
        {notCounted.length > 0 && (
          <div>
            <div className="font-semibold text-danger mb-1">לא נספרו ({notCounted.length})</div>
            <p className="text-muted">
              {notCounted.length} פריטים ברשומים בקטלוג שלא נספרו עדיין.
            </p>
          </div>
        )}

        {/* Matching */}
        <div>
          <button
            type="button"
            onClick={() => setShowMatching((v) => !v)}
            className="font-semibold text-success hover:underline"
          >
            התאמה ({matching.length}) {showMatching ? '▴' : '▾'}
          </button>
          {showMatching && matching.length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5">
              {matching.map(({ part }) => (
                <li key={part.id} className="flex items-center justify-between gap-2 text-muted">
                  <span className="truncate">{part.name}</span>
                  <span className="font-mono shrink-0">{part.sku} · {part.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
