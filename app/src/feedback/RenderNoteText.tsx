import { Fragment } from 'react'
import { componentName } from './registry'

/**
 * Renders the note text with #NNNN tokens highlighted as
 * "NAME (#NNNN)" so the reader sees both the registry name and the id.
 */
export function RenderNoteText({ text }: { text: string }) {
  const parts: Array<{ kind: 'text'; value: string } | { kind: 'ref'; id: number }> = []
  let lastIndex = 0
  const regex = /#(\d+)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'text', value: text.slice(lastIndex, match.index) })
    }
    parts.push({ kind: 'ref', id: parseInt(match[1], 10) })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.kind === 'text') return <Fragment key={i}>{p.value}</Fragment>
        const name = componentName(p.id)
        return (
          <span
            key={i}
            className="inline-flex items-baseline gap-1 px-1 mx-0.5 rounded bg-primary/10 text-primary font-mono text-xs"
            title={`רכיב #${p.id}`}
          >
            {name && <span className="opacity-70">{name}</span>}
            <span className="font-semibold">#{p.id}</span>
          </span>
        )
      })}
    </span>
  )
}
