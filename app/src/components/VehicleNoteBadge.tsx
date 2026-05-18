import type { VehicleNoteColor } from '../types/db'

const TONE_CLASSES: Record<VehicleNoteColor, string> = {
  yellow: 'bg-warning/15 text-warning border border-warning/30',
  red:    'bg-danger/10  text-danger  border border-danger/30',
  green:  'bg-success/10 text-success border border-success/30',
  blue:   'bg-info/10    text-info    border border-info/30',
  gray:   'bg-muted-surface text-muted border border-border',
}

interface Props {
  note:  string | null | undefined
  color: VehicleNoteColor | null | undefined
  /** Compact = single line, truncated; otherwise the chip wraps. */
  compact?: boolean
}

/** Renders the manager's important note for a vehicle as a colored chip.
 *  Returns null when there's no note. */
export function VehicleNoteBadge({ note, color, compact = false }: Props) {
  const text = (note ?? '').trim()
  if (!text) return null
  const tone = TONE_CLASSES[(color ?? 'yellow') as VehicleNoteColor] ?? TONE_CLASSES.yellow
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${tone} ${compact ? 'max-w-[16rem] truncate' : 'whitespace-normal break-words'}`}
      title={text}
    >
      ⚠ {text}
    </span>
  )
}
