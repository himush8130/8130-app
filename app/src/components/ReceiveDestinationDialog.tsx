import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { WarehouseSelect } from './WarehouseSelect'
import type { Part } from '../types/parts'
import type { ReceiveDestination } from '../lib/warehouseActions'

const EXTERNAL = '__external__'
const NEW      = '__new__'

interface Props {
  partId:   string
  orderedQuantity: number
  busy:     boolean
  onClose:  () => void
  onConfirm:(dest: ReceiveDestination) => void
  progress?: string
  subtitle?: string
}

/** Modal that asks "where do you want to put the received item?" —
 *  Pick an existing parts row that shares the same SKU, pick the
 *  external warehouse, or create a new parts row from scratch. */
export function ReceiveDestinationDialog({
  partId, orderedQuantity, busy, onClose, onConfirm, progress, subtitle,
}: Props) {
  const { data: locations } = useQuery({
    queryKey: ['parts_same_sku', partId],
    queryFn: async (): Promise<Part[]> => {
      const { data: orig } = await supabase.from('parts').select('sku').eq('id', partId).maybeSingle()
      if (!orig?.sku) return []
      const { data: rows } = await supabase.from('parts').select('*').eq('sku', orig.sku).order('warehouse')
      return (rows ?? []) as Part[]
    },
  })

  const [pick, setPick] = useState<string>('')
  const [receivedQty, setReceivedQty] = useState(String(orderedQuantity))
  const [warehouse, setWarehouse] = useState('')
  const [cabinet, setCabinet] = useState('')
  const [storageType, setStorageType] = useState('')
  const [storageNumber, setStorageNumber] = useState('')
  const [cellNumber, setCellNumber] = useState('')

  function nullableInt(v: string): number | null {
    const t = v.trim()
    if (!t) return null
    const n = parseInt(t, 10)
    return Number.isNaN(n) ? null : n
  }

  function submit() {
    if (!pick) return
    const rq = parseInt(receivedQty, 10)
    const received_quantity = (!Number.isNaN(rq) && rq >= 0 && rq !== orderedQuantity) ? rq : undefined
    if (pick === EXTERNAL) { onConfirm({ receive_to: 'external', received_quantity }); return }
    if (pick === NEW) {
      onConfirm({
        receive_to: 'new',
        received_quantity,
        receive_new_location: {
          warehouse:      warehouse.trim() || null,
          cabinet:        nullableInt(cabinet),
          storage_type:   storageType.trim() || null,
          storage_number: nullableInt(storageNumber),
          cell_number:    nullableInt(cellNumber),
        },
      })
      return
    }
    onConfirm({ receive_to: 'existing', receive_part_id: pick, received_quantity })
  }

  function locLabel(p: Part): string {
    const out: string[] = []
    if (p.warehouse) out.push(p.warehouse)
    if (p.cabinet)        out.push(`ארון ${p.cabinet}`)
    if (p.storage_type)   out.push(p.storage_type)
    if (p.storage_number) out.push(`#${p.storage_number}`)
    if (p.cell_number)    out.push(`תא ${p.cell_number}`)
    return out.length === 0 ? '—' : out.join(' · ')
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
    >
      <div className="bg-card border border-border rounded-md shadow-xl p-4 w-full max-w-md max-h-full overflow-y-auto flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">איפה להוסיף את הפריט שהתקבל?</h3>
          {progress && <span className="text-xs text-muted font-mono">{progress}</span>}
        </div>
        {subtitle && <p className="text-xs text-muted -mt-2">{subtitle}</p>}

        <div className="flex items-center gap-3">
          <Input
            label="כמות שהתקבלה"
            name="received-qty"
            type="number"
            value={receivedQty}
            onChange={(e) => setReceivedQty(e.target.value)}
            className="max-w-[8rem]"
          />
          <span className="text-xs text-muted mt-5">הוזמנו: {orderedQuantity}</span>
        </div>

        <ul className="flex flex-col gap-1">
          {(locations ?? []).map((loc) => (
            <li key={loc.id}>
              <label className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${
                pick === loc.id ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <input type="radio" name="dest" checked={pick === loc.id} onChange={() => setPick(loc.id)} />
                <span className="flex-1 text-sm text-foreground">{locLabel(loc)}</span>
                <span className="text-xs text-muted">קיים: {loc.quantity}</span>
              </label>
            </li>
          ))}
          <li>
            <label className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${
              pick === EXTERNAL ? 'border-primary bg-primary/5' : 'border-border'
            }`}>
              <input type="radio" name="dest" checked={pick === EXTERNAL} onChange={() => setPick(EXTERNAL)} />
              <span className="flex-1 text-sm text-foreground">מלאי חיצוני</span>
              <span className="text-xs text-muted">בלי לעדכן מלאי פנימי</span>
            </label>
          </li>
          <li>
            <label className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${
              pick === NEW ? 'border-primary bg-primary/5' : 'border-border'
            }`}>
              <input type="radio" name="dest" checked={pick === NEW} onChange={() => setPick(NEW)} />
              <span className="flex-1 text-sm text-foreground">מיקום חדש</span>
            </label>
          </li>
        </ul>

        {pick === NEW && (
          <div className="grid grid-cols-2 gap-2 border border-border rounded-md p-3 bg-muted-surface/40">
            <WarehouseSelect value={warehouse} onChange={setWarehouse} />
            <Input label="ארון"        name="rc"  value={cabinet}       onChange={(e) => setCabinet(e.target.value)} type="number" />
            <Input label="מאחסן"       name="rst" value={storageType}   onChange={(e) => setStorageType(e.target.value)} />
            <Input label="מספר מאחסן"  name="rsn" value={storageNumber} onChange={(e) => setStorageNumber(e.target.value)} type="number" />
            <Input label="מספר תא"     name="rcn" value={cellNumber}    onChange={(e) => setCellNumber(e.target.value)} type="number" />
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>ביטול</Button>
          <Button onClick={submit} disabled={busy || !pick}>{busy ? '...' : 'אשר קבלה'}</Button>
        </div>
      </div>
    </div>
  )
}
