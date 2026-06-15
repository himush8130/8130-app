import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { useDashboardData } from '../hooks/useDashboardData'
import { PriorityCompanySection } from './ManagerDashboardPage'

/** One dot = STEP pixels; HALF marks the half-point between dots. */
const STEP = 10
const HALF = STEP / 2

/** Horizontal ruler: a dot every HALF px. Full dots every STEP, larger
 *  numbered ticks every 5 dots, and tiny dots for the half-points. */
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

  const n = Math.floor(w / HALF)
  return (
    <div ref={ref} className="relative h-7 w-full">
      {Array.from({ length: n + 1 }, (_, j) => {
        const isFull = j % 2 === 0
        const dotIdx = j / 2
        const major = isFull && dotIdx % 5 === 0
        return (
          <div
            key={j}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: j * HALF, transform: 'translateX(-50%)' }}
          >
            <span className={`rounded-full ${
              major ? 'w-1 h-1 bg-primary'
                : isFull ? 'w-[3px] h-[3px] bg-muted'
                : 'w-px h-px bg-muted/60'
            }`} />
            {major && <span className="text-[7px] text-muted mt-0.5 font-mono leading-none">{dotIdx}</span>}
          </div>
        )
      })}
    </div>
  )
}

export function DevelopmentPage() {
  const { data } = useDashboardData()
  const wrapRef = useRef<HTMLDivElement>(null)
  // Center x of each component (cube + metrics), right-to-left order.
  const [centers, setCenters] = useState<number[]>([])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const measure = () => {
      const base = wrap.getBoundingClientRect()
      const els = wrap.querySelectorAll('.dev-cube, .dev-metric')
      const xs: number[] = []
      els.forEach(el => {
        const r = el.getBoundingClientRect()
        xs.push(r.left - base.left + r.width / 2)
      })
      xs.sort((a, b) => b - a) // RTL: rightmost component = #1
      setCenters(xs)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    const t = setTimeout(measure, 300)
    return () => { ro.disconnect(); clearTimeout(t) }
  }, [data])

  return (
    <>
      <AppHeader subtitle="פיתוח" showLogo wide />
      <main className="max-w-6xl mx-auto p-4 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">פיתוח — כלי יישור</h2>
          <p className="text-xs text-muted mt-1">
            כל נקודה = {STEP}px (נקודת חצי = {HALF}px). הקווים האדומים הם מרכז כל רכיב, ממוספרים מימין לשמאל.
            אמור לי למשל "רכיב 3 לנקודה 40" או "הזז רכיב 2 חצי נקודה ימינה".
          </p>
        </div>

        {!data ? (
          <p className="text-sm text-muted text-center py-8">טוען...</p>
        ) : (
          <div ref={wrapRef} className="relative">
            <div className="flex flex-col gap-1">
              <PriorityCompanySection d={data} />
              <AlignmentRuler />
            </div>

            {/* Vertical alignment gridlines — major every 5 dots, faint every dot. */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  `repeating-linear-gradient(to right, rgba(99,102,241,0.28) 0, rgba(99,102,241,0.28) 1px, transparent 1px, transparent ${STEP * 5}px),` +
                  `repeating-linear-gradient(to right, rgba(99,102,241,0.12) 0, rgba(99,102,241,0.12) 1px, transparent 1px, transparent ${STEP}px)`,
              }}
            />

            {/* Per-component centre lines + numbers. */}
            {centers.map((x, i) => (
              <div key={i} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: x }}>
                <div className="w-px h-full bg-red-500/70 -translate-x-1/2" />
                <span className="absolute top-0 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-bold rounded px-1 leading-tight">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        <Link to="/manager" className="text-sm text-primary self-start">→ חזור לפאנל</Link>
      </main>
    </>
  )
}
