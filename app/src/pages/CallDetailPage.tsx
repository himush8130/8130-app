import { useParams, Link } from 'react-router-dom'
import { useCallDetail } from '../hooks/useCallDetail'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import type { CallStatus } from '../types/db'

const statusLabel: Record<CallStatus, string> = {
  new:               'חדשה',
  in_treatment:      'בטיפול',
  waiting_for_parts: 'ממתינה לחלקים',
  closed:            'סגורה',
  cancelled:         'בוטלה',
}

const statusTone: Record<CallStatus, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  new:               'danger',
  in_treatment:      'info',
  waiting_for_parts: 'warning',
  closed:            'success',
  cancelled:         'neutral',
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  )
}

export function CallDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useCallDetail(id)

  if (isLoading) {
    return (
      <>
        <AppHeader />
        <main className="max-w-3xl mx-auto p-4">
          <p className="text-sm text-muted text-center py-8">טוען...</p>
        </main>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <AppHeader />
        <main className="max-w-3xl mx-auto p-4">
          <Card className="mt-4">
            <CardBody>
              <p className="text-danger text-sm">לא ניתן לטעון את הקריאה</p>
            </CardBody>
          </Card>
        </main>
      </>
    )
  }

  const { call, comments } = data
  const created = new Date(call.created_at).toLocaleString('he-IL')

  return (
    <>
      <AppHeader subtitle={`קריאה ${call.display_id}`} />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        <Link to=".." relative="path" className="text-sm text-primary">→ חזור</Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">{call.display_id}</h2>
              <div className="flex gap-2">
                <Badge tone={statusTone[call.status]}>{statusLabel[call.status]}</Badge>
                {call.anomaly_flags.length > 0 && (
                  <Badge tone="warning">{call.anomaly_flags.length} חריגות</Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardBody className="grid grid-cols-2 gap-4">
            <FieldRow label="מספר רכב" value={call.vehicle_number} />
            <FieldRow label="שם רכב"   value={call.vehicle_name} />
            <FieldRow label="מדווח"    value={call.reporter_name} />
            <FieldRow label="טלפון"    value={call.reporter_phone} />
            <FieldRow label="נוצרה ב-" value={created} />
          </CardBody>

          {call.description && (
            <CardBody className="border-t border-border">
              <span className="text-xs text-muted">תיאור</span>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                {call.description}
              </p>
            </CardBody>
          )}

          {call.anomaly_flags.length > 0 && (
            <CardBody className="border-t border-border bg-muted-surface">
              <span className="text-xs text-muted">חריגות</span>
              <ul className="text-sm text-foreground mt-1 list-disc me-5">
                {call.anomaly_flags.map((a, i) => (
                  <li key={i}>
                    {a.code}{a.detail ? ` — ${a.detail}` : ''}
                  </li>
                ))}
              </ul>
            </CardBody>
          )}
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">הערות</h3>
          </CardHeader>
          <CardBody>
            {comments.length === 0 ? (
              <p className="text-sm text-muted">אין הערות עדיין</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {comments.map((c) => (
                  <li key={c.id} className="border-s-2 border-primary ps-3">
                    <div className="text-xs text-muted">
                      {c.author_employee_number ?? 'אנונימי'} ·{' '}
                      {new Date(c.created_at).toLocaleString('he-IL')}
                    </div>
                    <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{c.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </main>
    </>
  )
}
