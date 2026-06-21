import { useAppSettings } from './useAppSettings'

export interface PriorityWeights {
  disabling: number
  openCalls: number
  importance: number
  closeRate: number
  receivedParts: number
}

export const PRIORITY_WEIGHT_KEY = 'priority_weights'
export const PRIORITY_IMPORTANCE_KEY = 'priority_importance'
export const PRIORITY_COMMANDER_KEY = 'priority_commander_bonus'

/** Even split across the five parameters (sums to 100). */
export const DEFAULT_WEIGHTS: PriorityWeights = {
  disabling: 20,
  openCalls: 20,
  importance: 20,
  closeRate: 20,
  receivedParts: 20,
}

/** Operational-importance rating when a company has none set. */
export const DEFAULT_IMPORTANCE = 1
export const MAX_IMPORTANCE = 5

export function parseWeights(raw: string | undefined): PriorityWeights {
  if (!raw) return DEFAULT_WEIGHTS
  try {
    const v = JSON.parse(raw)
    return {
      disabling:     Number(v.disabling)     || 0,
      openCalls:     Number(v.openCalls)     || 0,
      importance:    Number(v.importance)    || 0,
      closeRate:     Number(v.closeRate)     || 0,
      receivedParts: Number(v.receivedParts) || 0,
    }
  } catch {
    return DEFAULT_WEIGHTS
  }
}

export function parseImportance(raw: string | undefined): Record<string, number> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return typeof v === 'object' && v ? v : {}
  } catch {
    return {}
  }
}

export function parseCommanderBonus(raw: string | undefined): Record<string, number> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return typeof v === 'object' && v ? v : {}
  } catch {
    return {}
  }
}

/** Reads the manager-configured priority weights + per-company importance. */
export function usePriorityConfig() {
  const { data: settings, isLoading } = useAppSettings()
  return {
    isLoading,
    weights: parseWeights(settings?.[PRIORITY_WEIGHT_KEY]),
    importance: parseImportance(settings?.[PRIORITY_IMPORTANCE_KEY]),
    commanderBonus: parseCommanderBonus(settings?.[PRIORITY_COMMANDER_KEY]),
  }
}

/**
 * Total priority score (0–100) for one company given the weights and its
 * operational-importance rating. Weights are expected to sum to 100, so
 * the result is already on a 0–100 scale.
 */
export function priorityScore(
  c: { scoreDisabling: number; scoreOpenCalls: number; scoreCloseRate: number; scoreReceived: number },
  weights: PriorityWeights,
  importanceRating: number,
  commanderBonus = 0,
): number {
  const importanceScore = Math.min(importanceRating, MAX_IMPORTANCE) / MAX_IMPORTANCE
  return Math.round(
    weights.disabling     * c.scoreDisabling +
    weights.openCalls     * c.scoreOpenCalls +
    weights.importance    * importanceScore +
    weights.closeRate     * c.scoreCloseRate +
    weights.receivedParts * c.scoreReceived +
    commanderBonus,
  )
}
