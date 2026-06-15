import { useMemo, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { useTechnicianCalls } from '../hooks/useTechnicianCalls'
import { useVehiclesMap } from '../hooks/useVehicles'
import { useVehicleCallStats } from '../hooks/useVehicleCallStats'
import { useVehicleHistory } from '../hooks/useVehicleHistory'
import { useCallsPartsStatus } from '../hooks/useCallsPartsStatus'
import { useCallsWithComments } from '../hooks/useCallsWithComments'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/AppHeader'
import { CallCard } from '../components/CallCard'
import { NewCallForm } from '../components/NewCallForm'
import { TankReadingEditor } from '../components/TankReadingEditor'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { ServiceCall, Vehicle } from '../types/db'
import type { CallPartsSummary } from '../hooks/useCallsPartsStatus'

const ACTIVE_STATUSES = ['in_treatment', 'waiting_for_parts']
const STAT_NAVY = '#232150'

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
  const seeAll = employee.permissions === 'manager' || employee.permissions === 'commander_viewer'

  const techQuery = useTechnicianCalls(
    !seeAll ? employee.profession_name : null,
    employee.specialty ?? null,
  )
  const allActiveQuery = useQuery({
    queryKey: ['service_calls', 'active'],
    enabled: seeAll,
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
  const { data: calls, isLoading, error } = seeAll ? allActiveQuery : techQuery

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

  const navTo = useNavigate()
  const [vehicleSearch, setVehicleSearch] = useState('')
  const vehicleSearchResults = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase()
    if (!q || q.length < 2) return []
    return [...vehiclesMap.values()]
      .filter(v =>
        v.vehicle_number.toLowerCase().includes(q) ||
        (v.type_name ?? '').toLowerCase().includes(q) ||
        (v.sub_department ?? '').toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [vehicleSearch, vehiclesMap])

  function updateParams(updates: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams)
    for (const [key, val] of Object.entries(updates)) {
      if (val) sp.set(key, val)
      else sp.delete(key)
    }
    setSearchParams(sp, { replace: true })
  }

  const tankByCompany = useMemo(() => {
    const out = new Map<string, ServiceCall[]>()
    for (const c of calls ?? []) {
      const v = c.vehicle_number ? vehiclesMap.get(c.vehicle_number) : undefined
      if (v && v.type_name !== 'טנק') continue
      const company = v?.sub_department || NO_COMPANY
      const arr = out.get(company) ?? []
      arr.push(c)
      out.set(company, arr)
    }
    return out
  }, [calls, vehiclesMap])

  const wheeledByDept = useMemo(() => {
    const out = new Map<string, ServiceCall[]>()
    for (const c of calls ?? []) {
      const v = c.vehicle_number ? vehiclesMap.get(c.vehicle_number) : undefined
      if (!v || v.type_name === 'טנק') continue
      const dept = v.department || v.sub_department || NO_COMPANY
      const arr = out.get(dept) ?? []
      arr.push(c)
      out.set(dept, arr)
    }
    return out
  }, [calls, vehiclesMap])

  const companies = useMemo(() => {
    const set = new Set(
      [...tankByCompany.keys()].filter((k) => k !== NO_COMPANY),
    )
    for (const v of vehiclesMap.values()) {
      if (v.sub_department && v.type_name === 'טנק') set.add(v.sub_department)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'he'))
  }, [tankByCompany, vehiclesMap])

  const wheeledDepts = useMemo(() => {
    const set = new Set(
      [...wheeledByDept.keys()].filter((k) => k !== NO_COMPANY),
    )
    if (seeAll) {
      for (const v of vehiclesMap.values()) {
        if (v.type_name !== 'טנק') {
          const dept = v.department || v.sub_department
          if (dept) set.add(dept)
        }
      }
    }
    const companySet = new Set(companies)
    const shared = companies.filter((c) => set.has(c))
    const rest = [...set].filter((d) => !companySet.has(d)).sort((a, b) => a.localeCompare(b, 'he'))
    return [...shared, ...rest]
  }, [wheeledByDept, vehiclesMap, seeAll, companies])

  // Stable colour assignment by sorted-index. Companies past the
  // palette wrap, which is the only case where duplicates can occur.
  const companyTints = useMemo(() => {
    const m = new Map<string, { bg: string; border: string; text: string }>()
    companies.forEach((name, i) => m.set(name, COMPANY_PALETTE[i % COMPANY_PALETTE.length]))
    return m
  }, [companies])

  const hasOrphans = tankByCompany.has(NO_COMPANY) ||
    [...vehiclesMap.values()].some((v) => v.type_name === 'טנק' && !v.sub_department)
  const wheeledHasOrphans = wheeledByDept.has(NO_COMPANY)


  // Vehicles for the picked company, with their per-vehicle call count.
  // Includes vehicles with 0 active calls so the technician sees the
  // full fleet for the selected company.
  const vehiclesForCompany = useMemo(() => {
    if (!selectedCompany) return [] as Array<{ vehicleNumber: string; count: number }>
    const companyCalls = tankByCompany.get(selectedCompany) ?? []
    const counts = new Map<string, number>()
    for (const c of companyCalls) {
      const key = c.vehicle_number ?? '—'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    for (const [vNum, v] of vehiclesMap) {
      if (v.type_name !== 'טנק') continue
      const company = v.sub_department || NO_COMPANY
      if (company === selectedCompany && !counts.has(vNum)) counts.set(vNum, 0)
    }
    return [...counts.entries()]
      .map(([vehicleNumber, count]) => ({ vehicleNumber, count }))
      .sort((a, b) => {
        const aD = !!vehicleStats?.get(a.vehicleNumber)?.disabled
        const bD = !!vehicleStats?.get(b.vehicleNumber)?.disabled
        if (aD !== bD) return aD ? -1 : 1
        return (vehiclesMap.get(a.vehicleNumber)?.location ?? '').localeCompare(vehiclesMap.get(b.vehicleNumber)?.location ?? '', 'he')
      })
  }, [tankByCompany, selectedCompany, vehicleStats, vehiclesMap])

  const selectedWDept = searchParams.get('wdept')
  const selectedWVehicle = searchParams.get('wvehicle')

  const wheeledVehiclesForDept = useMemo(() => {
    if (!selectedWDept) return [] as Array<{ vehicleNumber: string; count: number }>
    const deptCalls = wheeledByDept.get(selectedWDept) ?? []
    const counts = new Map<string, number>()
    for (const c of deptCalls) {
      const key = c.vehicle_number ?? '—'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    if (seeAll) {
      for (const [vNum, v] of vehiclesMap) {
        if (v.type_name === 'טנק') continue
        const dept = v.department || v.sub_department || NO_COMPANY
        if (dept === selectedWDept && !counts.has(vNum)) counts.set(vNum, 0)
      }
    }
    return [...counts.entries()]
      .map(([vehicleNumber, count]) => ({ vehicleNumber, count }))
      .sort((a, b) => {
        const aD = !!vehicleStats?.get(a.vehicleNumber)?.disabled
        const bD = !!vehicleStats?.get(b.vehicleNumber)?.disabled
        if (aD !== bD) return aD ? -1 : 1
        return (vehiclesMap.get(a.vehicleNumber)?.location ?? '').localeCompare(vehiclesMap.get(b.vehicleNumber)?.location ?? '', 'he')
      })
  }, [wheeledByDept, selectedWDept, vehicleStats, vehiclesMap, seeAll])

  function pickCompany(name: string) {
    updateParams({ company: selectedCompany === name ? null : name, vehicle: null, wdept: null, wvehicle: null })
  }
  function pickVehicle(vn: string) {
    updateParams({ vehicle: selectedVehicle === vn ? null : vn })
  }
  function pickWDept(name: string) {
    updateParams({ wdept: selectedWDept === name ? null : name, wvehicle: null, company: null, vehicle: null })
  }
  function pickWVehicle(vn: string) {
    updateParams({ wvehicle: selectedWVehicle === vn ? null : vn })
  }

  return (
    <>
      <AppHeader subtitle={seeAll ? 'תצוגת טכנאי לפי פלוגה — כל המקצועות' : 'תצוגה לפי פלוגה'} />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4 pb-24">
        <ComponentBadge id={6020} />

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
            {/* Vehicle search */}
            <div className="relative">
              <form
                onSubmit={(e) => { e.preventDefault(); const q = vehicleSearch.trim(); if (q) navTo(`/vehicle/${encodeURIComponent(q)}`) }}
              >
                <div className="relative">
                  <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                  <input
                    type="text"
                    placeholder="חיפוש רכב לפי מספר..."
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full h-10 ps-10 pe-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </form>
              {vehicleSearchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 inset-x-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {vehicleSearchResults.map((v) => (
                    <Link
                      key={v.vehicle_number}
                      to={`/vehicle/${encodeURIComponent(v.vehicle_number)}`}
                      onClick={() => setVehicleSearch('')}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-muted-surface border-b border-border last:border-0"
                    >
                      <span className="font-mono font-medium text-foreground">{v.vehicle_number}</span>
                      <span className="text-xs text-muted truncate">
                        {v.type_name}{v.sub_department ? ` · ${v.sub_department}` : ''}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Layer 1 — total + per-company tiles */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-foreground">טנקים</h2>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                {/* Navy stats bar */}
                <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: STAT_NAVY }}>
                  <span className="text-xs text-white/80">סה״כ קריאות פעילות</span>
                  <span className="text-2xl font-bold text-white leading-none">{[...tankByCompany.values()].reduce((s, arr) => s + arr.length, 0)}</span>
                </div>

                {companies.length === 0 && !hasOrphans && (
                  <p className="text-sm text-muted text-center py-4">אין כרגע קריאות פעילות.</p>
                )}

                {(companies.length > 0 || hasOrphans) && (() => {
                  const tileCount = companies.length + (hasOrphans ? 1 : 0)
                  return (
                    <div
                      className="grid gap-2"
                      style={{ gridTemplateColumns: `repeat(${tileCount}, minmax(0, 1fr))` }}
                    >
                      {companies.map((name) => {
                        const count = tankByCompany.get(name)?.length ?? 0
                        const active = selectedCompany === name
                        const tint = companyTints.get(name) ?? COMPANY_PALETTE[0]
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => pickCompany(name)}
                            aria-expanded={active}
                            title={name}
                            className={`min-w-0 rounded-xl overflow-hidden transition-all flex flex-col items-center text-center ${
                              active ? 'ring-2 ring-offset-1 shadow-md' : 'border border-border hover:shadow-sm'
                            }`}
                            style={{
                              background: tint.bg,
                              color: tint.text,
                              ...(active ? { ringColor: tint.border } : {}),
                            }}
                          >
                            <div className="w-full h-1" style={{ backgroundColor: tint.border }} />
                            <span className="text-[11px] leading-tight truncate w-full px-1 pt-2">{name}</span>
                            <span className="text-xl font-bold leading-none pb-2.5 pt-0.5">{count}</span>
                          </button>
                        )
                      })}
                      {hasOrphans && (
                        <button
                          type="button"
                          onClick={() => pickCompany(NO_COMPANY)}
                          aria-expanded={selectedCompany === NO_COMPANY}
                          title="ללא שיוך פלוגה"
                          className={`min-w-0 rounded-xl overflow-hidden transition-all flex flex-col items-center text-center bg-muted-surface text-muted ${
                            selectedCompany === NO_COMPANY ? 'ring-2 ring-offset-1 ring-border shadow-md' : 'border border-border hover:shadow-sm'
                          }`}
                        >
                          <div className="w-full h-1 bg-border" />
                          <span className="text-[10px] leading-tight truncate w-full px-1 pt-2">ללא שיוך</span>
                          <span className="text-xl font-bold leading-none pb-2.5 pt-0.5">
                            {tankByCompany.get(NO_COMPANY)?.length ?? 0}
                          </span>
                        </button>
                      )}
                    </div>
                  )
                })()}
              </CardBody>
            </Card>

            {/* Layer 2 — vehicle tiles for the picked company */}
            {selectedCompany && (() => {
              const tint = selectedCompany !== NO_COMPANY
                ? (companyTints.get(selectedCompany) ?? COMPANY_PALETTE[0])
                : { bg: 'var(--color-muted-surface)', border: 'var(--color-border)', text: 'var(--color-muted)' }
              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-foreground">
                        {selectedCompany === NO_COMPANY
                          ? 'טנקים ללא שיוך פלוגה'
                          : `טנקים — ${selectedCompany}`}
                      </h2>
                      <button
                        type="button"
                        onClick={() => updateParams({ company: null, vehicle: null })}
                        className="text-xs text-primary hover:underline"
                      >
                        נקה בחירה
                      </button>
                    </div>
                  </CardHeader>
                  <CardBody>
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
                              className={`rounded-xl overflow-hidden transition-all text-start flex items-stretch ${
                                active
                                  ? 'ring-2 ring-primary shadow-md'
                                  : disabled
                                    ? 'border border-danger/50 hover:shadow-sm'
                                    : 'border border-border hover:shadow-sm'
                              }`}
                            >
                              <div className="w-1.5 shrink-0" style={{ backgroundColor: disabled ? 'var(--color-danger)' : tint.border }} />
                              <div className="flex-1 flex items-center justify-between gap-3 px-3 py-2.5">
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    <span className="text-sm font-mono font-semibold text-foreground truncate">
                                      {vehicleNumber}
                                    </span>
                                    {disabled && (
                                      <span className="text-[10px] font-bold text-white bg-danger px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                        מושבת
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted truncate">
                                    {[v?.type_name, v?.location].filter(Boolean).join(' · ')}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-white rounded-full min-w-[1.5rem] h-6 inline-flex items-center justify-center px-2" style={{ backgroundColor: count > 0 ? tint.border : 'var(--color-border)' }}>
                                  {count}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </CardBody>
                </Card>
              )
            })()}

            {/* Layer 3 — calls list for the picked vehicle */}
            {selectedCompany && selectedVehicle && (
              <VehicleCallsLayer
                vehicleNumber={selectedVehicle}
                partsMap={partsMap}
                vehiclesMap={vehiclesMap}
                commentsSet={commentsSet}
                onBack={() => updateParams({ vehicle: null })}
              />
            )}

            {/* ─── Wheeled vehicles section ─── */}
            {(wheeledDepts.length > 0 || wheeledHasOrphans) && (
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-foreground">רכבים גלגליים</h2>
                </CardHeader>
                <CardBody className="flex flex-col gap-3">
                  {/* Navy stats bar */}
                  <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: STAT_NAVY }}>
                    <span className="text-xs text-white/80">סה״כ קריאות פעילות</span>
                    <span className="text-2xl font-bold text-white leading-none">{[...wheeledByDept.values()].reduce((s, arr) => s + arr.length, 0)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {wheeledDepts.map((name, i) => {
                      const count = wheeledByDept.get(name)?.length ?? 0
                      const active = selectedWDept === name
                      const tint = companyTints.get(name) ?? COMPANY_PALETTE[(companies.length + i) % COMPANY_PALETTE.length]
                      return (
                        <button key={name} type="button" onClick={() => pickWDept(name)} aria-expanded={active} title={name}
                          className={`min-w-0 rounded-xl overflow-hidden transition-all flex flex-col items-center text-center ${
                            active ? 'ring-2 ring-offset-1 shadow-md' : 'border border-border hover:shadow-sm'
                          }`}
                          style={{ background: tint.bg, color: tint.text, ...(active ? { ringColor: tint.border } : {}) }}
                        >
                          <div className="w-full h-1" style={{ backgroundColor: tint.border }} />
                          <span className="text-[11px] leading-tight truncate w-full px-1 pt-2">{name}</span>
                          <span className="text-xl font-bold leading-none pb-2.5 pt-0.5">{count}</span>
                        </button>
                      )
                    })}
                    {wheeledHasOrphans && (
                      <button type="button" onClick={() => pickWDept(NO_COMPANY)} aria-expanded={selectedWDept === NO_COMPANY} title="ללא שיוך"
                        className={`min-w-0 rounded-xl overflow-hidden transition-all flex flex-col items-center text-center bg-muted-surface text-muted ${
                          selectedWDept === NO_COMPANY ? 'ring-2 ring-offset-1 ring-border shadow-md' : 'border border-border hover:shadow-sm'
                        }`}
                      >
                        <div className="w-full h-1 bg-border" />
                        <span className="text-[10px] leading-tight truncate w-full px-1 pt-2">ללא שיוך</span>
                        <span className="text-xl font-bold leading-none pb-2.5 pt-0.5">{wheeledByDept.get(NO_COMPANY)?.length ?? 0}</span>
                      </button>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

            {selectedWDept && (() => {
              const wTint = companyTints.get(selectedWDept) ?? COMPANY_PALETTE[(companies.length) % COMPANY_PALETTE.length]
              const deptTint = selectedWDept !== NO_COMPANY
                ? wTint
                : { bg: 'var(--color-muted-surface)', border: 'var(--color-border)', text: 'var(--color-muted)' }
              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-foreground">
                        {selectedWDept === NO_COMPANY ? 'רכבים ללא שיוך' : `רכבים — ${selectedWDept}`}
                      </h2>
                      <button type="button" onClick={() => updateParams({ wdept: null, wvehicle: null })} className="text-xs text-primary hover:underline">נקה בחירה</button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {wheeledVehiclesForDept.length === 0 && (
                      <p className="text-sm text-muted text-center py-3">אין רכבים בקבוצה זו.</p>
                    )}
                    {wheeledVehiclesForDept.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {wheeledVehiclesForDept.map(({ vehicleNumber, count }) => {
                          const v = vehiclesMap.get(vehicleNumber)
                          const active = selectedWVehicle === vehicleNumber
                          const disabled = !!vehicleStats?.get(vehicleNumber)?.disabled
                          return (
                            <button key={vehicleNumber} type="button" onClick={() => pickWVehicle(vehicleNumber)} aria-expanded={active}
                              className={`rounded-xl overflow-hidden transition-all text-start flex items-stretch ${
                                active ? 'ring-2 ring-primary shadow-md' : disabled ? 'border border-danger/50 hover:shadow-sm' : 'border border-border hover:shadow-sm'
                              }`}
                            >
                              <div className="w-1.5 shrink-0" style={{ backgroundColor: disabled ? 'var(--color-danger)' : deptTint.border }} />
                              <div className="flex-1 flex items-center justify-between gap-3 px-3 py-2.5">
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    <span className="text-sm font-mono font-semibold text-foreground truncate">{vehicleNumber}</span>
                                    {disabled && <span className="text-[10px] font-bold text-white bg-danger px-1.5 py-0.5 rounded-full whitespace-nowrap">מושבת</span>}
                                  </div>
                                  <span className="text-xs text-muted truncate">
                                    {[v?.type_name, v?.location].filter(Boolean).join(' · ')}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-white rounded-full min-w-[1.5rem] h-6 inline-flex items-center justify-center px-2" style={{ backgroundColor: count > 0 ? deptTint.border : 'var(--color-border)' }}>
                                  {count}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </CardBody>
                </Card>
              )
            })()}

            {selectedWDept && selectedWVehicle && (
              <VehicleCallsLayer
                vehicleNumber={selectedWVehicle}
                partsMap={partsMap}
                vehiclesMap={vehiclesMap}
                commentsSet={commentsSet}
                onBack={() => updateParams({ wvehicle: null })}
              />
            )}
          </>
        )}

      </main>
    </>
  )
}

function isClosed(c: ServiceCall): boolean {
  return c.status === 'closed' || c.status === 'cancelled'
}

function VehicleCallsLayer({
  vehicleNumber, partsMap, vehiclesMap, commentsSet, onBack,
}: {
  vehicleNumber: string
  partsMap: Map<string, CallPartsSummary> | undefined
  vehiclesMap: Map<string, Vehicle>
  commentsSet: Set<string> | undefined
  onBack: () => void
}) {
  const employee = useAuthStore((s) => s.employee)
  const { data: historyData, isLoading: histLoading } = useVehicleHistory(vehicleNumber)

  const buckets = useMemo(() => {
    const disabling: ServiceCall[] = []
    const regular:   ServiceCall[] = []
    const closed:    ServiceCall[] = []
    if (!historyData) return { disabling, regular, closed }

    let list = historyData.calls
    if (employee?.permissions !== 'manager' && employee?.permissions !== 'commander_viewer') {
      const prof = employee?.profession_name
      if (prof) list = list.filter(c => !c.profession_name || c.profession_name === prof)
    }
    for (const c of list) {
      if (isClosed(c))         closed.push(c)
      else if (c.is_disabling) disabling.push(c)
      else                     regular.push(c)
    }
    return { disabling, regular, closed }
  }, [historyData, employee])

  const [showNewCall, setShowNewCall] = useState(false)
  const [showReading, setShowReading] = useState(false)
  const vehicle = vehiclesMap.get(vehicleNumber)
  const isTank = vehicle?.type_name === 'טנק'
  const totalCalls = buckets.disabling.length + buckets.regular.length + buckets.closed.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            קריאות בכלי {vehicleNumber}
          </h2>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-primary hover:underline"
          >
            חזרה לרשימה
          </button>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          {!showNewCall && (
            <Button onClick={() => { setShowNewCall(true); setShowReading(false) }} className="self-start">+ פתח תקלה חדשה</Button>
          )}
          {isTank && !showReading && (
            <Button
              variant="secondary"
              onClick={() => { setShowReading(true); setShowNewCall(false) }}
              className="self-start bg-info/10 border-info text-info hover:bg-info/20"
            >
              עדכן שעמ/קמ
            </Button>
          )}
        </div>

        {showNewCall && (
          <div className="border border-border rounded-xl p-3">
            <NewCallForm
              initialVehicleNumber={vehicleNumber}
              onCancel={() => setShowNewCall(false)}
              onCreated={() => setShowNewCall(false)}
            />
          </div>
        )}

        {showReading && vehicle && (
          <div className="border border-border rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">עדכון שעמ/קמ — {vehicleNumber}</span>
              <button type="button" onClick={() => setShowReading(false)} className="text-xs text-primary hover:underline">סגור</button>
            </div>
            <TankReadingEditor vehicle={vehicle} onSaved={() => setShowReading(false)} />
          </div>
        )}

        {histLoading && <p className="text-sm text-muted text-center py-3">טוען...</p>}

        {!histLoading && totalCalls === 0 && (
          <p className="text-sm text-muted text-center py-3">אין קריאות לכלי הזה.</p>
        )}

        {buckets.disabling.length > 0 && (
          <CollapsibleSection title="תקלות משביתות" count={buckets.disabling.length} defaultOpen countTone="text-danger">
            <div className="flex flex-col gap-2 p-2">
              {buckets.disabling.map(c => (
                <CallCard key={c.id} call={c} partsSummary={partsMap?.get(c.id) ?? null} vehicle={vehiclesMap.get(c.vehicle_number ?? '') ?? null} hasComments={commentsSet?.has(c.id) ?? false} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {buckets.regular.length > 0 && (
          <CollapsibleSection title="תקלות פתוחות" count={buckets.regular.length} defaultOpen>
            <div className="flex flex-col gap-2 p-2">
              {buckets.regular.map(c => (
                <CallCard key={c.id} call={c} partsSummary={partsMap?.get(c.id) ?? null} vehicle={vehiclesMap.get(c.vehicle_number ?? '') ?? null} hasComments={commentsSet?.has(c.id) ?? false} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {buckets.closed.length > 0 && (
          <CollapsibleSection title="תקלות סגורות" count={buckets.closed.length}>
            <div className="flex flex-col gap-2 p-2">
              {buckets.closed.map(c => (
                <CallCard key={c.id} call={c} partsSummary={partsMap?.get(c.id) ?? null} vehicle={vehiclesMap.get(c.vehicle_number ?? '') ?? null} hasComments={commentsSet?.has(c.id) ?? false} />
              ))}
            </div>
          </CollapsibleSection>
        )}
      </CardBody>
    </Card>
  )
}
