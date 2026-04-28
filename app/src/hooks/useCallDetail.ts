import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ServiceCall, CallComment } from '../types/db'

export interface CallDetail {
  call: ServiceCall
  comments: CallComment[]
}

export function useCallDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['call_detail', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<CallDetail> => {
      const { data: call, error: callErr } = await supabase
        .from('service_calls')
        .select('*, professions(name)')
        .eq('id', id!)
        .single<ServiceCall>()
      if (callErr) throw callErr

      const { data: comments, error: commentsErr } = await supabase
        .from('call_comments')
        .select('*')
        .eq('call_id', id!)
        .order('created_at', { ascending: true })
      if (commentsErr) throw commentsErr

      return { call, comments: (comments ?? []) as CallComment[] }
    },
  })
}
