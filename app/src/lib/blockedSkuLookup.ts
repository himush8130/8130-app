import type { Part } from '../types/parts'

export interface BlockedSkuMatch {
  blockedSku:     string
  replacementSku: string | null
}

/** Look up an entered SKU against the catalog. Returns a match when
 *  the catalog contains a row with sku exactly equal (case-insensitive,
 *  trimmed) to the input AND that row is marked is_sku_blocked. The
 *  replacementSku field may still be null when the manager hasn't
 *  recorded one yet — callers should display a softer "blocked, no
 *  replacement recorded" hint in that case. */
export function findBlockedSku(parts: Part[] | undefined, sku: string): BlockedSkuMatch | null {
  const q = sku.trim().toLowerCase()
  if (!q || !parts) return null
  for (const p of parts) {
    if (!p.is_sku_blocked) continue
    if (p.sku.trim().toLowerCase() !== q) continue
    return { blockedSku: p.sku, replacementSku: p.replacement_sku }
  }
  return null
}
