import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVehicles } from '../hooks/useVehicles'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Input } from './ui/Input'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function VehiclePicker() {
  const { data: vehicles } = useVehicles()
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!vehicles) return []
    if (!q) return vehicles
    return vehicles.filter((v) =>
      v.vehicle_number.toLowerCase().includes(q) ||
      v.type_name.toLowerCase().includes(q) ||
      (v.department ?? '').toLowerCase().includes(q) ||
      (v.sub_department ?? '').toLowerCase().includes(q),
    )
  }, [vehicles, filter])

  return (
    <Card>
      <ComponentBadge id={3022} />
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">כלים בגדוד</h3>
          <span className="text-xs text-muted">לחץ על רכב לכרטיס מלא</span>
        </div>
      </CardHeader>
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
    </Card>
  )
}
