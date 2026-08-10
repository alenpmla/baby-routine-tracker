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

  const groups = FOOD_GROUP_DEFS.map((def) => {
    const foods = [...byName.entries()]
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
