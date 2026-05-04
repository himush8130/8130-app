import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVehicles } from '../hooks/useVehicles'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Input } from './ui/Input'
import { ComponentBadge } from '../feedback/ComponentBadge'

const CATEGORIES: Array<{ key: string; label: string; types: string[] }> = [
  { key: 'tanks',  label: 'טנקים',     types: ['טנק'] },
  { key: 'cars',   label: 'רכבים',     types: ['רכב'] },
]

export function VehiclePicker() {
  const { data: vehicles } = useVehicles()
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const c of CATEGORIES) {
      out[c.key] = (vehicles ?? []).filter((v) => c.types.includes(v.type_name)).length
    }
    return out
  }, [vehicles])

  const filtered = useMemo(() => {
    if (!vehicles || !category) return []
    const cat = CATEGORIES.find((c) => c.key === category)
    if (!cat) return []
    let list = vehicles.filter((v) => cat.types.includes(v.type_name))
    const q = filter.trim().toLowerCase()
    if (q) {
      list = list.filter((v) =>
        v.vehicle_number.toLowerCase().includes(q) ||
        v.type_name.toLowerCase().includes(q) ||
        (v.department ?? '').toLowerCase().includes(q) ||
        (v.sub_department ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [vehicles, category, filter])

  return (
    <Card>
      <ComponentBadge id={3022} />
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">
            {category
              ? `${CATEGORIES.find((c) => c.key === category)?.label} · ${filtered.length}`
              : 'בחר תחום'}
          </h3>
          {category && (
            <button
              type="button"
              onClick={() => { setCategory(null); setFilter('') }}
              className="text-xs text-primary hover:underline"
            >
              ← חזור לתחומים
            </button>
          )}
        </div>
      </CardHeader>

      {!category && (
        <CardBody>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className="flex flex-col items-center justify-center px-4 py-6 rounded-md border border-border bg-card hover:bg-muted-surface transition-colors"
              >
                <span className="text-base font-semibold text-foreground">{c.label}</span>
                <span className="text-xs text-muted mt-1">{counts[c.key] ?? 0} כלים</span>
              </button>
            ))}
          </div>
        </CardBody>
      )}

      {category && (
        <CardBody className="flex flex-col gap-3">
          <Input
            name="vehicle_search"
            label="חיפוש (מספר / סוג / פלוגה)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-72 overflow-y-auto">
            {filtered.map((v) => (
              <Link
                key={v.vehicle_number}
                to={`/vehicle/${encodeURIComponent(v.vehicle_number)}`}
                className="text-start text-sm px-3 py-2 rounded-md border border-border bg-card text-foreground hover:bg-muted-surface"
              >
                <div className="font-mono text-foreground truncate">{v.vehicle_number}</div>
                <div className="text-[11px] opacity-70 truncate">
                  {v.type_name}{v.sub_department ? ` · ${v.sub_department}` : ''}
                </div>
              </Link>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-xs text-muted text-center py-2">אין רכבים תואמים</p>
          )}
        </CardBody>
      )}
    </Card>
  )
}
