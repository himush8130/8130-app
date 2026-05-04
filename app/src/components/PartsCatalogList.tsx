import { useMemo, useState } from 'react'
import type { Part } from '../types/parts'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'
import { Input } from './ui/Input'
import { ComponentBadge } from '../feedback/ComponentBadge'

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
                  <th className="text-start font-medium px-4 py-2">מק"ט</th>
                  <th className="text-start font-medium px-4 py-2">שם</th>
                  <th className="text-start font-medium px-4 py-2">מלאי</th>
                  <th className="text-start font-medium px-4 py-2">סף נמוך</th>
                  <th className="text-start font-medium px-4 py-2">מיקום</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, VISIBLE_LIMIT).map((p) => {
                  const low = p.quantity <= p.min_threshold
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-muted font-mono text-xs whitespace-nowrap">{p.sku}</td>
                      <td className="px-4 py-2 text-foreground">{p.name}</td>
                      <td className="px-4 py-2">
                        {low
                          ? <Badge tone="warning">{p.quantity}</Badge>
                          : <span className="text-foreground">{p.quantity}</span>}
                      </td>
                      <td className="px-4 py-2 text-muted">{p.min_threshold}</td>
                      <td className="px-4 py-2 text-muted whitespace-nowrap">{formatLocation(p)}</td>
                    </tr>
                  )
                })}
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
