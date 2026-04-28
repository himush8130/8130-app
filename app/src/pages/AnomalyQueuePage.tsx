import { Link } from 'react-router-dom'
import { useAnomalyCalls } from '../hooks/useAnomalyCalls'
import { AppHeader } from '../components/AppHeader'
import { AnomalyResolver } from '../components/AnomalyResolver'
import { Card, CardBody } from '../components/ui/Card'

export function AnomalyQueuePage() {
  const { data, isLoading, error } = useAnomalyCalls()

  return (
    <>
      <AppHeader subtitle="תור חריגות דחופות" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3">
        <Link to="/manager" className="text-sm text-primary">→ חזור לפאנל</Link>

        {isLoading && <p className="text-sm text-muted text-center py-8">טוען...</p>}

        {error && (
          <Card>
            <CardBody>
              <p className="text-danger text-sm">שגיאה בטעינת החריגות</p>
            </CardBody>
          </Card>
        )}

        {data && data.calls.length === 0 && (
          <Card>
            <CardBody>
              <p className="text-muted text-center text-sm py-4">
                אין כרגע חריגות לטיפול 👌
              </p>
            </CardBody>
          </Card>
        )}

        {data && data.calls.map((call) => (
          <AnomalyResolver key={call.id} call={call} professions={data.professions} />
        ))}
      </main>
    </>
  )
}
