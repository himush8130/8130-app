import { Link } from 'react-router-dom'
import { CollapsibleSection } from './CollapsibleSection'
import { Badge } from './ui/Badge'
import type { Part } from '../types/parts'

function formatLocation(p: Part): string {
  const out: string[] = []
  if (p.warehouse) out.push(p.warehouse)
  if (p.cabinet != null && p.cabinet !== 0)               out.push(`ארון ${p.cabinet}`)
  if (p.storage_type)                                     out.push(p.storage_type)
  if (p.storage_number != null && p.storage_number !== 0) out.push(`#${p.storage_number}`)
  if (p.cell_number != null && p.cell_number !== 0)       out.push(`תא ${p.cell_number}`)
  return out.length > 0 ? out.join(' · ') : '—'
}

interface Props {
  title:        string
  parts:        Part[]
  badgeId?:     number
  /** What to surface in the right-hand column for each part. */
  variant:      'low_stock' | 'blocked_sku'
  defaultOpen?: boolean
  /** Where to send the user to drill in / edit. */
  catalogHref:  string
}

export function PartsListSection({ title, parts, badgeId, variant, defaultOpen, catalogHref }: Props) {
  const tone = variant === 'low_stock' ? 'text-danger' : 'text-warning'

  return (
    <CollapsibleSection
      title={title}
      count={parts.length}
      defaultOpen={defaultOpen}
      badgeId={badgeId}
      countTone={parts.length > 0 ? tone : undefined}
    >
      {parts.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">
          {variant === 'low_stock' ? 'אין פריטים מתחת לסף' : 'אין מק״טים חסומים'}
        </p>
      ) : (
        <>
          <ul>
            {parts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border last:border-0"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-foreground truncate">{p.name}</span>
                    <span className="font-mono text-[11px] text-muted">{p.sku}</span>
                  </div>
                  <div className="text-xs text-muted truncate">{formatLocation(p)}</div>
                </div>
                <div className="shrink-0">
                  {variant === 'low_stock' ? (
                    <Badge tone="danger">{p.quantity} / {p.min_threshold}</Badge>
                  ) : (
                    <Badge tone="warning">⚠ חסום</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 text-xs">
            <Link to={catalogHref} className="text-primary hover:underline">
              {variant === 'low_stock' ? 'פתח מסונן בקטלוג' : 'נהל בקטלוג'} →
            </Link>
          </div>
        </>
      )}
    </CollapsibleSection>
  )
}
