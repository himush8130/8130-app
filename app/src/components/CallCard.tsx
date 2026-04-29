import { Link } from 'react-router-dom'
import { Card, CardBody } from './ui/Card'
import { Badge } from './ui/Badge'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { ServiceCall, CallStatus } from '../types/db'

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

export function CallCard({ call }: { call: ServiceCall }) {
  const date = new Date(call.created_at).toLocaleDateString('he-IL', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })

  return (
    <Link to={`/call/${call.id}`} className="block hover:opacity-95 transition-opacity">
      <Card>
        <CardBody>
          <ComponentBadge id={6002} />
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{call.display_id}</span>
                <Badge tone={statusTone[call.status]}>{statusLabel[call.status]}</Badge>
                {call.profession_name && (
                  <Badge tone="neutral">{call.profession_name}</Badge>
                )}
                {call.anomaly_flags.length > 0 && (
                  <Badge tone="warning">{call.anomaly_flags.length} חריגות</Badge>
                )}
              </div>

              <div className="text-sm text-muted">
                {call.vehicle_number ?? '—'} {call.vehicle_name && `· ${call.vehicle_name}`}
              </div>

              {call.description && (
                <p className="text-sm text-foreground line-clamp-2 mt-1">
                  {call.description}
                </p>
              )}
            </div>

            <span className="text-xs text-faint shrink-0">{date}</span>
          </div>
        </CardBody>
      </Card>
    </Link>
  )
}
