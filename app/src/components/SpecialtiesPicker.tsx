import { TANK_SPECIALTIES, type TankSpecialty } from '../types/db'

export function SpecialtiesPicker({
  value, onChange, label = 'התמחות נדרשת (טנקים)',
}: {
  value: TankSpecialty[]
  onChange: (next: TankSpecialty[]) => void
  label?: string
}) {
  function toggle(s: TankSpecialty) {
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s])
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {TANK_SPECIALTIES.map((s) => {
          const active = value.includes(s)
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                active
                  ? 'bg-primary text-primary-fg border-primary'
                  : 'bg-card text-muted border-border hover:bg-muted-surface'
              }`}
            >
              {s}
            </button>
          )
        })}
      </div>
      <span className="text-[11px] text-muted">ניתן לבחור יותר מאחד</span>
    </div>
  )
}
