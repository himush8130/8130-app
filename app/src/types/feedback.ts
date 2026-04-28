export type FeedbackNoteStatus = 'new' | 'done'

export interface FeedbackNote {
  id: string
  display_id: string
  author_employee_number: number
  author_name: string
  page_path: string
  component_ids: number[]
  text: string
  status: FeedbackNoteStatus
  created_at: string
  updated_at: string
}
