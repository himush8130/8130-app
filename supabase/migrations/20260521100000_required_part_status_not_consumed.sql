-- =====================================================================
-- 8130 APP — "not_consumed" status for required parts
-- =====================================================================
-- Path: a tech received parts from the warehouse (status = delivered)
-- but never installed them on the vehicle. The warehouse marks the
-- row as not_consumed; later the worker presses "החזר למלאי" to
-- refund the stock and flip the row to in_stock.
-- =====================================================================

alter type public.required_part_status add value if not exists 'not_consumed';
