import { supabase } from './supabase'
import type { RequiredPartStatus } from '../types/db'

const FUNCTION_NAME = 'warehouse-actions'

interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  detail?: string
  available?: number
  required_part?: T
  withdrawal?: T
}

async function invoke<T = unknown>(body: Record<string, unknown>): Promise<ActionResult<T>> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body })
  if (error) return { ok: false, error: 'invoke_failed', detail: error.message }
  return data as ActionResult<T>
}

export function addRequiredPart(
  employeeNumber: number,
  callId: string,
  partId: string,
  quantity: number,
) {
  return invoke({
    employee_number: employeeNumber,
    action: 'add_required_part',
    params: { call_id: callId, part_id: partId, quantity },
  })
}

export interface ReceiveDestination {
  receive_to:           'existing' | 'external' | 'new'
  receive_part_id?:     string
  receive_new_location?: {
    warehouse?:      string | null
    cabinet?:        number | null
    storage_type?:   string | null
    storage_number?: number | null
    cell_number?:    number | null
  }
  received_quantity?: number
}

export function updateRequiredPartStatus(
  employeeNumber: number,
  requiredPartId: string,
  status: RequiredPartStatus,
  reason?: string | null,
  receive?: ReceiveDestination,
  orderNumber?: string,
) {
  return invoke({
    employee_number: employeeNumber,
    action: 'update_required_part_status',
    params: {
      required_part_id: requiredPartId,
      status,
      reason: reason ?? null,
      ...(receive ?? {}),
      ...(orderNumber !== undefined ? { order_number: orderNumber } : {}),
    },
  })
}

export function recordWithdrawal(
  employeeNumber: number,
  callId: string,
  partId: string,
  quantity: number,
  withdrawnBy: number,
  requiredPartId?: string,
  isExternal: boolean = false,
) {
  return invoke({
    employee_number: employeeNumber,
    action: 'record_withdrawal',
    params: {
      call_id: callId,
      part_id: partId,
      quantity,
      withdrawn_by: withdrawnBy,
      required_part_id: requiredPartId,
      is_external: isExternal,
    },
  })
}

export interface PartUpdates {
  name?: string
  sku?: string
  quantity?: number
  min_threshold?: number
  warehouse?: string | null
  cabinet?: number | null
  storage_type?: string | null
  storage_number?: number | null
  cell_number?: number | null
  is_exchange?: boolean
  supplier?: string | null
  location?: string | null
  stock_count?: number
  is_sku_blocked?: boolean
  replacement_sku?: string | null
  hide_from_blocked_table?: boolean
}

export function updatePart(employeeNumber: number, partId: string, updates: PartUpdates) {
  return invoke({
    employee_number: employeeNumber,
    action: 'update_part',
    params: { part_id: partId, updates },
  })
}

export function setPartQuantity(employeeNumber: number, partId: string, quantity: number) {
  return invoke({
    employee_number: employeeNumber,
    action: 'update_part_quantity',
    params: { part_id: partId, quantity },
  })
}

export function changePartQuantity(employeeNumber: number, partId: string, delta: number) {
  return invoke({
    employee_number: employeeNumber,
    action: 'update_part_quantity',
    params: { part_id: partId, delta },
  })
}

export interface NewPartPayload {
  sku: string
  name: string
  quantity?: number
  min_threshold?: number
  location?: string | null
  supplier?: string | null
  warehouse?: string | null
  cabinet?: number | null
  storage_type?: string | null
  storage_number?: number | null
  cell_number?: number | null
  is_exchange?: boolean
  is_sku_blocked?: boolean
}

export function createPart(employeeNumber: number, payload: NewPartPayload) {
  return invoke<{ id: string; sku: string; name: string }>({
    employee_number: employeeNumber,
    action: 'create_part',
    params: payload,
  }) as Promise<ActionResult<any> & { part?: any }>
}

export function deleteRequiredPart(employeeNumber: number, requiredPartId: string) {
  return invoke({
    employee_number: employeeNumber,
    action: 'delete_required_part',
    params: { required_part_id: requiredPartId },
  })
}

export function setRequiredPartOrderNumber(
  employeeNumber: number,
  requiredPartId: string,
  orderNumber: string | null,
) {
  return invoke({
    employee_number: employeeNumber,
    action: 'set_required_part_order_number',
    params: { required_part_id: requiredPartId, order_number: orderNumber ?? null },
  })
}

export function bulkUpdateRequiredPartStatus(
  employeeNumber: number,
  ids: string[],
  status: RequiredPartStatus,
  orderNumber?: string | null,
) {
  return invoke({
    employee_number: employeeNumber,
    action: 'bulk_update_required_part_status',
    params: {
      required_part_ids: ids,
      status,
      ...(orderNumber !== undefined ? { order_number: orderNumber ?? null } : {}),
    },
  }) as Promise<ActionResult<any> & { failed_count?: number; results?: Array<{ id: string; ok: boolean; error?: string }> }>
}

export interface WarehouseOrderItemPayload {
  part_id: string
  quantity: number
}

export function createWarehouseOrder(
  employeeNumber: number,
  items: WarehouseOrderItemPayload[],
) {
  return invoke<{ id: string; display_id: string }>({
    employee_number: employeeNumber,
    action: 'create_warehouse_order',
    params: { items },
  }) as Promise<ActionResult<any> & { order?: { id: string; display_id: string }; items?: unknown[] }>
}

// --------------- Inventory Count ---------------

export function icOpenSession(employeeNumber: number) {
  return invoke({ employee_number: employeeNumber, action: 'ic_open_session', params: {} })
}

export function icToggleSession(employeeNumber: number, sessionId: string) {
  return invoke({ employee_number: employeeNumber, action: 'ic_toggle_session', params: { session_id: sessionId } })
}

export function icResetSession(employeeNumber: number, sessionId: string) {
  return invoke({ employee_number: employeeNumber, action: 'ic_reset_session', params: { session_id: sessionId } })
}

export function icUpsertEntry(employeeNumber: number, sessionId: string, partId: string, countedQty: number, expectedQty: number) {
  return invoke({ employee_number: employeeNumber, action: 'ic_upsert_entry', params: { session_id: sessionId, part_id: partId, counted_qty: countedQty, expected_qty: expectedQty } })
}

export function icRemoveEntry(employeeNumber: number, sessionId: string, partId: string) {
  return invoke({ employee_number: employeeNumber, action: 'ic_remove_entry', params: { session_id: sessionId, part_id: partId } })
}
