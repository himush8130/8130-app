import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Part } from '../types/parts'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { WarehouseSelect } from './WarehouseSelect'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { updatePart, type PartUpdates } from '../lib/warehouseActions'

export function PartEditForm({
  part, employeeNumber, onDone, onCancel,
}: {
  part: Part
  employeeNumber: number
  onDone: () => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
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
    queryClient.invalidateQueries({ queryKey: ['parts'] })
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
        <WarehouseSelect value={draft.warehouse} onChange={(v) => set('warehouse', v)} />
        <Input label="ארון" name="ed-cab" type="number" value={draft.cabinet} onChange={(e) => set('cabinet', e.target.value)} />
        <Input label="מאחסן" name="ed-stype" value={draft.storage_type} onChange={(e) => set('storage_type', e.target.value)} />
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
