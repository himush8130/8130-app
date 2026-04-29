import { useAuthStore } from '../store/auth'
import { useTechnicianCalls } from '../hooks/useTechnicianCalls'
import { AppHeader } from '../components/AppHeader'
import { CallCard } from '../components/CallCard'
import { Card, CardBody } from '../components/ui/Card'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function TechnicianHomePage() {
  const employee = useAuthStore((s) => s.employee)!
  const { data: calls, isLoading, error } = useTechnicianCalls(employee.profession_name)

  return (
    <>
      <AppHeader subtitle="הקריאות שלי" />

      <main className="max-w-3xl mx-auto p-4">
        <ComponentBadge id={6001} />
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
              <CallCard key={call.id} call={call} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
