import type { RequiredPartStatus } from './db'

export interface Part {
  id: string                        // UUID PK
  sku: string                       // SKU verbatim — duplicates allowed across rows
  seq: number                       // running number within SKU group (1, 2, 3, ...)
  name: string
  quantity: number
  location: string | null           // legacy free text
  min_threshold: number
  supplier: string | null
  pending_approval: boolean
  warehouse: string | null
  cabinet: number | null
  storage_type: string | null
  storage_number: number | null
  cell_number: number | null
  is_exchange: boolean
  stock_count: number               // future: physical re-count
  is_sku_blocked: boolean
  replacement_sku: string | null    // optional hint — UI shows "מק״ט חדש: X" when set
  created_at: string
}

export interface CallRequiredPart {
  id: string
  /** null when the row belongs to a standalone warehouse order. */
  call_id: string | null
  /** null when the row belongs to a service call. */
  warehouse_order_id: string | null
  part_id: string                   // UUID FK to parts.id
  quantity: number
  received_quantity: number | null
  status: RequiredPartStatus
  requested_by: number | null
  requested_at: string
  rejection_reason: string | null
  order_number: string | null
  /** Embedded via PostgREST. is_sku_blocked is optional (some queries
   *  don't request it) but when present the UI treats blocked parts
   *  as having a single status: blocked. */
  parts?: { name: string; sku: string; quantity: number; is_sku_blocked?: boolean; is_exchange?: boolean } | null
}

export interface WarehouseOrder {
  id: string
  display_id: string                // "WO-26-0001"
  created_by: number | null
  created_at: string
}

export interface PartWithdrawal {
  id: string
  call_id: string
  part_id: string                   // UUID FK to parts.id
  required_part_id: string | null
  quantity: number
  withdrawn_by: number
  released_by: number
  withdrawn_at: string
  is_external: boolean
  /** Embedded via PostgREST: select('*, parts(name, sku, is_exchange)') */
  parts?: { name: string; sku: string; is_exchange?: boolean } | null
}
