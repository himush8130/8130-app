import { useEffect, useId } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Part } from '../types/parts'

export function useParts() {
  const queryClient = useQueryClient()
  // Each consumer gets its own realtime channel. Supabase rejects
  // adding new `.on()` callbacks to a channel that has already called
  // `.subscribe()`, so reusing a single channel name across multiple
  // useParts() callers (e.g. PartsCatalogList + AddWarehouseOrderForm
  // on the warehouse home) crashes the page. The id keeps the channel
  // unique per hook instance, which is cheap.
  const id = useId()

  useEffect(() => {
    const channel = supabase
      .channel(`parts-changes-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['parts'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, id])

  return useQuery({
    queryKey: ['parts'],
    queryFn: async (): Promise<Part[]> => {
      // Supabase / PostgREST caps a single SELECT response at 1000
      // rows (default max_rows on the API). The catalog already has
      // ~1.4k rows, so any SKU that lexicographically sorts past
      // position 1000 silently never reaches the client — search
      // queries against it look broken. Page through the table
      // until we hit a partial page and then stop.
      const PAGE = 1000
      const out: Part[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('parts')
          .select('*')
          .order('sku')
          .range(from, from + PAGE - 1)
        if (error) throw error
        const rows = (data ?? []) as Part[]
        out.push(...rows)
        if (rows.length < PAGE) break
        from += PAGE
      }
      return out
    },
  })
}
