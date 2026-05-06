import { useState, type ReactNode } from 'react'
import { Card, CardBody, CardHeader } from './ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'

interface Props {
  title:        string
  count:        number
  defaultOpen?: boolean
  badgeId?:     number
  /** Tailwind class for the count chip — e.g. text-danger, text-warning. */
  countTone?:   string
  children:     ReactNode
}

/**
 * Card whose header is always visible and shows a title plus a row
 * count. Body collapses on click. Used to compose the warehouse home
 * out of independent tables (NOTE-0036+).
 */
export function CollapsibleSection({
  title, count, defaultOpen = false, badgeId, countTone, children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card>
      {badgeId && <ComponentBadge id={badgeId} />}
      <CardHeader>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 text-start"
        >
          <span className="text-sm font-semibold text-foreground">
            {title}
            <span className={`ms-2 text-xs ${countTone ?? 'text-muted'}`}>({count})</span>
          </span>
          <span className="text-xs text-muted">{open ? '▲' : '▼'}</span>
        </button>
      </CardHeader>
      {open && <CardBody className="p-0">{children}</CardBody>}
    </Card>
  )
}
