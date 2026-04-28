import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useProfessionsWithUsage, type ProfessionWithUsage } from '../hooks/useProfessionsWithUsage'
import { useAuthStore } from '../store/auth'
import { createProfession, updateProfession, deleteProfession } from '../lib/adminActions'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function SettingsProfessionsPage() {
  const { data, isLoading, error } = useProfessionsWithUsage()
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['professions_with_usage'] })
    queryClient.invalidateQueries({ queryKey: ['manager_reports'] })
  }

  async function handleAdd() {
    setTopError(null)
    const name = newName.trim()
    if (!name) { setTopError('שם לא יכול להיות ריק'); return }
    setBusy(true)
    const res = await createProfession(employee.employee_number, name)
    setBusy(false)
    if (!res.ok) {
      setTopError(res.error === 'name_taken' ? 'שם זה כבר קיים' : 'שגיאה בהוספה')
      return
    }
    setNewName('')
    setAdding(false)
    refresh()
  }

  return (
    <>
      <AppHeader subtitle="הגדרות · מקצועות" />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-3 pb-24">
        <ComponentBadge id={3015} />
        <Link to="/manager" className="text-sm text-primary self-start">→ חזור לפאנל</Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">מקצועות במערכת</h3>
              {!adding && (
                <span className="contents">
                  <ComponentBadge id={3016} />
                  <Button onClick={() => { setAdding(true); setTopError(null) }}>+ הוסף מקצוע</Button>
                </span>
              )}
            </div>
          </CardHeader>

          {adding && (
            <CardBody className="border-b border-border bg-muted-surface flex flex-col gap-2">
              <Input
                label="שם המקצוע"
                name="newProfessionName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                error={topError ?? undefined}
              />
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={busy}>
                  {busy ? 'מוסיף...' : 'הוסף'}
                </Button>
                <Button variant="ghost" onClick={() => { setAdding(false); setNewName(''); setTopError(null) }}>
                  ביטול
                </Button>
              </div>
            </CardBody>
          )}

          {isLoading && <CardBody><p className="text-sm text-muted text-center">טוען...</p></CardBody>}
          {error && <CardBody><p className="text-sm text-danger">שגיאה בטעינת המקצועות</p></CardBody>}

          {data && data.length === 0 && !adding && (
            <CardBody><p className="text-sm text-muted text-center">אין מקצועות מוגדרים</p></CardBody>
          )}

          {data && data.map((p) => (
            <ProfessionRow
              key={p.id}
              profession={p}
              employeeNumber={employee.employee_number}
              onChange={refresh}
            />
          ))}
        </Card>
      </main>
    </>
  )
}

// ---------- single row ----------

function ProfessionRow({
  profession,
  employeeNumber,
  onChange,
}: {
  profession: ProfessionWithUsage
  employeeNumber: number
  onChange: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profession.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) { setError('שם לא יכול להיות ריק'); return }
    if (trimmed === profession.name) { setEditing(false); return }
    setBusy(true)
    const res = await updateProfession(employeeNumber, profession.id, trimmed)
    setBusy(false)
    if (!res.ok) {
      setError(res.error === 'name_taken' ? 'שם זה כבר קיים' : 'שגיאה בעדכון')
      return
    }
    setEditing(false)
    onChange()
  }

  async function remove() {
    setError(null)
    setBusy(true)
    const res = await deleteProfession(employeeNumber, profession.id)
    setBusy(false)
    if (!res.ok) {
      if (res.error === 'in_use') {
        setError(`לא ניתן למחוק — בשימוש: ${res.vehicles ?? 0} רכבים, ${res.employees ?? 0} עובדים`)
      } else {
        setError('שגיאה במחיקה')
      }
      setConfirmDelete(false)
      return
    }
    onChange()
  }

  const totalUsage = profession.vehicles_count + profession.employees_count

  return (
    <div className="px-4 py-3 border-b border-border last:border-0 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {!editing ? (
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <span className="text-sm font-medium text-foreground">{profession.name}</span>
            <span className="text-xs text-muted">
              {profession.vehicles_count} רכבים · {profession.employees_count} עובדים
            </span>
          </div>
        ) : (
          <Input
            name={`edit-prof-${profession.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error ?? undefined}
            className="max-w-xs"
            autoFocus
          />
        )}

        {!editing && !confirmDelete && (
          <div className="flex gap-2">
            <span className="contents">
              <ComponentBadge id={3017} />
              <Button variant="secondary" onClick={() => { setEditing(true); setName(profession.name); setError(null) }}>
                ערוך
              </Button>
            </span>
            <span className="contents">
              <ComponentBadge id={3018} />
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                מחק
              </Button>
            </span>
          </div>
        )}

        {editing && (
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy}>
              {busy ? 'שומר...' : 'שמור'}
            </Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setName(profession.name); setError(null) }}>
              ביטול
            </Button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="flex flex-col gap-2 p-2 bg-danger/5 rounded-md">
          <p className="text-sm text-foreground">
            למחוק את המקצוע "{profession.name}"?
            {totalUsage > 0 && <span className="text-warning ms-1">(בשימוש כעת — המחיקה תיכשל)</span>}
          </p>
          <div className="flex gap-2">
            <Button onClick={remove} disabled={busy}>
              {busy ? 'מוחק...' : 'אשר מחיקה'}
            </Button>
            <Button variant="ghost" onClick={() => { setConfirmDelete(false); setError(null) }}>ביטול</Button>
          </div>
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      )}

      {!editing && !confirmDelete && error && (
        <span className="text-xs text-danger">{error}</span>
      )}
    </div>
  )
}
