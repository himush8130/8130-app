import { useManagerOverview } from '../hooks/useManagerOverview'
import { useManagerReports } from '../hooks/useManagerReports'
import { AppHeader } from '../components/AppHeader'
import { StatCard } from '../components/StatCard'
import { ProfessionLoadCard } from '../components/ProfessionLoadCard'
import { StatusDistributionCard } from '../components/StatusDistributionCard'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function ManagerHomePage() {
  const { data, isLoading } = useManagerOverview()
  const { data: reports } = useManagerReports()

  return (
    <>
      <AppHeader subtitle="פאנל מנהל" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        <ComponentBadge id={3001} />
        {isLoading || !data ? (
          <p className="text-sm text-muted text-center py-8">טוען...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                badgeId={3002}
                label="קריאות פתוחות"
                value={data.openCalls}
                to="/manager/calls"
              />
              <StatCard
                badgeId={3003}
                label="חריגות דחופות"
                value={data.urgentAnomalies}
                tone={data.urgentAnomalies > 0 ? 'danger' : 'neutral'}
                to="/manager/anomalies"
              />
              <StatCard
                badgeId={3004}
                label="חלקים במלאי נמוך"
                value={data.lowStockParts}
                tone={data.lowStockParts > 0 ? 'warning' : 'neutral'}
              />
            </div>

            {reports && (
              <>
                <ProfessionLoadCard rows={reports.byProfession} />
                <StatusDistributionCard rows={reports.byStatus} />
              </>
            )}
          </>
        )}
      </main>
    </>
  )
}
