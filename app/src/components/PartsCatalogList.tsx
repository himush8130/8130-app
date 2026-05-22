import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { Part } from '../types/parts'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { useAuthStore } from '../store/auth'
import { updatePart, setPartQuantity, createPart, type PartUpdates, type NewPartPayload } from '../lib/warehouseActions'
import { AddWarehouseOrderForm } from './AddWarehouseOrderForm'

interface Filters {
  sku: string
  name: string
  warehouse: string
  cabinet: string
  storage_type: string
  storage_number: string
  cell_number: string
  low_stock_only:    boolean
  sku_blocked_only:  boolean
}

const EMPTY_FILTERS: Filters = {
  sku: '', name: '', warehouse: '', cabinet: '',
  storage_type: '', storage_number: '', cell_number: '',
  low_stock_only: false,
  sku_blocked_only: false,
}

function isActive(f: Filters): boolean {
  if (f.low_stock_only || f.sku_blocked_only) return true
  const { low_stock_only: _, sku_blocked_only: __, ...textFilters } = f
  return Object.values(textFilters).some((v) => typeof v === 'string' && v.trim() !== '')
}

function locationLines(p: Part): string[] {
  const out: string[] = []
  if (p.warehouse) out.push(p.warehouse)
  if (p.cabinet != null && p.cabinet !== 0)               out.push(`ארון ${p.cabinet}`)
  if (p.storage_type)                                     out.push(p.storage_type)
  if (p.storage_number != null && p.storage_number !== 0) out.push(`#${p.storage_number}`)
  if (p.cell_number != null && p.cell_number !== 0)       out.push(`תא ${p.cell_number}`)
  return out
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
  const queryClient = useQueryClient()

  const [adding, setAdding] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [f, setF] = useState<Filters>(() => ({
    ...EMPTY_FILTERS,
    low_stock_only:   searchParams.get('low_stock') === '1',
    sku_blocked_only: searchParams.get('sku_blocked') === '1',
  }))

  // URL → state. Lets clicks on links like /warehouse?sku_blocked=1
  // (e.g. from the home-page tables) flip the right toggle even when
  // the component is already mounted, then scroll the catalog into
  // view so the user actually sees the filtered list.
  useEffect(() => {
    const fromUrlLow     = searchParams.get('low_stock') === '1'
    const fromUrlBlocked = searchParams.get('sku_blocked') === '1'
    setF((prev) => {
      if (prev.low_stock_only === fromUrlLow && prev.sku_blocked_only === fromUrlBlocked) {
        return prev
      }
      return { ...prev, low_stock_only: fromUrlLow, sku_blocked_only: fromUrlBlocked }
    })
    if (fromUrlLow || fromUrlBlocked) {
      // Defer to next tick so the new filtered list is rendered before scrolling.
      setTimeout(() => {
        document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }, [searchParams])

  // State → URL: keep the URL in sync with toggle filters so deep-links
  // and the back-button remain meaningful.
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (f.low_stock_only)   next.set('low_stock', '1');   else next.delete('low_stock')
    if (f.sku_blocked_only) next.set('sku_blocked', '1'); else next.delete('sku_blocked')
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.low_stock_only, f.sku_blocked_only])

  const warehouses    = useMemo(() => uniqueValues(parts, (p) => p.warehouse),    [parts])
  const storageTypes  = useMemo(() => uniqueValues(parts, (p) => p.storage_type), [parts])

  const filtered = useMemo(() => {
    if (!isActive(f)) return []
    const sku   = f.sku.trim().replace(/\D/g, '')
    const name  = f.name.trim().toLowerCase()
    const cab   = f.cabinet.trim()
    const stnum = f.storage_number.trim()
    const cell  = f.cell_number.trim()
    return parts.filter((p) => {
      const partSku = (p.sku ?? '').replace(/\D/g, '')
      if (sku  && !partSku.startsWith(sku)) return false
      if (name && !p.name.toLowerCase().includes(name)) return false
      if (f.warehouse    && p.warehouse    !== f.warehouse)    return false
      if (f.storage_type && p.storage_type !== f.storage_type) return false
      if (cab   && String(p.cabinet ?? '')        !== cab)   return false
      if (stnum && String(p.storage_number ?? '') !== stnum) return false
      if (cell  && String(p.cell_number ?? '')    !== cell)  return false
      if (f.low_stock_only   && !(p.quantity < p.min_threshold)) return false
      if (f.sku_blocked_only && !p.is_sku_blocked)                return false
      return true
    })
  }, [parts, f])

  const active = isActive(f)
  const VISIBLE_LIMIT = 100

  return (
    <Card id="catalog">
      <CardHeader>
        <ComponentBadge id={4002} />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">קטלוג חלקים</h3>
          {canEdit && (
            <div className="flex gap-1.5 flex-wrap">
              {!ordering && !adding && (
                <Button variant="secondary" onClick={() => setOrdering(true)}>+ הזמנת מחסן כללית</Button>
              )}
              {!adding && !ordering && (
                <Button onClick={() => setAdding(true)}>+ הוסף חלק חדש</Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {adding && employee?.employee_number != null && (
        <CardBody className="border-b border-border bg-muted-surface">
          <AddPartForm
            employeeNumber={employee.employee_number}
            filters={f}
            onDone={(createdSku) => {
              setAdding(false)
              queryClient.invalidateQueries({ queryKey: ['parts'] })
              // The catalog list is hidden until at least one filter
              // field has a value. Without this the warehouse worker
              // sees the form close and nothing new appear, and
              // believes the create silently failed. Surface the new
              // part by seeding the sku filter with what they just
              // typed.
              if (createdSku) setF((cur) => ({ ...cur, sku: createdSku }))
            }}
            onCancel={() => setAdding(false)}
          />
        </CardBody>
      )}

      {ordering && (
        <CardBody className="border-b border-border bg-muted-surface">
          <AddWarehouseOrderForm
            onDone={() => setOrdering(false)}
            onCancel={() => setOrdering(false)}
          />
        </CardBody>
      )}

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

        <div className="flex items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={f.low_stock_only}
              onChange={(e) => setF({ ...f, low_stock_only: e.target.checked })}
              className="w-4 h-4 accent-danger"
            />
            <span>הצג רק פריטים מתחת לסף המינימום</span>
          </label>
          {active && (
            <button
              type="button"
              onClick={() => setF(EMPTY_FILTERS)}
              className="text-xs text-primary hover:underline"
            >
              נקה סינון
            </button>
          )}
        </div>
      </CardBody>

      <CardBody className="p-0">
        {!active && (
          <p className="text-sm text-muted text-center py-6">
            הזן ערך באחד משדות הסינון כדי להציג פריטים.
          </p>
        )}

        {active && filtered.length === 0 && (
          <p className="text-sm text-muted text-center py-4">לא נמצאו פריטים שתואמים לסינון</p>
        )}

        {active && filtered.length > 0 && (
          <div>
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col style={{ width: '26%' }} />
                <col style={{ width: '31%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr className="text-[11px] text-muted border-b border-border">
                  <th className="text-start font-medium px-2 py-1.5">מק״ט</th>
                  <th className="text-start font-medium px-2 py-1.5">שם</th>
                  <th className="text-start font-medium px-2 py-1.5">מלאי</th>
                  <th className="text-start font-medium px-2 py-1.5">מיקום</th>
                  <th className="text-start font-medium px-2 py-1.5">סף</th>
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
  const lines = locationLines(part)

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['parts'] })
  }

  return (
    <>
      <tr className={`border-b border-border last:border-0 ${part.is_sku_blocked ? 'bg-warning/5' : ''}`}>
        <td className="px-2 py-1.5 align-top">
          {canEdit ? (
            <span className="contents">
              <ComponentBadge id={4006} />
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="font-mono text-xs text-primary hover:underline break-all text-start"
                title={expanded ? 'סגור עריכה' : 'ערוך פריט'}
              >
                {part.sku}
              </button>
            </span>
          ) : (
            <span className="font-mono text-xs text-muted break-all">{part.sku}</span>
          )}
          {part.is_sku_blocked && (
            <div className="mt-1"><Badge tone="warning">⚠ חסום</Badge></div>
          )}
        </td>
        <td className="px-2 py-1.5 text-foreground align-top break-words">{part.name}</td>
        <td className="px-2 py-1.5 align-top whitespace-nowrap">
          {canEdit && employeeNumber != null
            ? <StockCell part={part} employeeNumber={employeeNumber} low={low} onChange={refresh} />
            : <span className={low ? 'text-danger font-medium' : 'text-foreground'}>{part.quantity}</span>}
        </td>
        <td className="px-2 py-1.5 text-muted align-top">
          {lines.length === 0 ? (
            '—'
          ) : (
            <div className="flex flex-col gap-0.5">
              {lines.map((line, i) => <span key={i}>{line}</span>)}
            </div>
          )}
        </td>
        <td className="px-2 py-1.5 text-muted align-top whitespace-nowrap">{part.min_threshold}</td>
      </tr>
      {expanded && employeeNumber != null && (
        <tr className="bg-muted-surface">
          <td colSpan={5} className="px-3 py-3">
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

// ---------- inline stock editor ----------
//
// Click the number → opens an input with the current value. Enter or
// blur commits via setPartQuantity (absolute). Escape cancels.
function StockCell({
  part, employeeNumber, low, onChange,
}: {
  part: Part
  employeeNumber: number
  low: boolean
  onChange: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(part.quantity))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function start() {
    setDraft(String(part.quantity))
    setError(null)
    setEditing(true)
  }

  async function commit() {
    setEditing(false)
    const n = parseInt(draft, 10)
    if (Number.isNaN(n) || n < 0 || n === part.quantity) return
    setBusy(true)
    setError(null)
    const res = await setPartQuantity(employeeNumber, part.id, n)
    setBusy(false)
    if (!res.ok) { setError('שגיאה'); return }
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
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="w-14 px-1 py-0.5 text-xs bg-card border border-primary rounded"
      />
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        title="לחץ לעדכון מלאי"
        className={`hover:underline ${low ? 'text-danger font-medium' : 'text-foreground'}`}
      >
        {busy ? '…' : part.quantity}
      </button>
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </span>
  )
}

// (Inline +/- quantity editor removed per user request — quantity is
// edited via the PartEditForm reached by clicking the SKU cell.)


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
    is_sku_blocked: part.is_sku_blocked,
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
      is_sku_blocked: draft.is_sku_blocked,
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
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">מק״ט חסום</span>
          <select
            value={draft.is_sku_blocked ? 'yes' : 'no'}
            onChange={(e) => set('is_sku_blocked', e.target.value === 'yes')}
            className="px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="no">לא</option>
            <option value="yes">כן (יש לעדכן מק״ט חדש)</option>
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

// ---------- add new part ----------
//
// Pre-populates every field from the catalog's current filter values
// so a warehouse worker who already typed sku/name/location while
// searching doesn't have to retype them. Every field stays editable
// — the filter values are just defaults the user can adjust or
// extend before saving.

function AddPartForm({
  employeeNumber, filters, onDone, onCancel,
}: {
  employeeNumber: number
  filters: Filters
  onDone: (createdSku: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState({
    sku:            filters.sku.trim(),
    name:           filters.name.trim(),
    quantity:       '0',
    min_threshold:  '0',
    supplier:       '',
    is_exchange:    false,
    is_sku_blocked: false,
    warehouse:      filters.warehouse.trim(),
    cabinet:        filters.cabinet.trim(),
    storage_type:   filters.storage_type.trim(),
    storage_number: filters.storage_number.trim(),
    cell_number:    filters.cell_number.trim(),
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
    if (!draft.sku.trim())  { setError('מק״ט חובה'); return }
    if (!draft.name.trim()) { setError('שם חובה'); return }
    const q = parseInt(draft.quantity, 10)
    if (Number.isNaN(q) || q < 0) { setError('כמות לא תקינה'); return }
    const m = parseInt(draft.min_threshold, 10)
    if (Number.isNaN(m) || m < 0) { setError('סף מינימום לא תקין'); return }

    const payload: NewPartPayload = {
      sku:            draft.sku.trim(),
      name:           draft.name.trim(),
      quantity:       q,
      min_threshold:  m,
      supplier:       draft.supplier.trim() || null,
      is_exchange:    draft.is_exchange,
      is_sku_blocked: draft.is_sku_blocked,
      warehouse:      draft.warehouse.trim()    || null,
      cabinet:        nullableInt(draft.cabinet),
      storage_type:   draft.storage_type.trim() || null,
      storage_number: nullableInt(draft.storage_number),
      cell_number:    nullableInt(draft.cell_number),
    }

    setBusy(true)
    const res = await createPart(employeeNumber, payload)
    setBusy(false)
    if (!res.ok) { setError('שגיאה ביצירת פריט'); return }
    onDone(payload.sku)
  }

  return (
    <div className="flex flex-col gap-3">
      <ComponentBadge id={4014} />
      <p className="text-xs text-muted">
        השדות אוכלסו מראש מערכי הסינון — אפשר לערוך כל שדה ולהשלים שדות שלא מולאו.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="מק״ט" name="add-sku" value={draft.sku} onChange={(e) => set('sku', e.target.value)} autoFocus />
        <Input label="שם פריט" name="add-name" value={draft.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Input label="כמות" name="add-qty" type="number" value={draft.quantity} onChange={(e) => set('quantity', e.target.value)} />
        <Input label="סף מינימום" name="add-min" type="number" value={draft.min_threshold} onChange={(e) => set('min_threshold', e.target.value)} />
        <Input label="ספק" name="add-supplier" value={draft.supplier} onChange={(e) => set('supplier', e.target.value)} />
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
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">מק״ט חסום</span>
          <select
            value={draft.is_sku_blocked ? 'yes' : 'no'}
            onChange={(e) => set('is_sku_blocked', e.target.value === 'yes')}
            className="px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="no">לא</option>
            <option value="yes">כן</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Input label="מחסן" name="add-wh" value={draft.warehouse} onChange={(e) => set('warehouse', e.target.value)} />
        <Input label="ארון" name="add-cab" type="number" value={draft.cabinet} onChange={(e) => set('cabinet', e.target.value)} />
        <Input label="סוג מאחסן" name="add-stype" value={draft.storage_type} onChange={(e) => set('storage_type', e.target.value)} />
        <Input label="מספר מאחסן" name="add-snum" type="number" value={draft.storage_number} onChange={(e) => set('storage_number', e.target.value)} />
        <Input label="מספר תא" name="add-cell" type="number" value={draft.cell_number} onChange={(e) => set('cell_number', e.target.value)} />
      </div>
      <div className="flex gap-2 items-center">
        <Button onClick={save} disabled={busy}>{busy ? 'שומר...' : 'הוסף'}</Button>
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
