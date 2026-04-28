import { useState } from 'react'
import { useFeedbackMode } from '../store/feedbackMode'
import { componentName } from './registry'

interface Props {
  id: number
}

export function ComponentBadge({ id }: Props) {
  const enabled = useFeedbackMode((s) => s.enabled)
  const [copied, setCopied] = useState(false)

  if (!enabled) return null

  const name = componentName(id) ?? 'UNKNOWN'

  function copy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(`#${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`לחץ להעתקת #${id}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 me-2 mb-2 rounded text-[10px] font-mono border border-dashed border-primary/60 text-primary bg-primary/5 hover:bg-primary/15 transition-colors"
    >
      <span className="opacity-70">{name}</span>
      <span className="font-semibold">#{id}</span>
      {copied && <span className="text-success">✓</span>}
    </button>
  )
}
