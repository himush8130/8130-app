import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { subscribeToast, type ToastTone } from '../lib/toast'

interface Active {
  id:   number
  text: string
  tone: ToastTone
}

const TONE_CLS: Record<ToastTone, string> = {
  warning: 'bg-warning text-white',
  success: 'bg-success text-white',
  danger:  'bg-danger text-white',
  info:    'bg-foreground text-card',
}

export function ToastHost() {
  const [items, setItems] = useState<Active[]>([])

  useEffect(() => {
    return subscribeToast(({ text, tone, duration }) => {
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev, { id, text, tone }])
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    })
  }, [])

  if (items.length === 0 || typeof document === 'undefined') return null

  return createPortal(
    <div
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 pointer-events-none"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={`${TONE_CLS[t.tone]} px-4 py-2 rounded-md shadow-xl text-sm font-medium max-w-md text-center`}
        >
          {t.text}
        </div>
      ))}
    </div>,
    document.body,
  )
}
