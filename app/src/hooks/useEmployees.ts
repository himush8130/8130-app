import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Employee } from '../types/db'

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name')
      if (error) throw error
      return (data ?? []) as Employee[]
    },
  })
}
