import { useReducer, useRef, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Part } from '../types/parts'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { useAuthStore } from '../store/auth'
import {
  changePartQuantity,
  setPartQuantity,
  updatePart,
  type PartUpdates,
} from '../lib/warehouseActions'

interface Filters {
  sku: string
  name: string
  warehouse: string
  cabinet: string
  storage_type: string
  storage_number: string
  cell_number: string
}

const EMPTY_FILTERS: Filters = {
  sku: '', name: '', warehouse: '', cabinet: '',
  storage_type: '', storage_number: '', cell_number: '',
}

function isActive(f: Filters): boolean {
  return Object.values(f).some((v) => v.trim() !== '')
}

function formatLocation(p: Part): string {
  const parts: string[] = []
  if (p.warehouse) parts.push(p.warehouse)
  if (p.cabinet != null && p.cabinet !== 0)               parts.push(`ארון ${p.cabinet}`)
  if (p.storage_type)                                     parts.push(p.storage_type)
  if (p.storage_number != null && p.storage_number !== 0) parts.push(`#${p.storage_number}`)
  if (p.cell_number != null && p.cell_number !== 0)       parts.push(`תא ${p.cell_number}`)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

function uniqueValues<T>(items: T[], get: (t: T) => string | number | null | undefined): string[] {
  const set = new Set<string>()
  for (const it of items) {
    const v = get(it)
    if (v == null || v === '') continue
    set.add(String(v))
  }
  return [...set].sort()
}

export function PartsCatalogList({ parts }: { parts: Part[] }) {
  const employee = useAuthStore((s) => s.employee)
  const canEdit = employee?.permissions === 'warehouse' || employee?.permissions === 'manager'

  const [f, setF] = useState<Filters>(EMPTY_FILTERS)

  const warehouses    = useMemo(() => uniqueValues(parts, (p) => p.warehouse),    [parts])
  const storageTypes  = useMemo(() => uniqueValues(parts, (p) => p.storage_type), [parts])

  const filtered = useMemo(() => {
    if (!isActive(f)) return []
    const sku   = f.sku.trim().toLowerCase()
    const name  = f.name.trim().toLowerCase()
    const cab   = f.cabinet.trim()
    const stnum = f.storage_number.trim()
    const cell  = f.cell_number.trim()
    return parts.filter((p) => {
      if (sku  && !p.sku.toLowerCase().includes(sku))   return false
      if (name && !p.name.toLowerCase().includes(name)) return false
      if (f.warehouse    && p.warehouse    !== f.warehouse)    return false
      if (f.storage_type && p.storage_type !== f.storage_type) return false
      if (cab   && String(p.cabinet ?? '')        !== cab)   return false
      if (stnum && String(p.storage_number ?? '') !== stnum) return false
      if (cell  && String(p.cell_number ?? '')    !== cell)  return false
      return true
    })
  }, [parts, f])

  const active = isActive(f)
  const VISIBLE_LIMIT = 100

  return (
    <Card>
      <CardHeader>
        <ComponentBadge id={4002} />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-foreground">קטלוג חלקים</h3>
          <span className="text-xs text-muted">
            {active ? `${filtered.length} מתוך ${parts.length} פריטים` : `${parts.length} פריטים בקטלוג`}
          </span>
        </div>
      </CardHeader>

      <CardBody className="border-b border-border bg-muted-surface flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="חיפוש מק״ט" name="filter-sku" value={f.sku}
                 onChange={(e) => setF({ ...f, sku: e.target.value })} placeholder="034910308" />
          <Input label="חיפוש שם" name="filter-name" value={f.name}
                 onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="אגן / מצנן..." />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <FilterSelect label="מחסן" value={f.warehouse} options={warehouses}
                        onChange={(v) => setF({ ...f, warehouse: v })} />
          <Input label="ארון" name="filter-cabinet" value={f.cabinet}
                 onChange={(e) => setF({ ...f, cabinet: e.target.value })} type="number" />
          <FilterSelect label="סוג מאחסן" value={f.storage_type} options={storageTypes}
                        onChange={(v) => setF({ ...f, storage_type: v })} />
          <Input label="מספר מאחסן" name="filter-stnum" value={f.storage_number}
                 onChange={(e) => setF({ ...f, storage_number: e.target.value })} type="number" />
          <Input label="מספר תא" name="filter-cell" value={f.cell_number}
                 onChange={(e) => setF({ ...f, cell_number: e.target.value })} type="number" />
        </div>

        {active && (
          <button
            type="button"
            onClick={() => setF(EMPTY_FILTERS)}
            className="text-xs text-primary self-end hover:underline"
          >
            נקה סינון
          </button>
        )}
      </CardBody>

      <CardBody className="p-0">
        {!active && (
          <p className="text-sm text-muted text-center py-6">
            הזן ערך באחד משדות הסינון כדי להציג פריטים. {parts.length.toLocaleString('he-IL')} פריטים בקטלוג.
          </p>
        )}

        {active && filtered.length === 0 && (
          <p className="text-sm text-muted text-center py-4">לא נמצאו פריטים שתואמים לסינון</p>
        )}

        {active && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="text-start font-medium px-3 py-2">מק"ט</th>
                  <th className="text-start font-medium px-3 py-2">שם</th>
                  <th className="text-start font-medium px-3 py-2">מלאי</th>
                  <th className="text-start font-medium px-3 py-2">סף נמוך</th>
                  <th className="text-start font-medium px-3 py-2">מיקום</th>
                  {canEdit && <th className="px-3 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, VISIBLE_LIMIT).map((p) => (
                  <PartRow
                    key={p.id}
                    part={p}
                    canEdit={canEdit}
                    employeeNumber={employee?.employee_number}
                  />
                ))}
              </tbody>
            </table>
            {filtered.length > VISIBLE_LIMIT && (
              <p className="text-xs text-muted text-center py-2 border-t border-border">
                מוצגים {VISIBLE_LIMIT} מתוך {filtered.length} — צמצם את הסינון לראות יותר.
              </p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// ---------- single row with quick-edit + full-edit ----------

interface RowProps {
  part: Part
  canEdit: boolean
  employeeNumber: number | undefined
}

function PartRow({ part, canEdit, employeeNumber }: RowProps) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const low = part.quantity <= part.min_threshold

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['parts'] })
  }

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="px-3 py-2 text-muted font-mono text-xs whitespace-nowrap align-middle">{part.sku}</td>
        <td className="px-3 py-2 text-foreground align-middle">{part.name}</td>
        <td className="px-3 py-2 align-middle">
          {canEdit && employeeNumber != null
            ? <QuantityCell part={part} employeeNumber={employeeNumber} onChange={refresh} low={low} />
            : (low
                ? <Badge tone="warning">{part.quantity}</Badge>
                : <span className="text-foreground">{part.quantity}</span>)}
        </td>
        <td className="px-3 py-2 text-muted align-middle">{part.min_threshold}</td>
        <td className="px-3 py-2 text-muted align-middle whitespace-nowrap">{formatLocation(part)}</td>
        {canEdit && (
          <td className="px-2 py-2 align-middle">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="relative inline-flex items-center justify-center w-7 h-7 rounded-md text-muted hover:bg-muted-surface hover:text-foreground"
              title={expanded ? 'סגור עריכה' : 'ערוך פריט'}
              aria-label="ערוך פריט"
            >
              <ComponentBadge id={4006} />
              {expanded ? '✕' : '✎'}
            </button>
          </td>
        )}
      </tr>
      {expanded && employeeNumber != null && (
        <tr className="bg-muted-surface">
          <td colSpan={canEdit ? 6 : 5} className="px-3 py-3">
            <PartEditForm
              part={part}
              employeeNumber={employeeNumber}
              onDone={() => { setExpanded(false); refresh() }}
              onCancel={() => setExpanded(false)}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ---------- inline quantity editor (optimistic + debounced) ----------
//
// UX requirements:
//   * Each +/- click feels instant.
//   * Several rapid clicks coalesce into a single server call.
//   * Typed-absolute commits override any pending delta.
//   * If the server rejects the change, the optimistic value rolls back.
//
// Implementation: pending state lives in a ref so the debounced flush
// always reads the latest value. A `tick` reducer triggers re-renders
// when the ref changes.

const FLUSH_DELAY_MS = 400

interface PendingState {
  delta: number
  abs:   number | null
}

function QuantityCell({
  part, employeeNumber, onChange, low,
}: {
  part: Part
  employeeNumber: number
  onChange: () => void
  low: boolean
}) {
  const pending  = useRef<PendingState>({ delta: 0, abs: null })
  const flushT   = useRef<number | null>(null)
  const lastErr  = useRef<string | null>(null)
  const inFlight = useRef<boolean>(false)
  const [, force] = useReducer((x) => x + 1, 0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const displayQty = pending.current.abs ?? Math.max(0, part.quantity + pending.current.delta)

  function scheduleFlush() {
    if (flushT.current) window.clearTimeout(flushT.current)
    flushT.current = window.setTimeout(flush, FLUSH_DELAY_MS)
  }

  function bump(d: number) {
    if (pending.current.abs !== null) {
      pending.current = { delta: (pending.current.abs + d) - part.quantity, abs: null }
    } else {
      pending.current.delta += d
    }
    lastErr.current = null
    force()
    scheduleFlush()
  }

  function setAbs(v: number) {
    pending.current = { delta: 0, abs: v }
    lastErr.current = null
    force()
    scheduleFlush()
  }

  async function flush() {
    if (inFlight.current) {
      // Server still busy — push the next attempt out a bit.
      scheduleFlush()
      return
    }
    const snap = pending.current
    if (snap.abs === null && snap.delta === 0) return

    inFlight.current = true
    pending.current = { delta: 0, abs: null }
    force()

    const res = snap.abs !== null
      ? await setPartQuantity(employeeNumber, part.id, snap.abs)
      : await changePartQuantity(employeeNumber, part.id, snap.delta)
    inFlight.current = false

    if (!res.ok) {
      // Re-apply the snapshot on top of any newer pending edits.
      pending.current = {
        delta: pending.current.delta + (snap.abs === null ? snap.delta : 0),
        abs:   pending.current.abs ?? snap.abs,
      }
      lastErr.current = 'שגיאה'
      force()
      return
    }
    onChange()
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseInt(draft, 10)
          setEditing(false)
          if (!Number.isNaN(n) && n >= 0 && n !== displayQty) setAbs(n)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setEditing(false) }
        }}
        className="w-16 px-2 py-1 bg-card border border-primary rounded-md text-foreground"
      />
    )
  }

  const dirty = pending.current.abs !== null || pending.current.delta !== 0
  const cellTone = lastErr.current
    ? 'bg-danger/10 text-danger'
    : low
      ? 'bg-warning/15 text-warning'
      : dirty
        ? 'bg-info/10 text-info'
        : 'text-foreground hover:bg-muted-surface'

  return (
    <div className="inline-flex items-center gap-1">
      <span className="contents">
        <ComponentBadge id={4004} />
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={displayQty <= 0}
          className="w-6 h-6 inline-flex items-center justify-center rounded-md border border-border text-muted hover:bg-muted-surface disabled:opacity-30"
          title="הפחת 1"
        >−</button>
      </span>
      <button
        type="button"
        onClick={() => { setDraft(String(displayQty)); setEditing(true) }}
        title="לחץ לעריכה"
        className={`min-w-[2.5rem] px-2 py-0.5 rounded-md text-center font-medium ${cellTone}`}
      >
        {displayQty}
      </button>
      <span className="contents">
        <ComponentBadge id={4005} />
        <button
          type="button"
          onClick={() => bump(+1)}
          className="w-6 h-6 inline-flex items-center justify-center rounded-md border border-border text-muted hover:bg-muted-surface"
          title="הוסף 1"
        >+</button>
      </span>
      {lastErr.current && <span className="text-xs text-danger ms-1">{lastErr.current}</span>}
    </div>
  )
}

