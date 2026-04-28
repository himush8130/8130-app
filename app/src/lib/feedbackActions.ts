import { supabase } from './supabase'

const FUNCTION_NAME = 'manager-actions'

interface NoteResult {
  ok: boolean
  error?: string
  detail?: string
  note?: {
    id: string
    display_id: string
    text?: string
    component_ids?: number[]
    created_at?: string
    updated_at?: string
  }
}

async function invoke(body: Record<string, unknown>): Promise<NoteResult> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body })
  if (error) return { ok: false, error: 'invoke_failed', detail: error.message }
  return data as NoteResult
}

export function addFeedbackNote(employeeNumber: number, pagePath: string, text: string) {
  return invoke({
    employee_number: employeeNumber,
    action: 'add_feedback_note',
    params: { page_path: pagePath, text },
  })
}

export function editFeedbackNote(employeeNumber: number, noteId: string, text: string) {
  return invoke({
    employee_number: employeeNumber,
    action: 'edit_feedback_note',
    params: { note_id: noteId, text },
  })
}

export function deleteFeedbackNote(employeeNumber: number, noteId: string) {
  return invoke({
    employee_number: employeeNumber,
    action: 'delete_feedback_note',
    params: { note_id: noteId },
  })
}

export function setFeedbackNoteStatus(
  employeeNumber: number,
  noteId: string,
  status: 'new' | 'done',
) {
  return invoke({
    employee_number: employeeNumber,
    action: 'set_feedback_note_status',
    params: { note_id: noteId, status },
  })
}

export function deleteDoneFeedbackNotes(employeeNumber: number) {
  return invoke({
    employee_number: employeeNumber,
    action: 'delete_done_feedback_notes',
    params: {},
  })
}
