import { Link } from 'react-router-dom'
import { Card } from './ui/Card'
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
  wear:                     'warning',
  wear_credited:            'neutral',
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
  wear:                     'בלאי',
  wear_credited:            'בלאי מזוכה',
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

  const toneColors: Record<string, string> = {
    danger:  'var(--color-danger)',
    warning: 'var(--color-warning)',
    info:    'var(--color-info)',
    success: 'var(--color-success)',
    neutral: 'var(--color-border)',
  }
  const accentColor = toneColors[effectiveTone] ?? toneColors.neutral

  return (
    <Link to={`/call/${call.id}`} className="block hover:opacity-95 transition-opacity">
      <Card>
        <ComponentBadge id={6002} />
        <div className="flex items-stretch rounded-xl overflow-hidden">
          {/* Left accent bar */}
          <div className="w-1.5 shrink-0" style={{ backgroundColor: accentColor }} />

          <div className="flex-1 flex flex-col gap-1.5 px-3 py-2.5">
            {/* Row 1: ID + status badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-semibold text-foreground">{call.display_id}</span>
              <Badge tone={effectiveTone}>{effectiveLabel}</Badge>
            </div>

            {/* Row 2: vehicle · company · date · anomalies · comments · parts */}
            <div className="flex items-center gap-1.5 text-xs text-muted flex-wrap">
              <span className="font-mono">{call.vehicle_number ?? '—'}</span>
              {vehicle?.sub_department && <span>· {vehicle.sub_department}</span>}
              {!vehicle && call.vehicle_name && <span>· {call.vehicle_name}</span>}
              <span>· {date}</span>
              {(call.anomaly_flags?.length ?? 0) > 0 && (
                <Badge tone="warning">{call.anomaly_flags!.length} חריגות</Badge>
              )}
              {hasComments && (
                <span
                  title="לקריאה זו קיימות הערות"
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning text-white text-[10px] font-bold leading-none"
                >i</span>
              )}
              {secondary?.kind === 'badge' && (
                <Badge tone={partsStatusOverride[secondary.status]}>
                  {partsStatusBadgeLabel[secondary.status]}
                </Badge>
              )}
              {secondary?.kind === 'warning' && (
                <span title="חלקים בסטטוסים שונים" className="text-warning text-sm">⚠</span>
              )}
            </div>

            {/* Row 3: description + disabling */}
            {(call.description || call.is_disabling) && (
              <div className="flex items-center gap-2">
                {call.description && (
                  <p className="text-xs text-foreground/80 line-clamp-1 min-w-0 flex-1">{call.description}</p>
                )}
                {call.is_disabling && (
                  <Badge tone="danger">משביתה</Badge>
                )}
              </div>
            )}

            {/* Row 4: closed date */}
            {call.closed_at && (call.status === 'closed' || call.status === 'cancelled') && (
              <span className="text-[11px] text-muted">
                נסגרה {new Date(call.closed_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
