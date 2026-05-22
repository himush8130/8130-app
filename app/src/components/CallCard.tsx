import { Link } from 'react-router-dom'
import { Card, CardBody } from './ui/Card'
import { Badge } from './ui/Badge'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { ServiceCall, CallStatus, RequiredPartStatus, Vehicle } from '../types/db'
import type { CallPartsSummary } from '../hooks/useCallsPartsStatus'

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

const partsStatusOverride: Record<RequiredPartStatus, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  awaiting_order:           'danger',
  awaiting_receipt:         'warning',
  received:                 'info',
  in_stock:                 'success',
  delivered:                'success',
  rejected:                 'danger',
  pending_special_approval: 'warning',
  rejected_final:           'neutral',
  not_consumed:             'warning',
}

const partsStatusBadgeLabel: Record<RequiredPartStatus, string> = {
  awaiting_order:           'ממתין להזמנת חלקים',
  awaiting_receipt:         'חלקים בהזמנה',
  received:                 'חלקים התקבלו',
  in_stock:                 'חלקים במלאי',
  delivered:                'כל החלקים נופקו',
  rejected:                 'חלקים נדחו',
  pending_special_approval: 'חלקים לאישור מיוחד',
  rejected_final:           'חלקים נדחו סופית',
  not_consumed:             'חלקים לא נצרכו',
}

interface Props {
  call: ServiceCall
  /** New shape — preferred. */
  partsSummary?: CallPartsSummary | null
  vehicle?:      Vehicle | null
  /** True when the call has at least one comment in call_comments. */
  hasComments?:  boolean
}

export function CallCard({ call, partsSummary, vehicle, hasComments }: Props) {
  const date = new Date(call.created_at).toLocaleDateString('he-IL', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })

  // The "parts-aware" badge replaces the main status only when the
  // call is waiting_for_parts AND every part shares the same status.
  // Mixed states leave the main badge alone.
  const usePartsOverride =
    call.status === 'waiting_for_parts' && !!partsSummary && partsSummary.uniform

  const effectiveTone  = usePartsOverride
    ? partsStatusOverride[partsSummary!.worst]
    : statusTone[call.status]
  const effectiveLabel = usePartsOverride
    ? partsStatusBadgeLabel[partsSummary!.worst]
    : statusLabel[call.status]

  // Secondary indicator next to the main badge:
  // - uniform parts state on a non-waiting call → show that status as a chip
  // - mixed states with at least one warning → small ⚠ icon
  // - mixed without warning → nothing
  // - closed/cancelled calls suppress the indicator entirely
  type Secondary = { kind: 'badge'; status: RequiredPartStatus } | { kind: 'warning' } | null
  let secondary: Secondary = null
  const showAtAll = !!partsSummary && call.status !== 'closed' && call.status !== 'cancelled'
  if (showAtAll) {
    if (!usePartsOverride && partsSummary!.uniform) {
      secondary = { kind: 'badge', status: partsSummary!.worst }
    } else if (!partsSummary!.uniform && partsSummary!.hasWarning) {
      secondary = { kind: 'warning' }
    }
  }

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
                {secondary?.kind === 'badge' && (
                  <Badge tone={partsStatusOverride[secondary.status]}>
                    {partsStatusBadgeLabel[secondary.status]}
                  </Badge>
                )}
                {secondary?.kind === 'warning' && (
                  <span
                    title="חלקים בסטטוסים שונים, כולל סטטוס בעייתי (נדחה / מק״ט חסום)"
                    aria-label="warning"
                    className="text-warning text-sm"
                  >⚠</span>
                )}
                {call.profession_name && (
                  <Badge tone="neutral">{call.profession_name}</Badge>
                )}
                {call.is_disabling && (
                  <Badge tone="danger">⛔ משביתה</Badge>
                )}
                {(call.anomaly_flags?.length ?? 0) > 0 && (
                  <Badge tone="warning">{call.anomaly_flags!.length} חריגות</Badge>
                )}
                {hasComments && (
                  <span
                    title="לקריאה זו קיימות הערות"
                    aria-label="לקריאה זו קיימות הערות"
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning text-white text-xs font-bold leading-none"
                  >
                    i
                  </span>
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
