import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Returns a Set of call_ids that have at least one comment. Used by
// CallCard to surface an "i" indicator without having to fetch the
// full comment list per card.
export function useCallsWithComments() {
  return useQuery({
    queryKey: ['calls_with_comments'],
    queryFn: async (): Promise<Set<string>> => {
      const out = new Set<string>()
      const PAGE = 1000
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('call_comments')
          .select('call_id')
          .range(from, from + PAGE - 1)
        if (error) throw error
        const rows = (data ?? []) as Array<{ call_id: string }>
        for (const r of rows) out.add(r.call_id)
        if (rows.length < PAGE) break
        from += PAGE
      }
      return out
    },
  })
}
