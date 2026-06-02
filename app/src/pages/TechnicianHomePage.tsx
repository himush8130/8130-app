import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { useTechnicianCalls } from '../hooks/useTechnicianCalls'
import { useCallsPartsStatus } from '../hooks/useCallsPartsStatus'
import { useCallsWithComments } from '../hooks/useCallsWithComments'
import { useVehiclesMap } from '../hooks/useVehicles'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/AppHeader'
import { CallCard } from '../components/CallCard'
import { NewCallForm } from '../components/NewCallForm'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { ServiceCall } from '../types/db'

const ACTIVE_STATUSES = ['in_treatment', 'waiting_for_parts']

export function TechnicianHomePage() {
  const employee = useAuthStore((s) => s.employee)!
  const isManager = employee.permissions === 'manager'
  const [showForm, setShowForm] = useState(false)

  // Technicians see their own profession's calls.
  const techQuery = useTechnicianCalls(isManager ? null : employee.profession_name)

  // Managers visiting the technician view see ALL active calls so they
  // get the same picture a tech does — but across professions.
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
  const { data: partsMap } = useCallsPartsStatus()
  const { data: commentsSet } = useCallsWithComments()
  const vehiclesMap = useVehiclesMap()

  return (
    <>
      <AppHeader subtitle={isManager ? 'תצוגת טכנאי — כל הקריאות הפעילות' : 'הקריאות שלי'} />

      <main className="max-w-3xl mx-auto p-4">
        <ComponentBadge id={6001} />

        {isManager && (
          <p className="text-xs text-muted mb-3">
            אתה צופה במצב טכנאי. מוצגות כל הקריאות הפעילות בכל המקצועות.
          </p>
        )}

        <div className="mb-3 flex gap-2 flex-wrap items-center">
          {!showForm ? (
            <>
              <Button onClick={() => setShowForm(true)}>
                <ComponentBadge id={6011} />
                + פתח תקלה חדשה
              </Button>
              <Link
                to="/technician/by-company"
                className="text-xs px-3 py-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted-surface"
              >
                תצוגה לפי פלוגה →
              </Link>
            </>
          ) : (
            <NewCallForm onCancel={() => setShowForm(false)} onCreated={() => setShowForm(false)} />
          )}
        </div>

        {isLoading && (
          <p className="text-sm text-muted text-center py-8">טוען...</p>
        )}

        {error && (
          <Card className="mt-4">
            <CardBody>
              <p className="text-danger text-sm">שגיאה בטעינת הקריאות</p>
            </CardBody>
          </Card>
        )}

        {calls && calls.length === 0 && (
          <Card className="mt-4">
            <CardBody>
              <p className="text-muted text-center text-sm py-4">
                אין כרגע קריאות פתוחות לטיפול
              </p>
            </CardBody>
          </Card>
        )}

        {calls && calls.length > 0 && (
          <div className="flex flex-col gap-3 mt-4">
            {calls.map((call) => (
              <CallCard
                key={call.id}
                call={call}
                partsSummary={partsMap?.get(call.id) ?? null}
                vehicle={call.vehicle_number ? vehiclesMap.get(call.vehicle_number) ?? null : null}
                hasComments={commentsSet?.has(call.id) ?? false}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
