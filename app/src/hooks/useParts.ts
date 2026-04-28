import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Part } from '../types/parts'

export function useParts() {
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
