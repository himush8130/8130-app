import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ServiceCall, CallComment } from '../types/db'
import type { CallRequiredPart, PartWithdrawal } from '../types/parts'

export interface CallDetail {
  call: ServiceCall
  comments: CallComment[]
  requiredParts: CallRequiredPart[]
  withdrawals: PartWithdrawal[]
}

export function useCallDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['call_detail', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<CallDetail> => {
      const [callRes, commentsRes, requiredRes, withdrawalsRes] = await Promise.all([
        supabase
          .from('service_calls')
          .select('*, professions(name)')
          .eq('id', id!)
          .single<ServiceCall>(),
        supabase
          .from('call_comments')
          .select('*')
          .eq('call_id', id!)
          .order('created_at', { ascending: true }),
        supabase
          .from('call_required_parts')
          .select('*, parts(name, quantity, sku, original_sku)')
          .eq('call_id', id!)
          .order('requested_at', { ascending: true }),
        supabase
          .from('part_withdrawals')
          .select('*, parts(name, original_sku)')
          .eq('call_id', id!)
          .order('withdrawn_at', { ascending: true }),
      ])

      if (callRes.error)        throw callRes.error
      if (commentsRes.error)    throw commentsRes.error
      if (requiredRes.error)    throw requiredRes.error
      if (withdrawalsRes.error) throw withdrawalsRes.error

      return {
        call:          callRes.data,
        comments:      (commentsRes.data ?? []) as CallComment[],
        requiredParts: (requiredRes.data ?? []) as CallRequiredPart[],
        withdrawals:   (withdrawalsRes.data ?? []) as PartWithdrawal[],
      }
    },
  })
}
