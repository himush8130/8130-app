import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { useDashboardData } from '../hooks/useDashboardData'
import { PriorityCompanySection } from './ManagerDashboardPage'

/** One dot = STEP pixels. Used both for the dot ruler and the gridlines. */
const STEP = 10

/** A horizontal ruler of dots (every STEP px) with numbered major ticks
 *  every 5 dots. Measures its own width so it always spans the row. */
function AlignmentRuler() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setW(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = Math.floor(w / STEP)
  return (
    <div ref={ref} className="relative h-7 w-full">
      {Array.from({ length: n + 1 }, (_, i) => {
        const major = i % 5 === 0
        return (
          <div
            key={i}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: i * STEP, transform: 'translateX(-50%)' }}
          >
            <span className={`rounded-full ${major ? 'w-1 h-1 bg-primary' : 'w-px h-px bg-muted'}`} />
            {major && <span className="text-[7px] text-muted mt-0.5 font-mono leading-none">{i}</span>}
          </div>
        )
      })}
    </div>
  )
}

export function DevelopmentPage() {
  const { data } = useDashboardData()

  return (
    <>
      <AppHeader subtitle="פיתוח" showLogo wide />
      <main className="max-w-6xl mx-auto p-4 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">פיתוח — כלי יישור</h2>
          <p className="text-xs text-muted mt-1">
            כל נקודה = {STEP}px. הקווים האנכיים הדקים והסרגל מתחת מיושרים לאותו רוחב — אמור לי כמה נקודות להזיז כל רכיב.
          </p>
        </div>

        {!data ? (
          <p className="text-sm text-muted text-center py-8">טוען...</p>
        ) : (
          <div className="relative">
            <div className="flex flex-col gap-1">
              <PriorityCompanySection d={data} />
              <AlignmentRuler />
            </div>
            {/* Vertical gridlines: a darker major line every 5 dots, a
                faint minor line every dot — aligned with the ruler. */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  `repeating-linear-gradient(to right, rgba(99,102,241,0.28) 0, rgba(99,102,241,0.28) 1px, transparent 1px, transparent ${STEP * 5}px),` +
                  `repeating-linear-gradient(to right, rgba(99,102,241,0.12) 0, rgba(99,102,241,0.12) 1px, transparent 1px, transparent ${STEP}px)`,
              }}
            />
          </div>
        )}

        <Link to="/manager" className="text-sm text-primary self-start">→ חזור לפאנל</Link>
      </main>
    </>
  )
}
