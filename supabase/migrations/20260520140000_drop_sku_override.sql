-- =====================================================================
-- 8130 APP — drop the per-row SKU override
-- =====================================================================
-- Reverts the column added in 20260520130000. The model changed:
-- SKU edits now write through to parts.sku directly (catalog row),
-- so the override field is no longer needed.
-- =====================================================================

alter table public.call_required_parts
  drop column if exists sku_override;
