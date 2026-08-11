import type { FeedingRepository } from '../repository/repositories'
import { foodsOf } from '../model/FeedingSession'

/**
 * Returns the most frequently logged foods that are selectable from the given
 * suggestion list. Each food counts once per solids feed (case-insensitive);
 * results are sorted by frequency descending, then name ascending, capped at
 * `limit`. Original casing from the suggestion list is preserved.
 */
export function getMostUsedFoods(
  repo: FeedingRepository,
  suggestions: string[],
  limit = 6,
): string[] {
  if (suggestions.length === 0) {
    return []
  }
  const suggestionKey = new Map<string, string>()
  for (const s of suggestions) {
    suggestionKey.set(s.trim().toLowerCase(), s.trim())
  }

  const counts = new Map<string, number>()
  for (const feed of repo.getAll()) {
    if (feed.type !== 'solids') {
      continue
    }
    const seen = new Set<string>()
    for (const food of foodsOf(feed)) {
      const key = food.trim().toLowerCase()
      if (!key || seen.has(key) || !suggestionKey.has(key)) {
        continue
      }
      seen.add(key)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => suggestionKey.get(key) ?? key)
}
