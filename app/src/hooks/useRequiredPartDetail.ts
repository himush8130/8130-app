import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CallRequiredPart, Part } from '../types/parts'

export interface RequiredPartDetail {
  row:        CallRequiredPart
  /** All catalog rows that share the row's SKU — possible dispense
   *  sources for this required-part. */
  locations:  Part[]
  /** When row.status === 'delivered', the actual withdrawal record. */
  withdrawal: WithdrawalDetail | null
  /** Embedded parent call info (display_id, vehicle_number). */
  call:       { id: string; display_id: string; vehicle_number: string | null; description: string | null } | null
}

export interface WithdrawalDetail {
  id:           string
  withdrawn_at: string
  is_external:  boolean
  part_id:      string
  /** Catalog row that was actually dispensed (or null when external). */
  source:       Part | null
}

export function useRequiredPartDetail(requiredPartId: string | undefined) {
  return useQuery({
    queryKey: ['required_part_detail', requiredPartId],
    enabled:  Boolean(requiredPartId),
    queryFn: async (): Promise<RequiredPartDetail> => {
      // 1. The row itself + the part it points to (for SKU)
      const { data: row, error: rowErr } = await supabase
        .from('call_required_parts')
        .select('*, parts(*)')
        .eq('id', requiredPartId!)
        .single()
      if (rowErr) throw rowErr
      const partRow = (row as any).parts as Part | null

      // 2. The parent call (display_id + vehicle_number). Skipped when
      // the row belongs to a standalone warehouse order (call_id null).
      let call: RequiredPartDetail['call'] = null
      if (row.call_id) {
        const { data: c } = await supabase
          .from('service_calls')
          .select('id, display_id, vehicle_number, description')
          .eq('id', row.call_id)
          .maybeSingle()
        call = c ?? null
      }

      // 3. Every catalog row with the same SKU (possible dispense sources).
      let locations: Part[] = []
      if (partRow?.sku) {
        const { data: locs } = await supabase
          .from('parts').select('*').eq('sku', partRow.sku).order('warehouse')
        locations = (locs ?? []) as Part[]
      }

      // 4. If delivered, fetch the matching withdrawal + its source row.
      let withdrawal: WithdrawalDetail | null = null
      if (row.status === 'delivered') {
        const { data: wd } = await supabase
          .from('part_withdrawals')
          .select('id, withdrawn_at, is_external, part_id')
          .eq('required_part_id', requiredPartId!)
          .maybeSingle()
        if (wd) {
          let source: Part | null = null
          if (!wd.is_external) {
            const { data: srcPart } = await supabase
              .from('parts').select('*').eq('id', wd.part_id).maybeSingle()
            source = (srcPart as Part | null) ?? null
          }
          withdrawal = { ...wd, source }
        }
      }

      return {
        row: row as CallRequiredPart,
        locations,
        withdrawal,
        call,
      }
    },
  })
}
