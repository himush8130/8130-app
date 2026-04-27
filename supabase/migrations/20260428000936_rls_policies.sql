-- =====================================================================
-- 8130 APP — Row Level Security baseline (M1)
-- =====================================================================
-- Strategy for M1:
--   * Enable RLS on every table (default-deny under PostgreSQL semantics).
--   * NO policies are added yet.
--   * All M1/M2 reads/writes route through Edge Functions using the
--     service_role key, which bypasses RLS by design.
--   * Front-end direct queries are blocked until M3, when employee-number
--     auth and JWT claims land. At that point we add per-role policies
--     (technician sees own calls; manager sees all; warehouse sees parts;
--     etc.) in a separate migration.
--
-- Why default-deny rather than permissive policies?
--   * Permissive policies and RLS-off have the same effective security.
--     If we are not ready to write the right policy, default-deny is the
--     safer placeholder.
-- =====================================================================

alter table public.professions             enable row level security;
alter table public.employees               enable row level security;
alter table public.employee_availability   enable row level security;
alter table public.vehicles                enable row level security;
alter table public.service_calls           enable row level security;
alter table public.parts                   enable row level security;
alter table public.call_required_parts     enable row level security;
alter table public.part_withdrawals        enable row level security;
alter table public.call_comments           enable row level security;

-- NOTE on FORCE ROW LEVEL SECURITY:
-- We deliberately do NOT use FORCE here. The postgres table-owner role and
-- the Supabase dashboard role bypass RLS by default; FORCE would lock out
-- the dashboard and break visual verification in M1 (no policies exist
-- yet). When proper policies land in M3, we may revisit per table.
-- service_role is unaffected either way — it bypasses RLS as a Supabase
-- API gateway behavior, not a PostgreSQL mechanism.
