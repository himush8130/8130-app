import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useParts } from '../hooks/useParts'
import { useAuthStore } from '../store/auth'
import { createWarehouseOrder } from '../lib/warehouseActions'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { Part } from '../types/parts'

interface Draft {
  key:      string
  partId:   string
  sku:      string
  name:     string
  quantity: number
}

/**
 * Inline form for creating a "הזמנת מחסן כללית" — a parts order that
 * doesn't belong to any service call. Picks items from the existing
 * catalog (no free-form SKU here; that's what "+ הוסף חלק חדש" is for)
 * and submits them as a single warehouse_order with one
 * call_required_parts row per item in 'awaiting_order'.
 */
export function AddWarehouseOrderForm({
  onDone, onCancel,
}: {
  onDone: () => void
  onCancel: () => void
}) {
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const { data: catalog } = useParts()

  const [drafts, setDrafts] = useState<Draft[]>([])
  const [skuQ, setSkuQ] = useState('')
  const [nameQ, setNameQ] = useState('')
  const [qty, setQty] = useState('1')
  const [picked, setPicked] = useState<Part | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ display_id: string } | null>(null)

  const matches = useMemo(() => {
    const sku  = skuQ.trim().toLowerCase()
    const name = nameQ.trim().toLowerCase()
    if (!sku && !name) return []
    return (catalog ?? [])
      .filter((p) => (
        (!sku  || p.sku.toLowerCase().includes(sku)) &&
        (!name || p.name.toLowerCase().includes(name))
      ))
      .slice(0, 6)
  }, [catalog, skuQ, nameQ])

  function pick(p: Part) {
    setPicked(p); setSkuQ(p.sku); setNameQ(p.name)
  }

  function resetPickerRow() {
    setSkuQ(''); setNameQ(''); setQty('1'); setPicked(null)
  }

  function addPicked() {
    if (!picked) return
    const q = parseInt(qty, 10)
    if (Number.isNaN(q) || q <= 0) return
    setDrafts((d) => [...d, {
      key: `${Date.now()}-${picked.id}`,
      partId: picked.id, sku: picked.sku, name: picked.name, quantity: q,
    }])
    resetPickerRow()
  }

  function remove(key: string) {
    setDrafts((d) => d.filter((x) => x.key !== key))
  }

  async function submit() {
    setError(null); setResult(null)
    if (drafts.length === 0) { setError('הוסף לפחות חלק אחד'); return }
    setBusy(true)
    const res: any = await createWarehouseOrder(
      employee.employee_number,
      drafts.map((d) => ({ part_id: d.partId, quantity: d.quantity })),
    )
    setBusy(false)
    if (!res.ok) { setError(res.detail || res.error || 'שגיאה'); return }
    queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    setResult({ display_id: res.order?.display_id ?? '?' })
    setDrafts([])
    setTimeout(() => onDone(), 1200)
  }

  return (
    <div className="flex flex-col gap-3">
      <ComponentBadge id={4015} />
      <p className="text-xs text-muted">
        בחר חלקים מהקטלוג שמיועדים להזמנה. הפעולה תיצור הזמנת מחסן כללית עם מספר רץ ("WO-…"), וכל חלק ייכנס לסטטוס "הוזמן".
      </p>

      {drafts.length > 0 && (
        <ul className="flex flex-col gap-1">
          {drafts.map((d) => (
            <li key={d.key} className="flex items-center justify-between gap-2 text-xs bg-card border border-border rounded px-2 py-1">
              <div className="truncate">
                <span className="text-foreground">{d.name}</span>
                <span className="font-mono text-muted ms-2">{d.sku}</span>
                <span className="text-muted ms-2">×{d.quantity}</span>
              </div>
              <button type="button" onClick={() => remove(d.key)} className="text-danger hover:underline">
                הסר
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input label="מק״ט" name="wo-sku"  value={skuQ}  onChange={(e) => { setSkuQ(e.target.value);  setPicked(null) }} />
        <Input label="שם"   name="wo-name" value={nameQ} onChange={(e) => { setNameQ(e.target.value); setPicked(null) }} />
      </div>

      {matches.length > 0 && !picked && (
        <ul className="bg-card border border-border rounded-md max-h-32 overflow-y-auto">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => pick(p)}
                className="w-full text-start px-2 py-1.5 text-xs hover:bg-muted-surface flex items-center justify-between"
              >
                <span className="text-foreground">{p.name}</span>
                <span className="font-mono text-muted">{p.sku} · במלאי {p.quantity}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2 flex-wrap">
        <Input label="כמות" name="wo-qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="max-w-[6rem]" />
        <Button
          variant="secondary"
          onClick={addPicked}
          disabled={!picked || !(parseInt(qty, 10) > 0)}
          className="text-xs px-3 py-1"
        >
          + הוסף לרשימה
        </Button>
        {!picked && (skuQ.trim() || nameQ.trim()) && matches.length === 0 && (
          <span className="text-[11px] text-muted">לא נמצאו פריטים — להוספת פריט חדש לקטלוג השתמש ב"+ הוסף חלק חדש".</span>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <Button onClick={submit} disabled={busy || drafts.length === 0}>
          {busy ? 'יוצר...' : 'צור הזמנה'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>ביטול</Button>
        {error && <span className="text-xs text-danger">{error}</span>}
        {result && <span className="text-xs text-success">✓ נוצרה הזמנה {result.display_id}</span>}
      </div>
    </div>
  )
}
