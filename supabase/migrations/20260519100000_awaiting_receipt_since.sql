-- =====================================================================
-- 8130 APP — track time spent in "awaiting_receipt"
-- =====================================================================
-- Set when a call_required_parts row transitions INTO awaiting_receipt,
-- cleared when it leaves. The warehouse home uses this to surface
-- items overdue for receipt: red after 48h, yellow after 24h.
-- =====================================================================

alter table public.call_required_parts
  add column awaiting_receipt_since timestamptz;

-- Best-effort backfill so existing awaiting_receipt rows aren't all
-- shown as "since the dawn of time" — we don't know when each row
-- entered the status, so fall back to its requested_at.
update public.call_required_parts
   set awaiting_receipt_since = requested_at
 where status = 'awaiting_receipt'
   and awaiting_receipt_since is null;

create index call_required_parts_awaiting_receipt_since_idx
  on public.call_required_parts (awaiting_receipt_since)
  where status = 'awaiting_receipt';
