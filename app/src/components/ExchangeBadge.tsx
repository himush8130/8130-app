// Small purple "בתמורה" pill. Surfaced wherever a part appears so the
// crew can spot an exchange (חליפין) item at a glance. The badge is
// controlled by parts.is_exchange — toggled in the catalog row editor.
export function ExchangeBadge({ active }: { active: boolean | null | undefined }) {
  if (!active) return null
  return (
    <span
      className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap"
      style={{ background: '#f3e8ff', color: '#5b21b6', borderColor: '#a78bfa' }}
      title="פריט בתמורה"
    >
      בתמורה
    </span>
  )
}
