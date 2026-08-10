import type { FeedingRepository } from '../repository/repositories'
import { FOOD_GROUP_DEFS, type FoodGroupId } from '../model/FoodGroup'
import { foodsOf } from '../model/FeedingSession'

export interface FoodGroupCoverage {
  id: FoodGroupId
  label: string
  trySuggestion: string
  covered: boolean
  foods: string[]
}

export interface FoodVariety {
  coveredCount: number
  totalGroups: number
  groups: FoodGroupCoverage[]
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Splits a free-text food name into lowercased alphanumeric tokens. */
export function tokenizeFood(food: string): string[] {
  return food
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
}

/** Classifies a food name into food groups using exact-token keyword matching. */
export function classifyFood(food: string): FoodGroupId[] {
  const tokens = new Set(tokenizeFood(food))
  const groups: FoodGroupId[] = []
  for (const def of FOOD_GROUP_DEFS) {
    if (def.keywords.some((kw) => tokens.has(kw))) {
      groups.push(def.id)
    }
  }
  return groups
}

/** Every recognised food token, used to guard plural collapsing. */
const KEYWORD_SET = new Set(FOOD_GROUP_DEFS.flatMap((def) => def.keywords))

/** Maps real-data misspellings to the canonical food name (lowercased). */
const FOOD_ALIASES: Record<string, string> = {
  pototo: 'potato',
  parship: 'parsnip',
  cattot: 'carrot',
  catty: 'carrot',
  sakmon: 'salmon',
  avacado: 'avocado',
  acvado: 'avocado',
  avado: 'avocado',
  banna: 'banana',
  baanan: 'banana',
  prars: 'pear',
  zuchini: 'zucchini',
}

/**
 * Reduces a food name to its canonical form (lowercased, singular) so that
 * case variants, simple plurals and known misspellings dedupe to one entry.
 */
export function canonicalFoodName(name: string): string {
  const lower = name.trim().toLowerCase()
  if (FOOD_ALIASES[lower]) {
    return FOOD_ALIASES[lower]
  }
  if (lower.endsWith('ies')) {
    const singular = `${lower.slice(0, -3)}y`
    if (KEYWORD_SET.has(singular)) {
      return singular
    }
  }
  if (lower.endsWith('es')) {
    const singular = lower.slice(0, -2)
    if (KEYWORD_SET.has(singular)) {
      return singular
    }
  }
  if (lower.endsWith('s')) {
    const singular = lower.slice(0, -1)
    if (KEYWORD_SET.has(singular)) {
      return singular
    }
  }
  return lower
}

/** Covers the food groups eaten via solids feeds over the last `days` (rolling window). */
export function getFoodVariety(
  feedingRepo: FeedingRepository,
  now = new Date(),
  days = 7,
): FoodVariety | null {
  const windowStart = now.getTime() - days * DAY_MS
  const feeds = feedingRepo
    .getAll()
    .filter((f) => f.type === 'solids' && new Date(f.time).getTime() >= windowStart)
  if (feeds.length === 0) {
    return null
  }

  const byName = new Map<string, string>()
  for (const feed of feeds) {
    for (const food of foodsOf(feed)) {
      const trimmed = food.trim()
      if (!trimmed) {
        continue
      }
      const key = trimmed.toLowerCase()
      if (!byName.has(key)) {
        byName.set(key, trimmed)
      }
    }
  }

  const byCanonical = new Map<string, string>()
  for (const [, original] of byName) {
    const lower = original.toLowerCase()
    const canonical = canonicalFoodName(original)
    const display = lower === canonical ? original : (byCanonical.get(canonical) ?? canonical)
    byCanonical.set(canonical, display)
  }

  const groups = FOOD_GROUP_DEFS.map((def) => {
    const foods = [...byCanonical.entries()]
      .filter(([key]) => classifyFood(key).includes(def.id))
      .map(([, original]) => original)
      .sort((a, b) => a.localeCompare(b))
    return {
      id: def.id,
      label: def.label,
      trySuggestion: def.trySuggestion,
      covered: foods.length > 0,
      foods,
    }
  })

  return {
    coveredCount: groups.filter((g) => g.covered).length,
    totalGroups: groups.length,
    groups,
  }
}
