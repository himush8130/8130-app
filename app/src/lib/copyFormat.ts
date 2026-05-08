import type { AppSettingsMap } from '../hooks/useAppSettings'
import type { Vehicle } from '../types/db'
import type { CallRequiredPart } from '../types/parts'

interface BuildArgs {
  settings:        AppSettingsMap
  vehicle:         Vehicle | null
  /** Whether the vehicle has any active disabling call. */
  vehicleDisabled: boolean
  row:             CallRequiredPart
  partName:        string
  partSku:         string
}

/** Format a vehicle number with a dash after the third digit when it
 *  is exactly six digits long; otherwise return it as-is. */
export function formatVehicleNumber(n: string | null | undefined): string {
  if (!n) return ''
  if (/^\d{6}$/.test(n)) return `${n.slice(0, 3)}-${n.slice(3)}`
  return n
}

/** "<label>:" wrapped in WhatsApp-style asterisks for bold,
 *  followed by a space before the value. */
function line(label: string, value: string | number | null | undefined): string {
  return `*${label}:* ${value ?? ''}`
}

/** Build the multi-line copy template for a required-part row. */
export function buildCopyText(args: BuildArgs): string {
  const s = args.settings
  const v = args.vehicle
  const lines = [
    line(s.copy_brigade_label   ?? 'חטיבה',         s.copy_brigade_value   ?? ''),
    line(s.copy_battalion_label ?? 'גדוד',          s.copy_battalion_value ?? ''),
    line(s.copy_kli_type_label  ?? 'סוג הכלי',      v?.model ?? v?.type_name ?? ''),
    line(s.copy_kli_fit_label   ?? 'האם הכלי כשיר', args.vehicleDisabled ? 'לא' : 'כן'),
    line(s.copy_kli_num_label   ?? 'צ׳',            formatVehicleNumber(v?.vehicle_number)),
    line(s.copy_location_label  ?? 'מיקום',         v?.location ?? ''),
    line(s.copy_sku_label       ?? 'מק״ט',          args.partSku),
    line(s.copy_part_name_label ?? 'שם החלק',       args.partName),
    line(s.copy_qty_label       ?? 'כמות',          args.row.quantity),
  ]
  return lines.join('\n')
}
