import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profession } from '../types/db'

export function useProfessions() {
  return useQuery({
    queryKey: ['professions'],
    queryFn: async (): Promise<Profession[]> => {
      const { data, error } = await supabase
        .from('professions')
        .select('*')
        .order('name')
      if (error) throw error
      return (data ?? []) as Profession[]
    },
  })
}
