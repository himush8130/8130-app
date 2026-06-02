import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { useTechnicianCalls } from '../hooks/useTechnicianCalls'
import { useVehiclesMap } from '../hooks/useVehicles'
import { useVehicleCallStats } from '../hooks/useVehicleCallStats'
import { useCallsPartsStatus } from '../hooks/useCallsPartsStatus'
import { useCallsWithComments } from '../hooks/useCallsWithComments'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/AppHeader'
import { CallCard } from '../components/CallCard'
import { Card, CardBody } from '../components/ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { ServiceCall } from '../types/db'

const ACTIVE_STATUSES = ['in_treatment', 'waiting_for_parts']

// Sentinel for vehicles that aren't tagged with a sub_department.
// Kept as a real value so React keys stay stable; users never see it.
const NO_COMPANY = '__no_company__'

/**
 * Technician drill-down by company → vehicle → call.
 *
 * Layer 1 (always visible): big-tile total + per-company tile buttons.
 *   Coloured like the warehouse "ממתין להזמנה / ממתין לקבלה / התקבל"
 *   tab buttons so a glance carries the same information density.
 *   The "ללא שיוך פלוגה" tile is only rendered when at least one
 *   active call belongs to an unassigned vehicle.
 *
 * Layer 2 (shows when a company is picked): cards for each vehicle in
 *   that company that has at least one active call in the technician's
 *   profession. Click a card to dive into its calls.
 *
 * Layer 3 (shows when a vehicle is picked): the actual CallCard list
 *   for that vehicle — disabling calls float to the top, then most
 *   recent first.
 */
