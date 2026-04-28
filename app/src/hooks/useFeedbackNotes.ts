import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FeedbackNote } from '../types/feedback'

export function useFeedbackNotes() {
  return useQuery({
    queryKey: ['feedback_notes'],
    queryFn: async (): Promise<FeedbackNote[]> => {
      const { data, error } = await supabase
        .from('feedback_notes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as FeedbackNote[]
    },
  })
}
