/**
 * Tiny stroke-based SVG donut. Each segment is a partial-circumference
 * stroke on the same circle, rotated by the cumulative offset of the
 * previous segments.
 */

export interface DonutSegment {
  value: number
  color: string         // any valid CSS color (e.g. CSS var like 'var(--color-success)')
  label?: string
}

interface Props {
  segments: DonutSegment[]
  /** Big text in the center (defaults to total). */
  centerLabel?: string | number
  /** Small text under the center label. */
  centerSubLabel?: string
  /** SVG viewBox is 100×100 — scale via width/height. */
  size?: number
  /** Stroke thickness in viewBox units. */
  thickness?: number
}

export function DonutChart({
  segments,
  centerLabel,
  centerSubLabel,
  size = 120,
  thickness = 16,
}: Props) {
  const total  = segments.reduce((s, x) => s + x.value, 0)
  const r      = (100 - thickness) / 2
  const C      = 2 * Math.PI * r
  const center = centerLabel ?? total

  if (total === 0) {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth={thickness} />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
              fontSize="22" fontWeight="700" fill="var(--color-foreground)">{center}</text>
        {centerSubLabel && (
          <text x="50" y="68" textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fill="var(--color-muted)">{centerSubLabel}</text>
        )}
      </svg>
    )
  }

  let offset = 0
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx="50" cy="50" r={r} fill="none"
              stroke="var(--color-border)" strokeWidth={thickness} />
      {segments.map((s, i) => {
        if (s.value === 0) return null
        const len = (s.value / total) * C
        const dasharray = `${len} ${C - len}`
        const dashoffset = -offset
        const node = (
          <circle
            key={i}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            transform="rotate(-90 50 50)"
            strokeLinecap="butt"
          />
        )
        offset += len
        return node
      })}
      <text
        x="50" y={centerSubLabel ? '46' : '50'} textAnchor="middle" dominantBaseline="middle"
        fontSize="22" fontWeight="700" fill="var(--color-foreground)"
      >
        {center}
      </text>
      {centerSubLabel && (
        <text x="50" y="62" textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fill="var(--color-muted)">{centerSubLabel}</text>
      )}
    </svg>
  )
}
