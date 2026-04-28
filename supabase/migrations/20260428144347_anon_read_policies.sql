-- =====================================================================
-- 8130 APP — Interim read policies for the anon role (M3)
-- =====================================================================
-- Until proper JWT-based auth lands, the frontend uses the anon
-- publishable key for direct Supabase reads. To make this work without
-- disabling RLS, we add SELECT-only policies for `anon` (and
-- `authenticated`, for future-proofing).
--
-- WRITES are intentionally NOT exposed here. All inserts/updates/deletes
-- still route through Edge Functions running with service_role.
--
-- This is acceptable because:
--   * The app is private/internal — anon key is not actually public.
--   * Real per-user auth + tightened policies land in a later milestone.
-- =====================================================================

-- Read-everything policies, role split.
-- (Combining `to anon, authenticated` is supported but split for clarity.)

create policy "anon read"          on public.professions             for select to anon, authenticated using (true);
create policy "anon read"          on public.employees               for select to anon, authenticated using (true);
create policy "anon read"          on public.employee_availability   for select to anon, authenticated using (true);
create policy "anon read"          on public.vehicles                for select to anon, authenticated using (true);
create policy "anon read"          on public.service_calls           for select to anon, authenticated using (true);
create policy "anon read"          on public.parts                   for select to anon, authenticated using (true);
create policy "anon read"          on public.call_required_parts     for select to anon, authenticated using (true);
create policy "anon read"          on public.part_withdrawals        for select to anon, authenticated using (true);
create policy "anon read"          on public.call_comments           for select to anon, authenticated using (true);
