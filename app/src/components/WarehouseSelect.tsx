const WAREHOUSE_OPTIONS = ['חח', 'חח חירום', 'מלאי חיצוני']

export function WarehouseSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">מחסן</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">— בחר —</option>
        {WAREHOUSE_OPTIONS.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}
