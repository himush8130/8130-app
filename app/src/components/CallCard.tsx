import { Link } from 'react-router-dom'
import { Card, CardBody } from './ui/Card'
import { Badge } from './ui/Badge'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { ServiceCall, CallStatus, RequiredPartStatus, Vehicle } from '../types/db'

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

// When the call is "ממתינה לחלקים", both the badge color AND its label
// reflect the worst required-part state, so the single chip tells the
// whole story.
const partsStatusOverride: Record<RequiredPartStatus, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  awaiting_order:           'danger',
  awaiting_receipt:         'warning',
  received:                 'info',
  in_stock:                 'success',
  delivered:                'neutral',
  rejected:                 'danger',
  pending_special_approval: 'warning',
  rejected_final:           'neutral',
}

const partsStatusBadgeLabel: Record<RequiredPartStatus, string> = {
  awaiting_order:           'ממתין להזמנת חלקים',
  awaiting_receipt:         'חלקים בהזמנה',
  received:                 'חלקים התקבלו',
  in_stock:                 'חלקים במלאי',
  delivered:                'חלקים נמסרו',
  rejected:                 'חלקים נדחו',
  pending_special_approval: 'חלקים לאישור מיוחד',
  rejected_final:           'חלקים נדחו סופית',
}

interface Props {
  call: ServiceCall
  partsStatus?: RequiredPartStatus | null
  vehicle?:     Vehicle | null
}

export function CallCard({ call, partsStatus, vehicle }: Props) {
  const date = new Date(call.created_at).toLocaleDateString('he-IL', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })

  const usePartsOverride = call.status === 'waiting_for_parts' && partsStatus
  const effectiveTone  = usePartsOverride
    ? partsStatusOverride[partsStatus!]
    : statusTone[call.status]
  const effectiveLabel = usePartsOverride
    ? partsStatusBadgeLabel[partsStatus!]
    : statusLabel[call.status]

  return (
    <Link to={`/call/${call.id}`} className="block hover:opacity-95 transition-opacity">
      <Card>
        <CardBody>
          <ComponentBadge id={6002} />
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{call.display_id}</span>
                <Badge tone={effectiveTone}>{effectiveLabel}</Badge>
                {call.profession_name && (
                  <Badge tone="neutral">{call.profession_name}</Badge>
                )}
                {call.is_disabling && (
                  <Badge tone="danger">⛔ משביתה</Badge>
                )}
                {call.anomaly_flags.length > 0 && (
                  <Badge tone="warning">{call.anomaly_flags.length} חריגות</Badge>
                )}
              </div>

              <div className="text-sm text-muted">
                {call.vehicle_number ?? '—'}
                {vehicle?.department && <span className="ms-2">· {vehicle.department}</span>}
                {vehicle?.sub_department && <span className="ms-2">· פלוגה: {vehicle.sub_department}</span>}
                {!vehicle && call.vehicle_name && <span className="ms-2">· {call.vehicle_name}</span>}
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
