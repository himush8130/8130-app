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
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .order('sku')
      if (error) throw error
      return (data ?? []) as Part[]
    },
  })
}
