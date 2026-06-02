import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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

// Per-company tint. Earlier this used a hash modulo palette length,
// which collided for similar names. We now lay the palette over the
// sorted-companies list by index — every company up to the palette
// size gets a unique colour. Palette is intentionally large.
const COMPANY_PALETTE: Array<{ bg: string; border: string; text: string }> = [
  { bg: '#fbe9df', border: '#c43d3d', text: '#7c2c06' }, // red
  { bg: '#faf2d8', border: '#c9941e', text: '#7e6017' }, // gold
  { bg: '#e0ebf5', border: '#4a7a9e', text: '#1f4a6e' }, // blue
  { bg: '#eef4e9', border: '#4a7d3e', text: '#234d18' }, // green
  { bg: '#f0e6f7', border: '#7a4d8c', text: '#46285a' }, // purple
  { bg: '#fbeee0', border: '#c9a96e', text: '#6d5320' }, // sand
  { bg: '#dde6f3', border: '#2c5282', text: '#1a3460' }, // navy
  { bg: '#eef0e3', border: '#6b7e3e', text: '#3b4720' }, // olive
  { bg: '#fde2e4', border: '#b94a78', text: '#7d2350' }, // pink
  { bg: '#e0f2f1', border: '#2c7a7b', text: '#134e4a' }, // teal
  { bg: '#fef3c7', border: '#b45309', text: '#78350f' }, // amber
  { bg: '#ede9fe', border: '#5b21b6', text: '#3b1380' }, // violet
  { bg: '#dcfce7', border: '#15803d', text: '#14532d' }, // emerald
  { bg: '#fee2e2', border: '#b91c1c', text: '#7f1d1d' }, // rose
  { bg: '#dbeafe', border: '#1d4ed8', text: '#1e3a8a' }, // sky
  { bg: '#e2e8f0', border: '#475569', text: '#1e293b' }, // slate
]

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
  // Filter calls by profession whenever the employee has one — even
  // a manager-permission user who carries a profession only sees that
  // profession's calls here. The "view everything" fallback applies
  // to managers with no profession set.
  const hasProfession = !!employee.profession_name

  const techQuery = useTechnicianCalls(
    hasProfession ? employee.profession_name : null,
    employee.specialty ?? null,
  )
  const allActiveQuery = useQuery({
    queryKey: ['service_calls', 'active'],
    enabled: isManager && !hasProfession,
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
  const { data: calls, isLoading, error } = hasProfession ? techQuery : allActiveQuery

  const vehiclesMap = useVehiclesMap()
  const { data: vehicleStats } = useVehicleCallStats()
  const { data: partsMap } = useCallsPartsStatus()
  const { data: commentsSet } = useCallsWithComments()

  // Drill-down state lives in the URL so navigating into /call/:id
  // and clicking "back" lands the user on the same company+vehicle
  // they were on, with the right tiles highlighted.
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCompany = searchParams.get('company')
  const selectedVehicle = searchParams.get('vehicle')

  function updateParams(updates: { company?: string | null; vehicle?: string | null }) {
    const sp = new URLSearchParams(searchParams)
    if ('company' in updates) {
      if (updates.company) sp.set('company', updates.company)
      else                 sp.delete('company')
    }
    if ('vehicle' in updates) {
      if (updates.vehicle) sp.set('vehicle', updates.vehicle)
      else                 sp.delete('vehicle')
    }
    setSearchParams(sp, { replace: true })
  }

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

  // Stable colour assignment by sorted-index. Companies past the
  // palette wrap, which is the only case where duplicates can occur.
  const companyTints = useMemo(() => {
    const m = new Map<string, { bg: string; border: string; text: string }>()
    companies.forEach((name, i) => m.set(name, COMPANY_PALETTE[i % COMPANY_PALETTE.length]))
    return m
  }, [companies])

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
    updateParams({ company: selectedCompany === name ? null : name, vehicle: null })
  }

  function pickVehicle(vehicleNumber: string) {
    updateParams({ vehicle: selectedVehicle === vehicleNumber ? null : vehicleNumber })
  }

  return (
    <>
      <AppHeader subtitle={!hasProfession ? 'תצוגת טכנאי לפי פלוגה — כל המקצועות' : 'תצוגה לפי פלוגה'} />
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
                    {hasProfession ? `סה״כ קריאות פעילות ב${employee.profession_name}` : 'סה״כ קריאות פעילות'}
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
                        const tint = companyTints.get(name) ?? COMPANY_PALETTE[0]
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => pickCompany(name)}
                            aria-expanded={active}
                            title={name}
                            className={`min-w-0 rounded-md transition-colors flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-center ${
                              active ? 'border-[3px] font-semibold' : 'border'
                            }`}
                            style={{
                              background:   tint.bg,
                              color:        tint.text,
                              borderColor:  tint.border,
                            }}
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
                      onClick={() => updateParams({ company: null, vehicle: null })}
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
                              {v?.location && (
                                <span className="text-xs text-muted truncate">📍 {v.location}</span>
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
                    onClick={() => updateParams({ vehicle: null })}
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