// ---------- full-row edit form ----------

function PartEditForm({
  part, employeeNumber, onDone, onCancel,
}: {
  part: Part
  employeeNumber: number
  onDone: () => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState({
    name:           part.name,
    sku:            part.sku,
    quantity:       String(part.quantity),
    min_threshold:  String(part.min_threshold),
    warehouse:      part.warehouse        ?? '',
    cabinet:        part.cabinet         != null ? String(part.cabinet)         : '',
    storage_type:   part.storage_type     ?? '',
    storage_number: part.storage_number  != null ? String(part.storage_number)  : '',
    cell_number:    part.cell_number     != null ? String(part.cell_number)     : '',
    is_exchange:    part.is_exchange,
    supplier:       part.supplier         ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  function nullableInt(s: string): number | null {
    const t = s.trim()
    if (!t) return null
    const n = parseInt(t, 10)
    return Number.isNaN(n) ? null : n
  }

  async function save() {
    setError(null)
    if (!draft.name.trim()) { setError('שם חובה'); return }
    const q = parseInt(draft.quantity, 10)
    if (Number.isNaN(q) || q < 0) { setError('כמות לא תקינה'); return }
    const m = parseInt(draft.min_threshold, 10)
    if (Number.isNaN(m) || m < 0) { setError('סף מינימום לא תקין'); return }

    const updates: PartUpdates = {
      name:           draft.name.trim(),
      sku:            draft.sku.trim(),
      quantity:       q,
      min_threshold:  m,
      warehouse:      draft.warehouse.trim()    || null,
      cabinet:        nullableInt(draft.cabinet),
      storage_type:   draft.storage_type.trim() || null,
      storage_number: nullableInt(draft.storage_number),
      cell_number:    nullableInt(draft.cell_number),
      is_exchange:    draft.is_exchange,
      supplier:       draft.supplier.trim() || null,
    }

    setBusy(true)
    const res = await updatePart(employeeNumber, part.id, updates)
    setBusy(false)
    if (!res.ok) { setError('שגיאה בעדכון'); return }
    onDone()
  }

  return (
    <div className="flex flex-col gap-3">
      <ComponentBadge id={4007} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="שם פריט" name="ed-name" value={draft.name} onChange={(e) => set('name', e.target.value)} />
        <Input label="מק״ט" name="ed-sku" value={draft.sku} onChange={(e) => set('sku', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Input label="כמות" name="ed-qty" type="number" value={draft.quantity} onChange={(e) => set('quantity', e.target.value)} />
        <Input label="סף מינימום" name="ed-min" type="number" value={draft.min_threshold} onChange={(e) => set('min_threshold', e.target.value)} />
        <Input label="ספק" name="ed-supplier" value={draft.supplier} onChange={(e) => set('supplier', e.target.value)} />
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">פריט בתמורה</span>
          <select
            value={draft.is_exchange ? 'yes' : 'no'}
            onChange={(e) => set('is_exchange', e.target.value === 'yes')}
            className="px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="no">לא</option>
            <option value="yes">כן</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Input label="מחסן" name="ed-wh" value={draft.warehouse} onChange={(e) => set('warehouse', e.target.value)} />
        <Input label="ארון" name="ed-cab" type="number" value={draft.cabinet} onChange={(e) => set('cabinet', e.target.value)} />
        <Input label="סוג מאחסן" name="ed-stype" value={draft.storage_type} onChange={(e) => set('storage_type', e.target.value)} />
        <Input label="מספר מאחסן" name="ed-snum" type="number" value={draft.storage_number} onChange={(e) => set('storage_number', e.target.value)} />
        <Input label="מספר תא" name="ed-cell" type="number" value={draft.cell_number} onChange={(e) => set('cell_number', e.target.value)} />
      </div>
      <div className="flex gap-2 items-center">
        <Button onClick={save} disabled={busy}>{busy ? 'שומר...' : 'שמור'}</Button>
        <Button variant="ghost" onClick={onCancel}>ביטול</Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  )
}

// ---------- helpers ----------

function FilterSelect({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">— הכל —</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}
