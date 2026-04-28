import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/Button'
import { Card, CardBody } from './ui/Card'
import { useAuthStore } from '../store/auth'
import { closeCall, reopenCall } from '../lib/managerActions'
import type { ServiceCall } from '../types/db'

interface Props {
  call: ServiceCall
}

export function CallActions({ call }: Props) {
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<'close' | 'reopen' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!employee) return null

  const isClosed   = call.status === 'closed'
  const isCanceled = call.status === 'cancelled'

  // Hide everything if cancelled (terminal state, manager can use Studio if needed).
  if (isCanceled) return null

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['call_detail', call.id] })
    queryClient.invalidateQueries({ queryKey: ['service_calls'] })
    queryClient.invalidateQueries({ queryKey: ['all_calls'] })
    queryClient.invalidateQueries({ queryKey: ['manager_overview'] })
  }

  async function handleClose() {
    setError(null); setBusy(true)
    const res = await closeCall(employee!.employee_number, call.id)
    setBusy(false); setConfirming(null)
    if (!res.ok) setError('שגיאה בסגירה')
    else refresh()
  }

  async function handleReopen() {
    setError(null); setBusy(true)
    const res = await reopenCall(employee!.employee_number, call.id)
    setBusy(false); setConfirming(null)
    if (!res.ok) setError('שגיאה בפתיחה מחדש')
    else refresh()
  }

  return (
    <Card>
      <CardBody>
        {confirming === null && (
          <div className="flex flex-wrap items-center gap-2">
            {!isClosed && (
              <Button onClick={() => setConfirming('close')}>
                סגור קריאה
              </Button>
            )}
            {isClosed && (
              <Button variant="secondary" onClick={() => setConfirming('reopen')}>
                פתח מחדש
              </Button>
            )}
            {error && <span className="text-xs text-danger">{error}</span>}
          </div>
        )}

        {confirming === 'close' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground">לסגור את הקריאה {call.display_id}?</p>
            <div className="flex gap-2">
              <Button onClick={handleClose} disabled={busy}>
                {busy ? 'סוגר...' : 'אשר סגירה'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(null)}>ביטול</Button>
            </div>
          </div>
        )}

        {confirming === 'reopen' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground">לפתוח מחדש את הקריאה {call.display_id}?</p>
            <div className="flex gap-2">
              <Button onClick={handleReopen} disabled={busy}>
                {busy ? 'פותח...' : 'אשר'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(null)}>ביטול</Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
