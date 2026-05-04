-- =====================================================================
-- 8130 APP — Switch parts to UUID primary key (preserve SKU verbatim)
-- =====================================================================
-- Per user direction: never modify the worker's SKU. Multiple inventory
-- entries may legitimately share the same SKU value (e.g. several rows
-- with sku='000000000' representing items lacking a real catalogue
-- number). The previous "-NNN" suffix workaround is removed.
--
-- Approach:
--   * Add `id uuid` as the new primary key on parts.
--   * Drop the old PK on parts.sku, and the now-orphaned original_sku
--     column. parts.sku stays as plain text (NOT NULL, NOT unique).
--   * Add a `seq smallint` "row number within sku-group" for human
--     reference; it is not exposed to end users.
--   * Dependent tables (call_required_parts, part_withdrawals) had
--     foreign keys pointing at parts.sku. They are empty in dev —
--     drop part_sku and replace with a part_id uuid FK to parts.id.
--   * The withdrawal-deduction trigger is re-pointed to use part_id.
--
-- (Truncate-then-reload of parts happens via the importer after this
-- migration is applied; no DML in the migration itself.)
-- =====================================================================

-- 1. Drop FKs from dependent tables.
alter table public.call_required_parts
  drop constraint if exists call_required_parts_part_sku_fkey;
alter table public.part_withdrawals
  drop constraint if exists part_withdrawals_part_sku_fkey;

-- 2. Drop dependent indexes that referenced part_sku.
drop index if exists public.call_required_parts_call_idx;
drop index if exists public.call_required_parts_status_idx;
drop index if exists public.part_withdrawals_call_idx;
drop index if exists public.part_withdrawals_part_idx;
drop index if exists public.part_withdrawals_withdrawn_at;

-- 3. Drop part_sku columns. The dependent tables are currently empty.
alter table public.call_required_parts drop column if exists part_sku;
alter table public.part_withdrawals    drop column if exists part_sku;

-- 4. Drop existing PK on parts.sku and the now-redundant original_sku.
alter table public.parts drop constraint parts_pkey;
drop index if exists public.parts_original_sku_idx;
alter table public.parts drop column if exists original_sku;

-- 5. Add id UUID PK + seq running number on parts.
alter table public.parts
  add column id  uuid not null default gen_random_uuid(),
  add column seq smallint not null default 1;
alter table public.parts add primary key (id);

-- 6. Index sku for searches (no longer the PK).
create index parts_sku_idx on public.parts (sku);

-- 7. Add part_id FK on dependent tables.
alter table public.call_required_parts
  add column part_id uuid not null references public.parts(id) on delete restrict;
alter table public.part_withdrawals
  add column part_id uuid not null references public.parts(id) on delete restrict;

-- 8. Re-create the indexes that drop in step 2 (now keyed on part_id).
create index call_required_parts_call_idx     on public.call_required_parts (call_id);
create index call_required_parts_status_idx   on public.call_required_parts (status);
create index call_required_parts_part_idx     on public.call_required_parts (part_id);
create index part_withdrawals_call_idx        on public.part_withdrawals (call_id);
create index part_withdrawals_part_idx        on public.part_withdrawals (part_id);
create index part_withdrawals_withdrawn_at    on public.part_withdrawals (withdrawn_at desc);

-- 9. Replace the inventory-deduction trigger function to use part_id.
create or replace function public.fn_deduct_part_on_withdrawal()
returns trigger
language plpgsql
as $$
begin
  update public.parts
     set quantity = quantity - new.quantity
   where id = new.part_id;
  return new;
end;
$$;
