import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVehicleHistory } from '../hooks/useVehicleHistory'
import { useAuthStore } from '../store/auth'
import { AppHeader } from '../components/AppHeader'
import { CallCard } from '../components/CallCard'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ComponentBadge } from '../feedback/ComponentBadge'
import type { EmployeePermissions, ServiceCall } from '../types/db'

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
  const { data, isLoading, error } = useVehicleHistory(vehicleNumber)

  // Calls already arrive sorted newest-first; partition into 3 buckets.
  const buckets = useMemo(() => {
    const disabling: ServiceCall[] = []
    const regular:   ServiceCall[] = []
    const closed:    ServiceCall[] = []
    for (const c of data?.calls ?? []) {
      if (isClosed(c))         closed.push(c)
      else if (c.is_disabling) disabling.push(c)
      else                     regular.push(c)
    }
    return { disabling, regular, closed }
  }, [data?.calls])

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
                <div className="text-sm text-muted">
                  {data.vehicle.department ?? 'ללא מחלקה'}
                  {data.vehicle.sub_department && (
                    <span className="ms-2">· {data.vehicle.sub_department}</span>
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

        {buckets.disabling.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-danger">תקלות משביתות ({buckets.disabling.length})</h3>
            {buckets.disabling.map((call) => <CallCard key={call.id} call={call} />)}
          </section>
        )}

        {buckets.regular.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">תקלות פתוחות ({buckets.regular.length})</h3>
            {buckets.regular.map((call) => <CallCard key={call.id} call={call} />)}
          </section>
        )}

        {buckets.closed.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">תקלות סגורות ({buckets.closed.length})</h3>
            {buckets.closed.map((call) => <CallCard key={call.id} call={call} />)}
          </section>
        )}
      </main>
    </>
  )
}