export function TechnicianByCompanyPage() {
  const employee = useAuthStore((s) => s.employee)!
  const isManager = employee.permissions === 'manager'

  // Manager visiting this view sees all active calls across every
  // profession. useTechnicianCalls is gated on a non-null profession,
  // so a manager would otherwise see an empty list (the bug that
  // surfaced 0 active calls). Mirror TechnicianHomePage and run a
  // wide query for managers.
  const techQuery = useTechnicianCalls(isManager ? null : employee.profession_name)
  const allActiveQuery = useQuery({
    queryKey: ['service_calls', 'active'],
    enabled: isManager,
    queryFn: async (): Promise<ServiceCall[]> => {
      const { data, error } = await supabase
        .from('service_calls')
        .select('*')
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ServiceCall[]
    },
  })
  const { data: calls, isLoading, error } = isManager ? allActiveQuery : techQuery

  const vehiclesMap = useVehiclesMap()
  const { data: vehicleStats } = useVehicleCallStats()
  const { data: partsMap } = useCallsPartsStatus()
  const { data: commentsSet } = useCallsWithComments()

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)

  // Group calls by sub_department. NO_COMPANY catches both
  // "vehicle_number is null" and "vehicle exists but sub_department
  // is null".
  const groupedByCompany = useMemo(() => {
    const out = new Map<string, ServiceCall[]>()
    for (const c of calls ?? []) {
      const v = c.vehicle_number ? vehiclesMap.get(c.vehicle_number) : undefined
      const company = v?.sub_department || NO_COMPANY
      const arr = out.get(company) ?? []
      arr.push(c)
      out.set(company, arr)
    }
    return out
  }, [calls, vehiclesMap])

  const companies = useMemo(() => {
    return [...groupedByCompany.keys()]
      .filter((k) => k !== NO_COMPANY)
      .sort((a, b) => a.localeCompare(b, 'he'))
  }, [groupedByCompany])

  const hasOrphans = groupedByCompany.has(NO_COMPANY)
  const totalCalls = (calls ?? []).length

  // Vehicles for the picked company, with their per-vehicle call count.
  const vehiclesForCompany = useMemo(() => {
    if (!selectedCompany) return [] as Array<{ vehicleNumber: string; count: number }>
    const calls = groupedByCompany.get(selectedCompany) ?? []
    const counts = new Map<string, number>()
    for (const c of calls) {
      const key = c.vehicle_number ?? '—'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([vehicleNumber, count]) => ({ vehicleNumber, count }))
      .sort((a, b) => a.vehicleNumber.localeCompare(b.vehicleNumber, 'he'))
  }, [groupedByCompany, selectedCompany])

  // Calls for the picked vehicle, sorted with disabling first.
  const callsForVehicle = useMemo(() => {
    if (!selectedCompany || !selectedVehicle) return [] as ServiceCall[]
    const all = groupedByCompany.get(selectedCompany) ?? []
    return all
      .filter((c) => (c.vehicle_number ?? '—') === selectedVehicle)
      .sort((a, b) => {
        if (a.is_disabling !== b.is_disabling) return a.is_disabling ? -1 : 1
        return (b.created_at ?? '').localeCompare(a.created_at ?? '')
      })
  }, [groupedByCompany, selectedCompany, selectedVehicle])

  function pickCompany(name: string) {
    if (selectedCompany === name) {
      // toggle off
      setSelectedCompany(null)
      setSelectedVehicle(null)
      return
    }
    setSelectedCompany(name)
    setSelectedVehicle(null)
  }

  function pickVehicle(vehicleNumber: string) {
    setSelectedVehicle((cur) => (cur === vehicleNumber ? null : vehicleNumber))
  }

  return (
    <>
      <AppHeader subtitle={isManager ? 'תצוגת טכנאי לפי פלוגה — כל המקצועות' : 'תצוגה לפי פלוגה'} />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4 pb-24">
        <ComponentBadge id={6020} />

        <Link to="/technician" className="self-start text-sm text-primary hover:underline">
          → חזור לדף הטכנאי
        </Link>

        {isLoading && <p className="text-sm text-muted text-center py-8">טוען...</p>}
        {error && (
          <Card>
            <CardBody>
              <p className="text-danger text-sm">שגיאה בטעינת הקריאות</p>
            </CardBody>
          </Card>
        )}

        {!isLoading && !error && (
          <>
            {/* Layer 1 — total + per-company tiles */}
            <Card>
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted">
                    {isManager ? 'סה״כ קריאות פעילות' : `סה״כ קריאות פעילות ב${employee.profession_name ?? 'מקצוע שלך'}`}
                  </span>
                  <span className="text-3xl font-bold text-foreground leading-none">{totalCalls}</span>
                </div>

                {companies.length === 0 && !hasOrphans && (
                  <p className="text-sm text-muted text-center py-4">אין כרגע קריאות פעילות.</p>
                )}

                {(companies.length > 0 || hasOrphans) && (() => {
                  // Force every tile onto a single row, no matter how
                  // many companies exist — each column shrinks to fit.
                  // minmax(0, 1fr) is what stops long labels from
                  // pushing the row wider than the container.
                  const tileCount = companies.length + (hasOrphans ? 1 : 0)
                  return (
                    <div
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: `repeat(${tileCount}, minmax(0, 1fr))` }}
                    >
                      {companies.map((name) => {
                        const count = groupedByCompany.get(name)?.length ?? 0
                        const active = selectedCompany === name
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => pickCompany(name)}
                            aria-expanded={active}
                            title={name}
                            className={`min-w-0 rounded-md transition-colors flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-center bg-info/10 text-info border-info hover:bg-info/15 ${
                              active ? 'border-[3px] font-semibold' : 'border'
                            }`}
                          >
                            <span className="text-[11px] leading-tight truncate w-full">{name}</span>
                            <span className="text-lg font-bold leading-none">{count}</span>
                          </button>
                        )
                      })}
                      {hasOrphans && (
                        <button
                          type="button"
                          onClick={() => pickCompany(NO_COMPANY)}
                          aria-expanded={selectedCompany === NO_COMPANY}
                          title="ללא שיוך פלוגה"
                          className={`min-w-0 rounded-md transition-colors flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-center bg-muted-surface text-muted border-border hover:bg-muted-surface/80 ${
                            selectedCompany === NO_COMPANY ? 'border-[3px] font-semibold' : 'border'
                          }`}
                        >
                          <span className="text-[10px] leading-tight truncate w-full">ללא שיוך</span>
                          <span className="text-lg font-bold leading-none">
                            {groupedByCompany.get(NO_COMPANY)?.length ?? 0}
                          </span>
                        </button>
                      )}
                    </div>
                  )
                })()}
              </CardBody>
            </Card>

            {/* Layer 2 — vehicle tiles for the picked company */}
            {selectedCompany && (
              <Card>
                <CardBody className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {selectedCompany === NO_COMPANY
                        ? 'טנקים ללא שיוך פלוגה'
                        : `טנקים בפלוגה ${selectedCompany}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setSelectedCompany(null); setSelectedVehicle(null) }}
                      className="text-xs text-primary hover:underline"
                    >
                      נקה בחירה
                    </button>
                  </div>

                  {vehiclesForCompany.length === 0 && (
                    <p className="text-sm text-muted text-center py-3">אין טנקים פעילים בפלוגה זו.</p>
                  )}

                  {vehiclesForCompany.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {vehiclesForCompany.map(({ vehicleNumber, count }) => {
                        const v = vehiclesMap.get(vehicleNumber)
                        const active = selectedVehicle === vehicleNumber
                        const disabled = !!vehicleStats?.get(vehicleNumber)?.disabled
                        return (
                          <button
                            key={vehicleNumber}
                            type="button"
                            onClick={() => pickVehicle(vehicleNumber)}
                            aria-expanded={active}
                            className={`rounded-md px-3 py-3 transition-colors text-start flex items-center justify-between gap-3 ${
                              active
                                ? 'bg-primary/10 border-2 border-primary'
                                : disabled
                                  ? 'bg-danger/5 border border-danger/70 ring-1 ring-danger/40 hover:bg-danger/10'
                                  : 'bg-card border border-border hover:bg-muted-surface'
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="text-base font-semibold text-foreground truncate">
                                  {vehicleNumber}
                                </span>
                                {disabled && (
                                  <span className="text-[10px] font-bold text-danger bg-danger/10 border border-danger/40 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    ⛔ מושבת
                                  </span>
                                )}
                              </div>
                              {v?.type_name && (
                                <span className="text-xs text-muted truncate">{v.type_name}</span>
                              )}
                            </div>
                            <span className="text-xs text-muted whitespace-nowrap">
                              {count} קריאות
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Layer 3 — calls list for the picked vehicle */}
            {selectedCompany && selectedVehicle && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    קריאות בכלי {selectedVehicle}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedVehicle(null)}
                    className="text-xs text-primary hover:underline"
                  >
                    חזרה לטנקים
                  </button>
                </div>
                {callsForVehicle.length === 0 && (
                  <Card><CardBody><p className="text-sm text-muted text-center py-3">אין קריאות פעילות לכלי הזה.</p></CardBody></Card>
                )}
                {callsForVehicle.map((c) => (
                  <CallCard
                    key={c.id}
                    call={c}
                    partsSummary={partsMap?.get(c.id) ?? null}
                    vehicle={c.vehicle_number ? vehiclesMap.get(c.vehicle_number) ?? null : null}
                    hasComments={commentsSet?.has(c.id) ?? false}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </main>
    </>
  )
}
