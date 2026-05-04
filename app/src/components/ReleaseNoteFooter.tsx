import { LATEST_NOTE, BUILD_TIME } from '../releaseNotes'
import { ComponentBadge } from '../feedback/ComponentBadge'

export function ReleaseNoteFooter() {
  const built = new Date(BUILD_TIME)
  const formatted = built.toLocaleString('he-IL', {
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
  })

  return (
    <footer className="mt-6 border-t border-border pt-3 text-xs text-muted">
      <ComponentBadge id={3024} />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold text-foreground">עדכון אחרון</span>
        <span className="font-mono" dir="ltr">{formatted}</span>
      </div>
      <p className="mt-1 leading-snug">{LATEST_NOTE}</p>
    </footer>
  )
}
