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
  created_at: string
}

export interface CallRequiredPart {
  id: string
  call_id: string
  part_id: string                   // UUID FK to parts.id
  quantity: number
  status: RequiredPartStatus
  requested_by: number | null
  requested_at: string
  /** Embedded via PostgREST: select('*, parts(name, sku, quantity)') */
  parts?: { name: string; sku: string; quantity: number } | null
}

export interface PartWithdrawal {
  id: string
  call_id: string
  part_id: string                   // UUID FK to parts.id
  quantity: number
  withdrawn_by: number
  released_by: number
  withdrawn_at: string
  /** Embedded via PostgREST: select('*, parts(name, sku)') */
  parts?: { name: string; sku: string } | null
}
