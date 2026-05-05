import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useVehicleHistory } from '../hooks/useVehicleHistory'
import { useCallsPartsStatus } from '../hooks/useCallsPartsStatus'
import { useAuthStore } from '../store/auth'
import { AppHeader } from '../components/AppHeader'
import { CallCard } from '../components/CallCard'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { setCallSpecialties } from '../lib/managerActions'
import type { EmployeePermissions, ServiceCall, TankSpecialty } from '../types/db'
import { TANK_SPECIALTIES } from '../types/db'

const homeRouteByPermissions: Record<EmployeePermissions, string> = {
  technician: '/technician',
  manager:    '/manager',
  warehouse:  '/warehouse',
}

function isClosed(c: ServiceCall): boolean {
  return c.status === 'closed' || c.status === 'cancelled'
}

export function VehicleHistoryPage() {
  const { vehicleNumber } = useParams<{ vehicleNumber: string }>()
  const navigate = useNavigate()
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useVehicleHistory(vehicleNumber)
  const { data: partsMap } = useCallsPartsStatus()
  const [filter, setFilter] = useState<TankSpecialty | 'all'>('all')

  const isTank = data?.vehicle?.type_name === 'טנק'
  const isManager = employee?.permissions === 'manager'

  // For tanks, allow filtering by specialty banner.
  const visibleCalls = useMemo(() => {
    const all = data?.calls ?? []
    if (!isTank || filter === 'all') return all
    return all.filter((c) => (c.specialties ?? []).includes(filter))
  }, [data?.calls, isTank, filter])

  // Calls already arrive sorted newest-first; partition into 3 buckets.
  const buckets = useMemo(() => {
    const disabling: ServiceCall[] = []
    const regular:   ServiceCall[] = []
    const closed:    ServiceCall[] = []
    for (const c of visibleCalls) {
      if (isClosed(c))         closed.push(c)
      else if (c.is_disabling) disabling.push(c)
      else                     regular.push(c)
    }
    return { disabling, regular, closed }
  }, [visibleCalls])

  async function handleToggleSpecialty(call: ServiceCall, specialty: TankSpecialty) {
    if (!employee) return
    const current = call.specialties ?? []
    const next = current.includes(specialty)
      ? current.filter((s) => s !== specialty)
      : [...current, specialty]
    await setCallSpecialties(employee.employee_number, call.id, next)
    queryClient.invalidateQueries({ queryKey: ['vehicle_history', vehicleNumber] })
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(employee ? homeRouteByPermissions[employee.permissions] : '/login', { replace: true })
    }
  }

  return (
    <>
      <AppHeader subtitle={vehicleNumber ? `כרטיס רכב ${vehicleNumber}` : 'כרטיס רכב'} />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        <ComponentBadge id={7001} />
        <Button variant="ghost" onClick={handleBack} className="self-start text-primary">
          → חזור
        </Button>

        {isLoading && <p className="text-sm text-muted text-center py-8">טוען...</p>}

        {error && (
          <Card>
            <CardBody>
              <p className="text-danger text-sm">שגיאה בטעינת הרכב</p>
            </CardBody>
          </Card>
        )}

        {data && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-foreground">{vehicleNumber}</h2>
                {data.vehicle?.type_name && (
                  <Badge tone="neutral">{data.vehicle.type_name}</Badge>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {data.vehicle ? (
                <div className="text-sm text-muted flex flex-col gap-0.5">
                  <div>
                    {data.vehicle.department ?? 'ללא מחלקה'}
                    {data.vehicle.sub_department && (
                      <span className="ms-2">· פלוגה: {data.vehicle.sub_department}</span>
                    )}
                  </div>
                  {data.vehicle.location && (
                    <div>מיקום: <span className="text-foreground">{data.vehicle.location}</span></div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-warning">
                  הרכב הזה אינו רשום בקטלוג. הקריאות למטה הוגשו עם מספר רכב זה אך לא נמצא רכב מתאים.
                </p>
              )}
              <div className="text-xs text-muted mt-2">
                סה״כ קריאות: <strong className="text-foreground">{data.calls.length}</strong>
              </div>
            </CardBody>
          </Card>
        )}

        {data && data.calls.length === 0 && (
          <Card>
            <CardBody>
              <p className="text-muted text-center text-sm py-4">אין קריאות לרכב זה</p>
            </CardBody>
          </Card>
        )}

        {isTank && data && data.calls.length > 0 && (
          <SpecialtyFilterBanner value={filter} onChange={setFilter} />
        )}

        {buckets.disabling.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-danger">תקלות משביתות ({buckets.disabling.length})</h3>
            {buckets.disabling.map((call) => (
              <CallWithSpecialty
                key={call.id}
                call={call}
                partsStatus={partsMap?.get(call.id) ?? null}
                showSpecialty={!!isTank}
                canEdit={!!isTank && isManager}
                onToggle={handleToggleSpecialty}
              />
            ))}
          </section>
        )}

        {buckets.regular.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">תקלות פתוחות ({buckets.regular.length})</h3>
            {buckets.regular.map((call) => (
              <CallWithSpecialty
                key={call.id}
                call={call}
                partsStatus={partsMap?.get(call.id) ?? null}
                showSpecialty={!!isTank}
                canEdit={!!isTank && isManager}
                onToggle={handleToggleSpecialty}
              />
            ))}
          </section>
        )}

        {buckets.closed.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">תקלות סגורות ({buckets.closed.length})</h3>
            {buckets.closed.map((call) => (
              <CallWithSpecialty
                key={call.id}
                call={call}
                showSpecialty={!!isTank}
                canEdit={false}
                onToggle={handleToggleSpecialty}
              />
            ))}
          </section>
        )}
      </main>
    </>
  )
}

function SpecialtyFilterBanner({
  value, onChange,
}: { value: TankSpecialty | 'all'; onChange: (v: TankSpecialty | 'all') => void }) {
  const tabs: Array<{ key: TankSpecialty | 'all'; label: string }> = [
    { key: 'all', label: 'הכל' },
    ...TANK_SPECIALTIES.map((s) => ({ key: s, label: s })),
  ]
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const active = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
              active
                ? 'bg-primary text-primary-fg border-primary'
                : 'bg-card text-muted border-border hover:bg-muted-surface'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function CallWithSpecialty({
  call, partsStatus, showSpecialty, canEdit, onToggle,
}: {
  call: ServiceCall
  partsStatus?: import('../types/db').RequiredPartStatus | null
  showSpecialty: boolean
  canEdit: boolean
  onToggle: (call: ServiceCall, specialty: TankSpecialty) => void
}) {
  const current = call.specialties ?? []
  return (
    <div className="flex flex-col gap-1.5">
      <CallCard call={call} partsStatus={partsStatus} />
      {showSpecialty && (
        <div className="flex items-center gap-1.5 flex-wrap px-1">
          <span className="text-[11px] text-muted">התמחות:</span>
          {TANK_SPECIALTIES.map((s) => {
            const active = current.includes(s)
            return (
              <button
                key={s}
                type="button"
                disabled={!canEdit}
                onClick={() => onToggle(call, s)}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  active
                    ? 'bg-info/15 border-info text-info font-medium'
                    : canEdit
                      ? 'bg-card border-border text-muted hover:bg-muted-surface'
                      : 'bg-card border-border text-muted/50 cursor-default'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
