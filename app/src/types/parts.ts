import type { RequiredPartStatus } from './db'

export interface Part {
  sku: string                       // synthetic-unique key; original_sku is the human one
  original_sku: string | null
  name: string
  quantity: number
  location: string | null           // legacy free-text; null on new imports
  min_threshold: number
  supplier: string | null
  pending_approval: boolean
  // Structured location, populated from the inventory file:
  warehouse: string | null
  cabinet: number | null
  storage_type: string | null
  storage_number: number | null
  cell_number: number | null
  is_exchange: boolean
  stock_count: number               // future use (physical re-count)
  created_at: string
}

export interface CallRequiredPart {
  id: string
  call_id: string
  part_sku: string
  quantity: number
  status: RequiredPartStatus
  requested_by: number | null
  requested_at: string
  /** Embedded via PostgREST: select('*, parts(name, quantity, sku, original_sku)') */
  parts?: { name: string; quantity: number; sku: string; original_sku: string | null } | null
}

export interface PartWithdrawal {
  id: string
  call_id: string
  part_sku: string
  quantity: number
  withdrawn_by: number
  released_by: number
  withdrawn_at: string
  /** Embedded via PostgREST: select('*, parts(name, original_sku)') */
  parts?: { name: string; original_sku: string | null } | null
}
