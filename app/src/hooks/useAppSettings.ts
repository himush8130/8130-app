import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type AppSettingsMap = Record<string, string>

/** Fetches the entire app_settings key/value table as a map. */
export function useAppSettings() {
  return useQuery({
    queryKey: ['app_settings'],
    queryFn: async (): Promise<AppSettingsMap> => {
      const { data, error } = await supabase.from('app_settings').select('key, value')
      if (error) throw error
      const map: AppSettingsMap = {}
      for (const row of data ?? []) map[row.key] = row.value
      return map
    },
  })
}
