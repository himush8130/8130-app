import { useState } from 'react'
import { useCallContacts } from '../hooks/useCallContacts'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Badge } from './ui/Badge'
import { PhoneActions } from './PhoneActions'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { EmployeePermissions } from '../types/db'

const permLabel: Record<EmployeePermissions, string> = {
  technician: 'טכנאי',
  manager:    'מנהל',
  warehouse:  'מחסנאי',
}

const permTone: Record<EmployeePermissions, 'info' | 'neutral'> = {
  technician: 'info',
  manager:    'neutral',
  warehouse:  'neutral',
}

export function CallContactsPanel({ professionName }: { professionName: string | null | undefined }) {
  const { data, isLoading } = useCallContacts(professionName)
  const [expanded, setExpanded] = useState(false)
  const [showUnavailable, setShowUnavailable] = useState(false)

  const all = data ?? []
  const available = all.filter((e) => e.available_today)
  const unavailable = all.filter((e) => !e.available_today)
  const visible = showUnavailable ? all : available

  return (
    <Card>
      <CardHeader>
        <ComponentBadge id={5010} />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full flex items-center justify-between gap-2 text-start"
        >
          <h3 className="text-sm font-semibold text-foreground">
            אנשי קשר רלוונטיים{available.length > 0 ? ` (${available.length})` : ''}
          </h3>
          <span className="text-xs text-primary">{expanded ? 'הסתר ▴' : 'הצג ▾'}</span>
        </button>
      </CardHeader>
      {expanded && (
        <CardBody className="p-0">
          {unavailable.length > 0 && (
            <div className="px-4 py-2 border-b border-border">
              <button
                type="button"
                onClick={() => setShowUnavailable((v) => !v)}
                className="text-xs text-primary hover:underline"
              >
                {showUnavailable
                  ? 'הסתר לא זמינים'
                  : `הצג גם לא זמינים (${unavailable.length})`}
              </button>
            </div>
          )}

          {isLoading && <p className="text-sm text-muted text-center py-4">טוען...</p>}

          {!isLoading && visible.length === 0 && (
            <p className="text-sm text-muted text-center py-4">
              {available.length === 0 && unavailable.length > 0
                ? 'אף איש קשר לא זמין היום — לחץ "הצג גם לא זמינים"'
                : 'אין אנשי קשר רלוונטיים'}
            </p>
          )}

          {visible.length > 0 && (
            <ul>
              {visible.map((c) => (
                <li
                  key={c.employee_number}
                  className={`flex items-center justify-between gap-3 px-4 py-2 border-b border-border last:border-0 ${
                    c.available_today ? '' : 'opacity-50'
                  }`}
                >
                  <ComponentBadge id={5011} />
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-sm text-foreground truncate">{c.name}</span>
                    <Badge tone={permTone[c.permissions]}>{permLabel[c.permissions]}</Badge>
                    {!c.available_today && <Badge tone="warning">לא זמין היום</Badge>}
                  </div>
                  {c.phone && <PhoneActions phone={c.phone} />}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      )}
    </Card>
  )
}
