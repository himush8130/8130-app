import { ComponentBadge } from '../feedback/ComponentBadge'

/**
 * Renders a phone number with two action buttons:
 *   - Call (tel:)
 *   - WhatsApp (wa.me)
 *
 * Israeli numbers in the form 05X-XXXXXXX are converted to international
 * 972 5X XXXXXXX for the WhatsApp link. Already-international numbers
 * pass through.
 */
export function PhoneActions({ phone }: { phone: string }) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  const callHref = `tel:${digits}`
  const waDigits = digits.startsWith('0') ? `972${digits.slice(1)}` : digits
  const waHref   = `https://wa.me/${waDigits}`

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="font-mono text-xs text-muted" dir="ltr">{phone}</span>

      <a
        href={callHref}
        title="התקשר"
        aria-label="התקשר"
        className="relative inline-flex items-center justify-center w-7 h-7 rounded-full bg-info/10 text-info hover:bg-info/20 transition-colors"
      >
        <ComponentBadge id={5012} />
        <CallIcon />
      </a>

      <a
        href={waHref}
        target="_blank"
        rel="noreferrer"
        title="WhatsApp"
        aria-label="WhatsApp"
        className="relative inline-flex items-center justify-center w-7 h-7 rounded-full bg-success/10 text-success hover:bg-success/20 transition-colors"
      >
        <ComponentBadge id={5013} />
        <WhatsAppIcon />
      </a>
    </div>
  )
}

function CallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
