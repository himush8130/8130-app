import type { RequiredPartStatus } from './db'

export interface Part {
  sku: string
  name: string
  quantity: number
  location: string | null
  min_threshold: number
  supplier: string | null
  pending_approval: boolean
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
  /** Embedded via PostgREST: select('*, parts(name, quantity, sku)') */
  parts?: { name: string; quantity: number; sku: string } | null
}

export interface PartWithdrawal {
  id: string
  call_id: string
  part_sku: string
  quantity: number
  withdrawn_by: number
  released_by: number
  withdrawn_at: string
  /** Embedded via PostgREST: select('*, parts(name)') */
  parts?: { name: string } | null
}
