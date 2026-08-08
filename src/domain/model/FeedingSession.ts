export type FeedingType = 'bottle' | 'breast' | 'solids'

export type AmountUnit = 'oz' | 'gram' | 'ml'

export interface FeedingSession {
  id: string
  /** ISO-8601 UTC; the record time (start time for breast) */
  time: string
  type: FeedingType
  /** Required for solids; list of foods eaten */
  foods?: string[]
  /** @deprecated legacy single-food field; migrated to `foods` on load */
  food?: string
  amount?: number
  unit?: AmountUnit
  /** Breast nursing */
  startTime?: string
  endTime?: string
}

/** The list of foods for a solids feed, including legacy `food` records. */
export function foodsOf(f: FeedingSession): string[] {
  if (Array.isArray(f.foods) && f.foods.length > 0) {
    return f.foods
  }
  return typeof f.food === 'string' && f.food.trim() ? [f.food.trim()] : []
}

/** Migrates a legacy `food` string to the `foods` array (removes the legacy field). */
export function normalizeFeeding(f: FeedingSession): FeedingSession {
  if (Array.isArray(f.foods) && f.foods.length > 0) {
    return { ...f, food: undefined }
  }
  if (typeof f.food === 'string' && f.food.trim()) {
    return { ...f, foods: [f.food.trim()], food: undefined }
  }
  return { ...f }
}
