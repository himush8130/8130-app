import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Part } from '../types/parts'

export function useParts() {
  const queryClient = useQueryClient()

  // Subscribe to realtime UPDATE/INSERT/DELETE events on parts. When
  // anything changes — from this client OR another — invalidate the
  // cache so every open browser stays in sync. The subscription is
  // shared across all useParts() consumers via the same channel name.
  useEffect(() => {
    const channel = supabase
      .channel('parts-changes')
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
  }, [queryClient])

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
