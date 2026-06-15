import { useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useParts } from '../hooks/useParts'
import { useInventorySession, useInventoryEntries, type IcEntry } from '../hooks/useInventoryCount'
import { useAuthStore } from '../store/auth'
import { AppHeader } from '../components/AppHeader'
import { ExchangeBadge } from '../components/ExchangeBadge'
import { PartEditForm } from '../components/PartEditForm'
import { WarehouseSelect } from '../components/WarehouseSelect'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { createPart, setPartQuantity, icOpenSession, icToggleSession, icResetSession, icUpsertEntry, icRemoveEntry } from '../lib/warehouseActions'
import type { Part } from '../types/parts'

// --------------- page ---------------

export function InventoryCountPage() {
  const employee = useAuthStore((s) => s.employee)!
  const queryClient = useQueryClient()
  const { data: allParts, isLoading } = useParts()
  const { data: session } = useInventorySession()
  const { data: entries = new Map<string, IcEntry>() } = useInventoryEntries(session?.id ?? null)

  // cascading location filter state
  const [fWarehouse, setFWarehouse]       = useState<string | null>(null)
  const [fCabinet, setFCabinet]           = useState<string | null>(null)
  const [fStorageType, setFStorageType]   = useState<string | null>(null)
  const [fStorageNum, setFStorageNum]     = useState<string | null>(null)
  const [fCell, setFCell]                 = useState<string | null>(null)

  const [skuSearch, setSkuSearch]         = useState('')

  // Cascading filter: each level narrows the pool for the next.
  // Options at each level are computed from the parts that passed
  // all previous filters, with counts. Parts with quantity=0 are
  // excluded — nothing to count on the shelf.
  const filterLevels = useMemo(() => {
    const all = (allParts ?? []).filter((p) => p.quantity > 0)

    // Level 1: warehouse
    const warehouseOpts = new Map<string, number>()
    for (const p of all) {
      const k = p.warehouse || 'ללא מחסן'
      warehouseOpts.set(k, (warehouseOpts.get(k) ?? 0) + 1)
    }

    // Level 2: cabinet (filtered by warehouse selection)
    const afterWarehouse = fWarehouse
      ? all.filter((p) => (p.warehouse || 'ללא מחסן') === fWarehouse)
      : []
    const cabinetOpts = new Map<string, number>()
    for (const p of afterWarehouse) {
      const k = p.cabinet != null && p.cabinet !== 0 ? `ארון ${p.cabinet}` : 'ללא ארון'
      cabinetOpts.set(k, (cabinetOpts.get(k) ?? 0) + 1)
    }

    // Level 3: storage_type (filtered by warehouse + cabinet)
    const afterCabinet = fCabinet
      ? afterWarehouse.filter((p) => {
          const k = p.cabinet != null && p.cabinet !== 0 ? `ארון ${p.cabinet}` : 'ללא ארון'
          return k === fCabinet
        })
      : []
    const storageTypeOpts = new Map<string, number>()
    for (const p of afterCabinet) {
      const k = p.storage_type || 'ללא מאחסן'
      storageTypeOpts.set(k, (storageTypeOpts.get(k) ?? 0) + 1)
    }

    // Level 4: storage_number
    const afterStorageType = fStorageType
      ? afterCabinet.filter((p) => (p.storage_type || 'ללא מאחסן') === fStorageType)
      : []
    const storageNumOpts = new Map<string, number>()
    for (const p of afterStorageType) {
      const k = p.storage_number != null && p.storage_number !== 0 ? `#${p.storage_number}` : 'ללא מספר'
      storageNumOpts.set(k, (storageNumOpts.get(k) ?? 0) + 1)
    }

    // Level 5: cell_number
    const afterStorageNum = fStorageNum
      ? afterStorageType.filter((p) => {
          const k = p.storage_number != null && p.storage_number !== 0 ? `#${p.storage_number}` : 'ללא מספר'
          return k === fStorageNum
        })
      : []
    const cellOpts = new Map<string, number>()
    for (const p of afterStorageNum) {
      const k = p.cell_number != null && p.cell_number !== 0 ? `תא ${p.cell_number}` : 'ללא תא'
      cellOpts.set(k, (cellOpts.get(k) ?? 0) + 1)
    }

    return { warehouseOpts, cabinetOpts, storageTypeOpts, storageNumOpts, cellOpts }
  }, [allParts, fWarehouse, fCabinet, fStorageType, fStorageNum])

  // The parts that match ALL selected filters (the "deepest" active level)
  const filteredParts = useMemo(() => {
    let list = (allParts ?? []).filter((p) => p.quantity > 0)
    if (fWarehouse)   list = list.filter((p) => (p.warehouse || 'ללא מחסן') === fWarehouse)
    if (fCabinet)     list = list.filter((p) => {
      const k = p.cabinet != null && p.cabinet !== 0 ? `ארון ${p.cabinet}` : 'ללא ארון'
      return k === fCabinet
    })
    if (fStorageType) list = list.filter((p) => (p.storage_type || 'ללא מאחסן') === fStorageType)
    if (fStorageNum)  list = list.filter((p) => {
      const k = p.storage_number != null && p.storage_number !== 0 ? `#${p.storage_number}` : 'ללא מספר'
      return k === fStorageNum
    })
    if (fCell)        list = list.filter((p) => {
      const k = p.cell_number != null && p.cell_number !== 0 ? `תא ${p.cell_number}` : 'ללא תא'
      return k === fCell
    })
    return list.sort((a, b) => a.name.localeCompare(b.name, 'he'))
  }, [allParts, fWarehouse, fCabinet, fStorageType, fStorageNum, fCell])

  const hasAnyFilter = fWarehouse != null

  // SKU search across all parts
  const skuMatches = useMemo(() => {
    const q = skuSearch.trim().replace(/\D/g, '')
    if (!q || q.length < 2) return []
    return (allParts ?? []).filter((p) => p.quantity > 0 && p.sku.replace(/\D/g, '').startsWith(q)).slice(0, 20)
  }, [allParts, skuSearch])

  function invalidateIC() {
    queryClient.invalidateQueries({ queryKey: ['ic_session'] })
    queryClient.invalidateQueries({ queryKey: ['ic_entries'] })
  }

  async function openSession() {
    await icOpenSession(employee.employee_number)
    invalidateIC()
  }

  async function toggleSessionStatus() {
    if (!session) return
    await icToggleSession(employee.employee_number, session.id)
    invalidateIC()
  }

  const [confirmReset, setConfirmReset] = useState(false)
  async function resetSession() {
    if (!session) return
    await icResetSession(employee.employee_number, session.id)
    invalidateIC()
    setConfirmReset(false)
  }

  const upsertEntry = useCallback(async (part: Part, countedQty: number) => {
    if (!session) return false
    const res = await icUpsertEntry(employee.employee_number, session.id, part.id, countedQty, part.quantity)
    if (!res.ok) return false
    queryClient.invalidateQueries({ queryKey: ['ic_entries', session.id] })
    return true
  }, [session, employee.employee_number, queryClient])

  const removeEntry = useCallback(async (partId: string) => {
    if (!session) return
    await icRemoveEntry(employee.employee_number, session.id, partId)
    queryClient.invalidateQueries({ queryKey: ['ic_entries', session.id] })
  }, [session, employee.employee_number, queryClient])


  // Only parts with quantity > 0 are relevant for counting.
  const countableParts = useMemo(() => (allParts ?? []).filter((p) => p.quantity > 0), [allParts])
  const totalParts = countableParts.length
  const countedCount = entries.size
  const withDelta = [...entries.values()].filter((e) => e.counted_qty !== e.expected_qty).length

  return (
    <>
      <AppHeader subtitle="ספירת מלאי" />
      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4 pb-24">
        <Link to="/warehouse" className="self-start text-sm text-primary hover:underline">
          → חזור למחסנאי
        </Link>

        {isLoading && <p className="text-sm text-muted text-center py-8">טוען קטלוג...</p>}

        {/* Session control */}
        {!session && (
          <Card>
            <CardBody className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted">אין ספירה פעילה</p>
              <Button onClick={openSession}>פתח ספירת מלאי חדשה</Button>
            </CardBody>
          </Card>
        )}

        {session && (
          <>
            {/* Stats bar */}
            <Card>
              <CardBody className="flex items-center justify-between gap-3 flex-wrap text-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${session.status === 'open' ? 'bg-success/15 text-success' : 'bg-muted-surface text-muted'}`}>
                    {session.status === 'open' ? 'ספירה פעילה' : 'ספירה סגורה'}
                  </span>
                  <span className="text-muted">נספרו: <span className="font-semibold text-foreground">{countedCount}</span> / {totalParts}</span>
                  {withDelta > 0 && (
                    <span className="text-warning">פערים: <span className="font-semibold">{withDelta}</span></span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={toggleSessionStatus} className="text-xs px-3 py-1">
                    {session.status === 'open' ? 'סגור ספירה' : 'פתח מחדש'}
                  </Button>
                  {!confirmReset ? (
                    <Button variant="ghost" onClick={() => setConfirmReset(true)} className="text-xs px-3 py-1 text-danger">
                      אפס הכל
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 bg-danger/5 rounded-md px-2 py-1">
                      <span className="text-[11px] text-danger">פעולה זו אינה הפיכה</span>
                      <Button onClick={resetSession} className="text-[11px] px-2 py-0.5 bg-danger hover:bg-danger/90 text-white">
                        אשר
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmReset(false)} className="text-[11px] px-2 py-0.5">
                        בטל
                      </Button>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* SKU quick search */}
            <Card>
              <CardBody className="flex flex-col gap-2">
                <Input
                  label="חיפוש מהיר לפי מק״ט"
                  name="ic-sku-search"
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  placeholder="הקלד מק״ט..."
                />
                {skuMatches.length > 0 && (
                  <ul className="bg-card border border-border rounded-md max-h-80 overflow-y-auto">
                    {skuMatches.map((p) => (
                      <CountRow
                        key={p.id}
                        part={p}
                        entry={entries.get(p.id)}
                        sessionOpen={session.status === 'open'}
                        onSave={upsertEntry}
                        onRemove={removeEntry}
                        employeeNumber={employee.employee_number}
                      />
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            {/* Cascading location filter */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">סינון לפי מיקום</h3>
                  {hasAnyFilter && (
                    <button
                      type="button"
                      onClick={() => { setFWarehouse(null); setFCabinet(null); setFStorageType(null); setFStorageNum(null); setFCell(null) }}
                      className="text-xs text-primary hover:underline"
                    >
                      נקה סינון
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardBody className="flex flex-col gap-2">
                <FilterRow
                  label="מחסן"
                  options={filterLevels.warehouseOpts}
                  selected={fWarehouse}
                  onSelect={(v) => { setFWarehouse(v); setFCabinet(null); setFStorageType(null); setFStorageNum(null); setFCell(null) }}
                />
                {fWarehouse && (
                  <FilterRow
                    label="ארון"
                    options={filterLevels.cabinetOpts}
                    selected={fCabinet}
                    onSelect={(v) => { setFCabinet(v); setFStorageType(null); setFStorageNum(null); setFCell(null) }}
                  />
                )}
                {fCabinet && (
                  <FilterRow
                    label="מאחסן"
                    options={filterLevels.storageTypeOpts}
                    selected={fStorageType}
                    onSelect={(v) => { setFStorageType(v); setFStorageNum(null); setFCell(null) }}
                  />
                )}
                {fStorageType && (
                  <FilterRow
                    label="מספר מאחסן"
                    options={filterLevels.storageNumOpts}
                    selected={fStorageNum}
                    onSelect={(v) => { setFStorageNum(v); setFCell(null) }}
                  />
                )}
                {fStorageNum && (
                  <FilterRow
                    label="תא"
                    options={filterLevels.cellOpts}
                    selected={fCell}
                    onSelect={setFCell}
                  />
                )}
              </CardBody>
            </Card>

            {/* Filtered parts list */}
            {hasAnyFilter && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">פריטים ({filteredParts.length})</h3>
                    <span className="text-xs text-muted">
                      {filteredParts.filter((p) => entries.has(p.id)).length}/{filteredParts.length} נספרו
                    </span>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  {filteredParts.length === 0 && (
                    <p className="text-sm text-muted text-center py-4">אין פריטים במיקום זה</p>
                  )}
                  <ul>
                    {filteredParts.map((p) => (
                      <CountRow
                        key={p.id}
                        part={p}
                        entry={entries.get(p.id)}
                        sessionOpen={session.status === 'open'}
                        onSave={upsertEntry}
                        onRemove={removeEntry}
                        employeeNumber={employee.employee_number}
                      />
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {/* Add new part */}
            {session.status === 'open' && <AddNewPartForm employeeNumber={employee.employee_number} />}

            {/* Report summary (live) */}
            {countedCount > 0 && (
              <ReportSummary allParts={countableParts} entries={entries} employee={employee} />
            )}
          </>
        )}

        {/* Scroll-to-top */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="self-center text-xs px-4 py-2 rounded-md border border-border bg-card text-muted hover:bg-muted-surface"
        >
          ↑ חזרה לראש הדף
        </button>
      </main>
    </>
  )
}

// --------------- count row ---------------

function CountRow({
  part, entry, sessionOpen, onSave, onRemove, employeeNumber,
}: {
  part:        Part
  entry:       IcEntry | undefined
  sessionOpen: boolean
  onSave:      (part: Part, qty: number) => Promise<boolean>
  onRemove:    (partId: string) => void
  employeeNumber: number
}) {
  const [qty, setQty] = useState(entry?.counted_qty?.toString() ?? part.quantity.toString())
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [editPart, setEditPart] = useState(false)
  const [editSaved, setEditSaved] = useState(false)

  const counted = entry != null
  const hasDelta = counted && entry!.counted_qty !== entry!.expected_qty
  const delta = counted ? entry!.counted_qty - entry!.expected_qty : 0

  async function save() {
    const n = parseInt(qty, 10)
    if (!Number.isFinite(n) || n < 0) return
    setSaving(true)
    setSaveError(false)
    const ok = await onSave(part, n)
    setSaving(false)
    if (!ok) setSaveError(true)
  }

  function handleRemove() {
    onRemove(part.id)
    setConfirmRemove(false)
    setQty(part.quantity.toString())
  }

  function handleEditDone() {
    setEditPart(false)
    setEditSaved(true)
    setTimeout(() => setEditSaved(false), 1500)
  }

  const locParts: string[] = []
  if (part.warehouse) locParts.push(part.warehouse)
  if (part.cabinet != null && part.cabinet !== 0) locParts.push(`ארון ${part.cabinet}`)
  if (part.storage_type) locParts.push(part.storage_type)
  if (part.storage_number != null && part.storage_number !== 0) locParts.push(`#${part.storage_number}`)
  if (part.cell_number != null && part.cell_number !== 0) locParts.push(`תא ${part.cell_number}`)

  const savedQtyStr = counted ? entry!.counted_qty.toString() : null
  const canSave = qty !== '' && (savedQtyStr === null || qty !== savedQtyStr)

  return (
    <li className={`px-3 py-2 border-b border-border last:border-0 ${hasDelta ? 'bg-warning/5' : counted ? 'bg-success/5' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap flex-1">
          <span className="text-sm text-foreground font-medium truncate">{part.name}</span>
          <ExchangeBadge active={part.is_exchange} />
          <span className="font-mono text-[11px] text-muted">{part.sku}</span>
        </div>
        <span className="text-xs text-muted shrink-0">רשום: {part.quantity}</span>
      </div>

      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[11px] text-muted">{locParts.length > 0 ? locParts.join(' · ') : 'ללא מיקום'}</span>
        {editSaved && <span className="text-[11px] text-success">✓</span>}
        {sessionOpen && !editPart && (
          <button type="button" onClick={() => setEditPart(true)} className="text-[11px] text-primary hover:underline">
            ערוך
          </button>
        )}
      </div>

      {editPart && (
        <div className="mt-1.5 bg-muted-surface/50 rounded-md p-2">
          <PartEditForm
            part={part}
            employeeNumber={employeeNumber}
            onDone={handleEditDone}
            onCancel={() => setEditPart(false)}
          />
        </div>
      )}

      {sessionOpen && (
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="כמות"
            className="w-20 px-2 py-1 bg-card border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            onClick={save}
            disabled={!canSave || saving}
            className="text-xs px-3 py-1"
          >
            {saving ? '...' : 'שמור'}
          </Button>
          {saveError && <span className="text-[11px] text-danger">שגיאה בשמירה</span>}
          {counted && qty !== savedQtyStr && (
            <Button variant="ghost" onClick={() => setQty(savedQtyStr!)} className="text-xs px-3 py-1">
              בטל
            </Button>
          )}
          {counted && (
            <span className={`text-xs ${hasDelta ? 'font-semibold text-warning' : 'text-success'}`}>
              נספר: {entry!.counted_qty}
              {hasDelta && ` (${delta > 0 ? '+' : ''}${delta})`}
            </span>
          )}
          {counted && !confirmRemove && (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="text-[11px] text-danger hover:underline ms-auto"
            >
              בטל ספירה
            </button>
          )}
          {confirmRemove && (
            <div className="flex items-center gap-2 bg-danger/5 rounded px-2 py-1 ms-auto">
              <span className="text-[11px] text-danger">בטוח?</span>
              <Button onClick={handleRemove} className="text-[11px] px-2 py-0.5 bg-danger hover:bg-danger/90 text-white">
                אשר
              </Button>
              <Button variant="ghost" onClick={() => setConfirmRemove(false)} className="text-[11px] px-2 py-0.5">
                לא
              </Button>
            </div>
          )}
        </div>
      )}

      {!sessionOpen && counted && (
        <div className="mt-1 text-xs">
          <span className={hasDelta ? 'font-semibold text-warning' : 'text-success'}>
            נספר: {entry!.counted_qty}
            {hasDelta && ` (${delta > 0 ? '+' : ''}${delta})`}
          </span>
        </div>
      )}
    </li>
  )
}

// --------------- report summary ---------------

function ReportSummary({ allParts, entries, employee }: {
  allParts: Part[]
  entries: Map<string, IcEntry>
  employee: { employee_number: number; permissions: string }
}) {
  const queryClient = useQueryClient()
  const { matching, surplus, shortage, notCounted } = useMemo(() => {
    const matching:  Array<{ part: Part; entry: IcEntry }> = []
    const surplus:   Array<{ part: Part; entry: IcEntry; delta: number }> = []
    const shortage:  Array<{ part: Part; entry: IcEntry; delta: number }> = []
    const notCounted: Part[] = []

    for (const p of allParts) {
      const e = entries.get(p.id)
      if (!e) { notCounted.push(p); continue }
      const d = e.counted_qty - e.expected_qty
      if (d === 0) matching.push({ part: p, entry: e })
      else if (d > 0) surplus.push({ part: p, entry: e, delta: d })
      else shortage.push({ part: p, entry: e, delta: d })
    }
    surplus.sort((a, b) => b.delta - a.delta)
    shortage.sort((a, b) => a.delta - b.delta)
    return { matching, surplus, shortage, notCounted }
  }, [allParts, entries])

  const [showSurplus, setShowSurplus]     = useState(false)
  const [showShortage, setShowShortage]   = useState(false)
  const [showNotCounted, setShowNotCounted] = useState(false)
  const [showMatching, setShowMatching]   = useState(false)
  const [confirmUpdate, setConfirmUpdate] = useState(false)
  const [updating, setUpdating]           = useState(false)
  const [updateDone, setUpdateDone]       = useState(false)

  const deltaItems = useMemo(() => [...surplus, ...shortage], [surplus, shortage])
  const isManager = employee.permissions === 'manager'

  async function applyStockUpdate() {
    setUpdating(true)
    for (const { part, entry } of deltaItems) {
      await setPartQuantity(employee.employee_number, part.id, entry.counted_qty)
    }
    setUpdating(false)
    setConfirmUpdate(false)
    setUpdateDone(true)
    queryClient.invalidateQueries({ queryKey: ['parts'] })
  }

  function buildCsv(): string {
    const lines: string[] = ['שם,מק״ט,רשום,נספר,פער,קטגוריה']
    for (const { part, entry, delta } of surplus) {
      lines.push(`"${part.name}","${part.sku}",${entry.expected_qty},${entry.counted_qty},+${delta},עודף`)
    }
    for (const { part, entry, delta } of shortage) {
      lines.push(`"${part.name}","${part.sku}",${entry.expected_qty},${entry.counted_qty},${delta},חוסר`)
    }
    for (const { part, entry } of matching) {
      lines.push(`"${part.name}","${part.sku}",${entry.expected_qty},${entry.counted_qty},0,התאמה`)
    }
    for (const p of notCounted) {
      lines.push(`"${p.name}","${p.sku}",${p.quantity},,,"לא נספר"`)
    }
    return '﻿' + lines.join('\n')
  }

  function downloadReport() {
    const csv = buildCsv()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-count-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">דוח ספירה (חי)</h3>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={downloadReport} className="text-xs px-3 py-1">
              ⬇ הורד דוח CSV
            </Button>
            {isManager && deltaItems.length > 0 && !updateDone && (
              <Button onClick={() => setConfirmUpdate(true)} disabled={updating} className="text-xs px-3 py-1 bg-danger hover:bg-danger/90 text-white">
                עדכן מלאי
              </Button>
            )}
            {updateDone && (
              <span className="text-xs text-success font-semibold self-center">✓ המלאי עודכן</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-3 text-xs">
        {confirmUpdate && (
          <div className="bg-danger/5 border border-danger/30 rounded-md px-3 py-3 flex flex-col gap-2">
            <p className="text-sm text-danger font-semibold">שים לב! יש לבצע עדכון מלאי רק בסיום הספירה ולאחר שנשמר דוח הספירה</p>
            <p className="text-xs text-muted">פעולה זו תעדכן את הכמות הרשומה של {deltaItems.length} פריטים בעודף או בחוסר לכמות שנספרה. פעולה זו אינה הפיכה.</p>
            <div className="flex gap-2">
              <Button onClick={applyStockUpdate} disabled={updating} className="text-xs px-3 py-1 bg-danger hover:bg-danger/90 text-white">
                {updating ? `מעדכן... (${deltaItems.length} פריטים)` : 'אשר עדכון מלאי'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmUpdate(false)} disabled={updating} className="text-xs px-3 py-1">
                ביטול
              </Button>
            </div>
          </div>
        )}

        {/* Shortage */}
        {shortage.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowShortage((v) => !v)} className="font-semibold text-danger hover:underline">
              חוסר ({shortage.length}) {showShortage ? '▴' : '▾'}
            </button>
            {showShortage && (
              <DeltaTable rows={shortage} />
            )}
          </div>
        )}

        {/* Surplus */}
        {surplus.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowSurplus((v) => !v)} className="font-semibold text-success hover:underline">
              עודף ({surplus.length}) {showSurplus ? '▴' : '▾'}
            </button>
            {showSurplus && (
              <DeltaTable rows={surplus} />
            )}
          </div>
        )}

        {/* Not counted */}
        {notCounted.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowNotCounted((v) => !v)} className="font-semibold text-warning hover:underline">
              לא נספרו ({notCounted.length}) {showNotCounted ? '▴' : '▾'}
            </button>
            {showNotCounted && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {notCounted.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-muted">
                    <span className="truncate">{p.name}</span>
                    <span className="font-mono shrink-0">{p.sku} · {p.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Matching */}
        {matching.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowMatching((v) => !v)} className="font-semibold text-muted hover:underline">
              התאמה ({matching.length}) {showMatching ? '▴' : '▾'}
            </button>
            {showMatching && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {matching.map(({ part }) => (
                  <li key={part.id} className="flex items-center justify-between gap-2 text-muted">
                    <span className="truncate">{part.name}</span>
                    <span className="font-mono shrink-0">{part.sku} · {part.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function DeltaTable({ rows }: { rows: Array<{ part: Part; entry: IcEntry; delta: number }> }) {
  return (
    <table className="w-full mt-1 text-[11px]">
      <thead>
        <tr className="text-muted text-[10px] border-b border-border">
          <th className="text-start py-1 pe-2 font-medium">שם</th>
          <th className="text-start py-1 pe-2 font-medium">מק״ט</th>
          <th className="text-start py-1 pe-2 font-medium">מחסן</th>
          <th className="text-start py-1 pe-1 font-medium">רשום</th>
          <th className="text-start py-1 pe-1 font-medium">נספר</th>
          <th className="text-start py-1 font-medium">פער</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ part, entry, delta }) => (
          <tr key={part.id} className="border-b border-border last:border-0">
            <td className="py-1 pe-2 text-foreground">{part.name}</td>
            <td className="py-1 pe-2 font-mono text-muted">{part.sku}</td>
            <td className="py-1 pe-2 text-muted whitespace-nowrap">{part.warehouse ?? '—'}</td>
            <td className="py-1 pe-1 text-muted">{entry.expected_qty}</td>
            <td className="py-1 pe-1 text-foreground font-medium">{entry.counted_qty}</td>
            <td className={`py-1 font-semibold ${delta > 0 ? 'text-success' : 'text-danger'}`}>
              {delta > 0 ? `+${delta}` : delta}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// --------------- cascading filter row ---------------

function FilterRow({
  label, options, selected, onSelect,
}: {
  label:    string
  options:  Map<string, number>
  selected: string | null
  onSelect: (value: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const sorted = useMemo(
    () => [...options.entries()].sort((a, b) => a[0].localeCompare(b[0], 'he')),
    [options],
  )

  if (options.size === 0) return null

  const singleOption = options.size === 1

  // Auto-select if only one option and nothing chosen yet
  if (singleOption && !selected) {
    const only = sorted[0][0]
    onSelect(only)
    return null
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] text-muted font-medium">{label}</div>
      {!selected ? (
        <div className="flex flex-wrap gap-1.5">
          {sorted.map(([value, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => { onSelect(value); setOpen(false) }}
              className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted-surface transition-colors"
            >
              {value} <span className="text-muted">({count})</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => { if (!singleOption) setOpen((v) => !v) }}
            className={`text-xs px-2.5 py-1.5 rounded-md font-semibold ${
              singleOption
                ? 'border border-border bg-muted-surface/50 text-muted cursor-default'
                : 'border-2 border-primary bg-primary/10 text-foreground'
            }`}
          >
            {selected} <span className="text-muted">({options.get(selected) ?? 0})</span>
            {!singleOption && ' ▾'}
          </button>
          <button
            type="button"
            onClick={() => { onSelect(null); setOpen(false) }}
            className="text-[11px] text-primary hover:underline"
          >
            נקה
          </button>
          {open && !singleOption && (
            <div className="flex flex-wrap gap-1.5">
              {sorted.filter(([v]) => v !== selected).map(([value, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { onSelect(value); setOpen(false) }}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted-surface transition-colors"
                >
                  {value} <span className="text-muted">({count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --------------- add new part ---------------

function AddNewPartForm({ employeeNumber }: { employeeNumber: number }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({
    sku: '', name: '', quantity: '0', min_threshold: '0',
    supplier: '', is_exchange: false, is_sku_blocked: false,
    warehouse: '', cabinet: '', storage_type: '',
    storage_number: '', cell_number: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  function nullableInt(s: string): number | null {
    const t = s.trim()
    if (!t) return null
    const n = parseInt(t, 10)
    return Number.isNaN(n) ? null : n
  }

  function resetForm() {
    setDraft({
      sku: '', name: '', quantity: '0', min_threshold: '0',
      supplier: '', is_exchange: false, is_sku_blocked: false,
      warehouse: '', cabinet: '', storage_type: '',
      storage_number: '', cell_number: '',
    })
    setError(null)
  }

  async function save() {
    setError(null)
    if (!draft.sku.trim())  { setError('מק״ט חובה'); return }
    if (!draft.name.trim()) { setError('שם חובה'); return }
    const q = parseInt(draft.quantity, 10)
    if (Number.isNaN(q) || q < 0) { setError('כמות לא תקינה'); return }
    const m = parseInt(draft.min_threshold, 10)
    if (Number.isNaN(m) || m < 0) { setError('סף מינימום לא תקין'); return }

    setBusy(true)
    const res = await createPart(employeeNumber, {
      sku:            draft.sku.trim(),
      name:           draft.name.trim(),
      quantity:       q,
      min_threshold:  m,
      supplier:       draft.supplier.trim() || null,
      is_exchange:    draft.is_exchange,
      is_sku_blocked: draft.is_sku_blocked,
      warehouse:      draft.warehouse.trim()    || null,
      cabinet:        nullableInt(draft.cabinet),
      storage_type:   draft.storage_type.trim() || null,
      storage_number: nullableInt(draft.storage_number),
      cell_number:    nullableInt(draft.cell_number),
    })
    setBusy(false)
    if (!res.ok) { setError('שגיאה ביצירת פריט'); return }
    queryClient.invalidateQueries({ queryKey: ['parts'] })
    resetForm()
    setOpen(false)
  }

  if (!open) {
    return (
      <Card>
        <CardBody className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted">נמצא פריט שלא בקטלוג?</span>
          <Button variant="secondary" onClick={() => setOpen(true)} className="text-xs px-3 py-1">
            + הוסף פריט חדש
          </Button>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">הוסף פריט חדש</h3>
          <button type="button" onClick={() => { setOpen(false); resetForm() }} className="text-xs text-primary hover:underline">
            סגור
          </button>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="מק״ט" name="ic-new-sku" value={draft.sku} onChange={(e) => set('sku', e.target.value)} autoFocus />
          <Input label="שם פריט" name="ic-new-name" value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Input label="כמות" name="ic-new-qty" type="number" value={draft.quantity} onChange={(e) => set('quantity', e.target.value)} />
          <Input label="סף מינימום" name="ic-new-min" type="number" value={draft.min_threshold} onChange={(e) => set('min_threshold', e.target.value)} />
          <Input label="ספק" name="ic-new-supplier" value={draft.supplier} onChange={(e) => set('supplier', e.target.value)} />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">פריט בתמורה</span>
            <select
              value={draft.is_exchange ? 'yes' : 'no'}
              onChange={(e) => set('is_exchange', e.target.value === 'yes')}
              className="px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="no">לא</option>
              <option value="yes">כן</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">מק״ט חסום</span>
            <select
              value={draft.is_sku_blocked ? 'yes' : 'no'}
              onChange={(e) => set('is_sku_blocked', e.target.value === 'yes')}
              className="px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="no">לא</option>
              <option value="yes">כן (יש לעדכן מק״ט חדש)</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <WarehouseSelect value={draft.warehouse} onChange={(v) => set('warehouse', v)} />
          <Input label="ארון" name="ic-new-cab" type="number" value={draft.cabinet} onChange={(e) => set('cabinet', e.target.value)} />
          <Input label="מאחסן" name="ic-new-stype" value={draft.storage_type} onChange={(e) => set('storage_type', e.target.value)} />
          <Input label="מספר מאחסן" name="ic-new-snum" type="number" value={draft.storage_number} onChange={(e) => set('storage_number', e.target.value)} />
          <Input label="מספר תא" name="ic-new-cell" type="number" value={draft.cell_number} onChange={(e) => set('cell_number', e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <Button onClick={save} disabled={busy || !draft.sku.trim() || !draft.name.trim()}>
            {busy ? 'שומר...' : 'הוסף'}
          </Button>
          <Button variant="ghost" onClick={() => { setOpen(false); resetForm() }}>ביטול</Button>
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      </CardBody>
    </Card>
  )
}
