import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { updateRequiredPartStatus } from '../lib/warehouseActions'
import { Button } from './ui/Button'
import type { RequiredPartStatus } from '../types/db'

interface QueueItem {
  id:           string
  sku:          string
  name:         string
  call_id:      string | null
  call_display: string | null
  status:       RequiredPartStatus
}

const STATUS_OPTIONS: Array<{ key: RequiredPartStatus; label: string; tone: string }> = [
  { key: 'awaiting_order',   label: 'ממתין להזמנה', tone: 'bg-danger/10  text-danger  border-danger/40'  },
  { key: 'awaiting_receipt', label: 'ממתין לקבלה',  tone: 'bg-warning/10 text-warning border-warning/40' },
  { key: 'received',         label: 'התקבל',         tone: 'bg-info/10    text-info    border-info/40'    },
  { key: 'in_stock',         label: 'במלאי',          tone: 'bg-success/10 text-success border-success/40' },
  { key: 'rejected',         label: 'נדחה',           tone: 'bg-danger/10  text-danger  border-danger/40'  },
  { key: 'rejected_final',   label: 'נדחה סופית',     tone: 'bg-muted-surface text-muted border-border'    },
]

/** Modal that walks through open call_required_parts referencing a
 *  newly-blocked part one at a time, letting the warehouse worker
 *  pick a new status (or skip) for each. The dialog mounts only when
 *  the parent passes a non-empty initial queue. */
export function BlockedSkuStatusMigrationDialog({
  partId, partSku, partName, onClose,
}: {
  partId:   string
  partSku:  string
  partName: string
  onClose:  () => void
}) {
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error: err } = await supabase
        .from('call_required_parts')
        .select(`
          id, status, call_id,
          service_calls(display_id)
        `)
        .eq('part_id', partId)
        .in('status', ['in_stock', 'awaiting_order', 'awaiting_receipt', 'received', 'rejected', 'pending_special_approval'])
        .order('requested_at', { ascending: true })
      if (cancelled) return
      if (err) { setError(err.message); setQueue([]); return }
      const items: QueueItem[] = (data ?? []).map((r: any) => ({
        id:           r.id,
        sku:          partSku,
        name:         partName,
        call_id:      r.call_id,
        call_display: r.service_calls?.display_id ?? null,
        status:       r.status as RequiredPartStatus,
      }))
      setQueue(items)
    })()
    return () => { cancelled = true }
  }, [partId, partSku, partName])

  async function pickStatus(next: RequiredPartStatus) {
    if (!employee || !queue || queue.length === 0) return
    const [current, ...rest] = queue
    setBusy(true); setError(null)
    const res: any = await updateRequiredPartStatus(employee.employee_number, current.id, next)
    setBusy(false)
    if (!res.ok) {
      setError(res.error || 'שגיאה בעדכון')
      return
    }
    setQueue(rest)
    queryClient.invalidateQueries({ queryKey: ['pending_parts_actions'] })
    queryClient.invalidateQueries({ queryKey: ['required_part_detail'] })
    if (rest.length === 0) onClose()
  }

  function skip() {
    if (!queue) return
    const [, ...rest] = queue
    setQueue(rest)
    if (rest.length === 0) onClose()
  }

  if (queue === null) {
    return null  // initial load — show nothing until we know the count
  }
  if (queue.length === 0) {
    // Loaded and nothing to do — close without bothering the user.
    onClose()
    return null
  }

  const current = queue[0]
  const total = queue.length

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-md shadow-xl p-4 w-full max-w-md max-h-full overflow-y-auto flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">האם לשנות סטטוס פריט?</h3>
          <span className="text-xs text-muted font-mono">נותרו: {total}</span>
        </div>
        <div className="text-xs text-muted">
          {current.name} · <span className="font-mono">{current.sku}</span>
          {current.call_display && (
            <> · קריאה <span className="font-mono">{current.call_display}</span></>
          )}
          <div className="mt-1">סטטוס נוכחי: <span className="text-foreground">{STATUS_OPTIONS.find((s) => s.key === current.status)?.label ?? current.status}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              disabled={busy || opt.key === current.status}
              onClick={() => pickStatus(opt.key)}
              className={`text-xs px-3 py-2 rounded-md border ${opt.tone} disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button variant="ghost" onClick={skip} disabled={busy} className="text-xs px-3 py-1">דלג</Button>
          <Button variant="ghost" onClick={onClose} disabled={busy} className="text-xs px-3 py-1">סגור</Button>
          {error && <span className="text-xs text-danger self-center">{error}</span>}
        </div>
      </div>
    </div>
  )
}
