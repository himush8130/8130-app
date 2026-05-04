-- =====================================================================
-- 8130 APP — Extend parts schema to match "מלאי מכולות" worker file
-- =====================================================================
-- The worker delivered a 1214-row inventory file with structured
-- location info and several additional fields. We add columns to the
-- parts table to capture all of them.
--
-- The original sku is kept on the row but de-duplicated synthetically
-- by the importer when the worker file contains multiple inventory
-- entries with the same SKU (e.g. '000000000' appears 12 times for
-- items lacking a real catalogue number). Any FK columns referencing
-- parts.sku stay valid because the loaded sku values remain unique
-- post-suffixing.
--
-- The original SKU as the worker entered it is preserved in the new
-- `original_sku` column so the UI can display and search it
-- naturally.
-- =====================================================================

alter table public.parts
  add column original_sku    text,
  add column warehouse       text,
  add column cabinet         smallint,
  add column storage_type    text,
  add column storage_number  smallint,
  add column cell_number     smallint,
  add column is_exchange     boolean not null default false,
  add column stock_count     integer  not null default 0
    check (stock_count >= 0);

-- Indexes for the values we expect to filter / search on.
create index parts_original_sku_idx on public.parts (original_sku);
create index parts_warehouse_idx    on public.parts (warehouse);
