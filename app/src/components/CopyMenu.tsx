import { useEffect, useRef, useState } from 'react'

type Option = 'format' | 'sku' | 'order'

const OPTION_LABEL: Record<Option, string> = {
  format: 'העתקת פורמט',
  sku:    'העתקת מק״ט',
  order:  'העתקת מספר דרישה',
}

const COPIED_LABEL: Record<Option, string> = {
  format: 'הועתק פורמט',
  sku:    'הועתק מק״ט',
  order:  'הועתק מספר דרישה',
}

interface Props {
  /** Returns the text to copy, OR null when this option should be
   *  hidden (e.g. no order_number on the row). */
  getText:    Partial<Record<Option, () => string | null>>
}

/** Small icon button that opens a popover with up to three copy
 *  options. Used inside list rows (active pending, rejected, blocked,
 *  delivered) so the user picks what to copy instead of having a
 *  single overloaded click on the part name. */
export function CopyMenu({ getText }: Props) {
  const [open, setOpen] = useState(false)
  const [flash, setFlash] = useState<Option | null>(null)
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  async function copy(opt: Option) {
    const fn = getText[opt]
    const text = fn?.() ?? null
    if (text == null) return
    try {
      await navigator.clipboard.writeText(text)
      setFlash(opt)
      setTimeout(() => setFlash(null), 1800)
    } catch {
      // clipboard may be denied
    }
    setOpen(false)
  }

  const options = (Object.keys(OPTION_LABEL) as Option[]).filter((o) => {
    const fn = getText[o]
    if (!fn) return false
    // Probe — we hide the option if its getter returns null, so e.g.
    // "order number" doesn't appear on rows that don't have one.
    return fn() != null
  })

  return (
    <span ref={ref} className="relative inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v) }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="העתקה"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border text-muted hover:text-foreground hover:bg-muted-surface shrink-0"
      >
        ⧉
      </button>
      {flash && (
        <span className="text-[11px] text-success font-medium whitespace-nowrap">
          ✓ {COPIED_LABEL[flash]}
        </span>
      )}
      {open && options.length > 0 && (
        <div
          role="menu"
          className="absolute top-full mt-1 z-30 min-w-[11rem] bg-card border border-border rounded-md shadow-lg p-1.5 flex flex-col gap-1"
          style={{ insetInlineEnd: 0 }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              role="menuitem"
              onClick={() => copy(opt)}
              className="text-start text-xs px-3 py-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted-surface hover:border-primary/50 transition-colors"
            >
              {OPTION_LABEL[opt]}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
