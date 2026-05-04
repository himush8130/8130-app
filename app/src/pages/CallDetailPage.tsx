import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCallDetail } from '../hooks/useCallDetail'
import { useAuthStore } from '../store/auth'
import { AppHeader } from '../components/AppHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { CallPartsSection } from '../components/CallPartsSection'
import { CallActions } from '../components/CallActions'
import { AddCommentForm } from '../components/AddCommentForm'
import { CallContactsPanel } from '../components/CallContactsPanel'
import { PhoneActions } from '../components/PhoneActions'
import { CopyCallSummaryButton } from '../components/CopyCallSummaryButton'
import { EditCallForm } from '../components/EditCallForm'
import { ComponentBadge } from '../feedback/ComponentBadge'
import { deleteCall } from '../lib/managerActions'
import type { CallStatus, EmployeePermissions } from '../types/db'

const homeRouteByPermissions: Record<EmployeePermissions, string> = {
  technician: '/technician',
  manager:    '/manager',
  warehouse:  '/warehouse',
}

const statusLabel: Record<CallStatus, string> = {
  new:               'חדשה',
  in_treatment:      'בטיפול',
  waiting_for_parts: 'ממתינה לחלקים',
  closed:            'סגורה',
  cancelled:         'בוטלה',
}

const statusTone: Record<CallStatus, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  new:               'danger',
  in_treatment:      'info',
  waiting_for_parts: 'warning',
  closed:            'success',
  cancelled:         'neutral',
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  )
}

export function CallDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const employee = useAuthStore((s) => s.employee)
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useCallDetail(id)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!data || !employee) return
    setDeleting(true); setDeleteError(null)
    const res = await deleteCall(employee.employee_number, data.call.id)
    setDeleting(false)
    if (!res.ok) {
      setDeleteError(res.detail || res.error || 'מחיקה נכשלה')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['service_calls'] })
    queryClient.invalidateQueries({ queryKey: ['technician_calls'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle_history'] })
    navigate(employee ? homeRouteByPermissions[employee.permissions] : '/login', { replace: true })
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(employee ? homeRouteByPermissions[employee.permissions] : '/login', { replace: true })
    }
  }

  if (isLoading) {
    return (
      <>
        <AppHeader />
        <main className="max-w-3xl mx-auto p-4">
          <p className="text-sm text-muted text-center py-8">טוען...</p>
        </main>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <AppHeader />
        <main className="max-w-3xl mx-auto p-4">
          <Card className="mt-4">
            <CardBody>
              <p className="text-danger text-sm">לא ניתן לטעון את הקריאה</p>
            </CardBody>
          </Card>
        </main>
      </>
    )
  }

  const { call, comments, requiredParts, withdrawals } = data
  const created = new Date(call.created_at).toLocaleString('he-IL')

  return (
    <>
      <AppHeader subtitle={`קריאה ${call.display_id}`} />

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        <ComponentBadge id={5001} />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button variant="ghost" onClick={handleBack} className="text-primary">
            → חזור
          </Button>
          <div className="flex gap-1.5 flex-wrap">
            <CopyCallSummaryButton call={call} />
            {!editing && !confirmDelete && (
              <>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <ComponentBadge id={5016} />
                  ערוך
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                  <ComponentBadge id={5017} />
                  מחק
                </Button>
              </>
            )}
          </div>
        </div>

        {confirmDelete && (
          <Card>
            <CardBody className="bg-danger/5">
              <p className="text-sm text-foreground">
                למחוק לצמיתות את קריאה <strong>{call.display_id}</strong>?
                גם תגובות, חלקים נדרשים ויציאות מלאי שצמודות אליה יימחקו.
              </p>
              <div className="flex gap-2 items-center mt-2">
                <Button onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'מוחק...' : 'אשר מחיקה'}
                </Button>
                <Button variant="ghost" onClick={() => { setConfirmDelete(false); setDeleteError(null) }}>
                  ביטול
                </Button>
                {deleteError && <span className="text-xs text-danger">{deleteError}</span>}
              </div>
            </CardBody>
          </Card>
        )}

        {editing && (
          <EditCallForm
            call={call}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground">{call.display_id}</h2>
              <div className="flex gap-2 flex-wrap">
                <Badge tone={statusTone[call.status]}>{statusLabel[call.status]}</Badge>
                {call.profession_name && (
                  <Badge tone="neutral">{call.profession_name}</Badge>
                )}
                {call.is_disabling && (
                  <Badge tone="danger">⛔ משביתה</Badge>
                )}
                {call.anomaly_flags.length > 0 && (
                  <Badge tone="warning">{call.anomaly_flags.length} חריגות</Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardBody className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted">מספר רכב</span>
              {call.vehicle_number ? (
                <Link
                  to={`/vehicle/${encodeURIComponent(call.vehicle_number)}`}
                  className="text-sm text-primary hover:underline"
                >
                  {call.vehicle_number} ↩
                </Link>
              ) : (
                <span className="text-sm text-foreground">—</span>
              )}
            </div>
            <FieldRow label="שם רכב"   value={call.vehicle_name} />
            <FieldRow label="מקצוע"    value={call.profession_name ?? null} />
            <FieldRow label="מדווח"    value={call.reporter_name} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted">טלפון</span>
              {call.reporter_phone
                ? <PhoneActions phone={call.reporter_phone} />
                : <span className="text-sm text-foreground">—</span>}
            </div>
            <FieldRow label="נוצרה ב-" value={created} />
          </CardBody>

          {call.description && (
            <CardBody className="border-t border-border">
              <span className="text-xs text-muted">תיאור</span>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                {call.description}
              </p>
            </CardBody>
          )}

          {call.anomaly_flags.length > 0 && (
            <CardBody className="border-t border-border bg-muted-surface">
              <span className="text-xs text-muted">חריגות</span>
              <ul className="text-sm text-foreground mt-1 list-disc me-5">
                {call.anomaly_flags.map((a, i) => (
                  <li key={i}>
                    {a.code}{a.detail ? ` — ${a.detail}` : ''}
                  </li>
                ))}
              </ul>
            </CardBody>
          )}
        </Card>

        <CallActions call={call} />

        <CallContactsPanel professionName={call.profession_name} />

        <CallPartsSection
          callId={call.id}
          requiredParts={requiredParts}
          withdrawals={withdrawals}
        />

        <Card>
          <CardHeader>
            <ComponentBadge id={5008} />
            <h3 className="text-sm font-semibold text-foreground">הערות</h3>
          </CardHeader>
          <CardBody>
            {comments.length === 0 ? (
              <p className="text-sm text-muted">אין הערות עדיין</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {comments.map((c) => (
                  <li key={c.id} className="border-s-2 border-primary ps-3">
                    <div className="text-xs text-muted">
                      {c.author_employee_number ?? 'אנונימי'} ·{' '}
                      {new Date(c.created_at).toLocaleString('he-IL')}
                    </div>
                    <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{c.text}</p>
                  </li>
                ))}
              </ul>
            )}
            <AddCommentForm callId={call.id} />
          </CardBody>
        </Card>
      </main>
    </>
  )
}
