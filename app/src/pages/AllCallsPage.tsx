import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAllCalls } from '../hooks/useAllCalls'
import { AppHeader } from '../components/AppHeader'
import { CallCard } from '../components/CallCard'
import { Card, CardBody } from '../components/ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { CallStatus } from '../types/db'

const statusOptions: Array<{ value: CallStatus; label: string }> = [
  { value: 'new',                label: 'חדשה' },
  { value: 'in_treatment',       label: 'בטיפול' },
  { value: 'waiting_for_parts',  label: 'ממתינה לחלקים' },
  { value: 'closed',             label: 'סגורה' },
  { value: 'cancelled',          label: 'בוטלה' },
]

function ChipFilter<T extends string | number>({
  label,
  selected,
  options,
  onChange,
}: {
  label: string
  selected: T[]
  options: Array<{ value: T; label: string }>
  onChange: (next: T[]) => void
}) {
  function toggle(v: T) {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v))
    else onChange([...selected, v])
  }
  return (
    <div>
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.value)
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => toggle(o.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                active
                  ? 'bg-primary text-primary-fg border-primary'
                  : 'bg-card text-muted border-border hover:bg-muted-surface'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AllCallsPage() {
  const [statuses, setStatuses] = useState<CallStatus[]>([])
  const [professionNames, setProfessionNames] = useState<string[]>([])
  const { data, isLoading, error } = useAllCalls({ statuses, professionNames })

  return (
    <>
      <AppHeader subtitle="כל הקריאות" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3">
        <ComponentBadge id={3012} />
        <Link to="/manager" className="text-sm text-primary">→ חזור לפאנל</Link>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <ComponentBadge id={3013} />
            <ChipFilter
              label="סטטוס"
              selected={statuses}
              options={statusOptions}
              onChange={setStatuses}
            />
            {data && (
              <ChipFilter
                label="מקצוע"
                selected={professionNames}
                options={data.professions.map((p) => ({ value: p.name, label: p.name }))}
                onChange={setProfessionNames}
              />
            )}
          </CardBody>
        </Card>

        {isLoading && <p className="text-sm text-muted text-center py-4">טוען...</p>}

        {error && (
          <Card>
            <CardBody>
              <p className="text-danger text-sm">שגיאה בטעינת הקריאות</p>
            </CardBody>
          </Card>
        )}

        {data && data.calls.length === 0 && !isLoading && (
          <Card>
            <CardBody>
              <p className="text-muted text-center text-sm py-4">אין קריאות שתואמות את הסינון</p>
            </CardBody>
          </Card>
        )}

        {data && data.calls.map((call) => <CallCard key={call.id} call={call} />)}
      </main>
    </>
  )
}
