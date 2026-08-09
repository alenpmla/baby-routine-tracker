import type { FeedingRepository, SleepRepository } from '../repository/repositories'
import type { FeedingSession } from '../model/FeedingSession'

export type Insight =
  | {
      id: 'next_feed'
      overdue: boolean
      lastFeedAt: string
      medianGapMs: number
      nextAt?: string
    }
  | {
      id: 'longest_stretch'
      startAt: string
      endAt: string
      durationMs: number
    }
  | {
      id: 'sleep_total'
      todayMs: number
      avgDayMs: number
    }

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const AVERAGE_DAYS = 30

function isMilkFeed(f: FeedingSession): boolean {
  return f.type === 'bottle' || f.type === 'breast'
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Feed times (ms) for milk feeds at or after `since`. */
function milkFeedTimes(feedingRepo: FeedingRepository, sinceMs: number): number[] {
  return feedingRepo
    .getAll()
    .filter((f) => isMilkFeed(f) && new Date(f.time).getTime() >= sinceMs)
    .map((f) => new Date(f.time).getTime())
    .sort((a, b) => a - b)
}

function nextFeedInsight(feedingRepo: FeedingRepository, now: Date): Insight | null {
  const times = milkFeedTimes(feedingRepo, now.getTime() - 48 * HOUR_MS)
  if (times.length < 3) {
    return null
  }

  const gaps = times
    .slice(1)
    .map((t, i) => t - times[i])
    .filter((g) => g >= HOUR_MS && g <= 8 * HOUR_MS)

  const medianGapMs = median(gaps)
  if (medianGapMs === null) {
    return null
  }

  const lastFeedAt = times[times.length - 1]
  const elapsedMs = now.getTime() - lastFeedAt
  const overdue = elapsedMs > medianGapMs + 0.5 * HOUR_MS

  return {
    id: 'next_feed',
    overdue,
    lastFeedAt: new Date(lastFeedAt).toISOString(),
    medianGapMs,
    nextAt: overdue ? undefined : new Date(lastFeedAt + medianGapMs).toISOString(),
  }
}

function longestStretchInsight(feedingRepo: FeedingRepository, now: Date): Insight | null {
  const times = milkFeedTimes(feedingRepo, now.getTime() - 24 * HOUR_MS)
  if (times.length < 2) {
    return null
  }

  let best: { start: number; end: number } | null = null
  for (let i = 1; i < times.length; i += 1) {
    const gap = times[i] - times[i - 1]
    if (gap >= 2 * HOUR_MS && (!best || gap > best.end - best.start)) {
      best = { start: times[i - 1], end: times[i] }
    }
  }
  if (!best) {
    return null
  }

  return {
    id: 'longest_stretch',
    startAt: new Date(best.start).toISOString(),
    endAt: new Date(best.end).toISOString(),
    durationMs: best.end - best.start,
  }
}

function sleepTotalInsight(sleepRepo: SleepRepository, now: Date): Insight | null {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const todayEnd = todayStart + DAY_MS
  const windowStart = todayStart - (AVERAGE_DAYS - 1) * DAY_MS

  let todayMs = 0
  let windowMs = 0
  for (const s of sleepRepo.getAll()) {
    if (!s.endTime) {
      continue
    }
    const start = new Date(s.startTime).getTime()
    const end = new Date(s.endTime).getTime()
    if (end <= start) {
      continue
    }

    const overlapStart = Math.max(start, todayStart)
    const overlapEnd = Math.min(end, now.getTime())
    if (overlapStart < overlapEnd && overlapEnd <= todayEnd) {
      todayMs += overlapEnd - overlapStart
    }

    if (start >= windowStart && start < todayEnd) {
      windowMs += end - start
    }
  }

  if (todayMs <= 0) {
    return null
  }

  return {
    id: 'sleep_total',
    todayMs,
    avgDayMs: windowMs / AVERAGE_DAYS,
  }
}

/** Computes the currently applicable insights; omits any that lack data. */
export function getInsights(
  sleepRepo: SleepRepository,
  feedingRepo: FeedingRepository,
  now = new Date(),
): Insight[] {
  const insights: Insight[] = []

  const nextFeed = nextFeedInsight(feedingRepo, now)
  if (nextFeed) {
    insights.push(nextFeed)
  }

  const longestStretch = longestStretchInsight(feedingRepo, now)
  if (longestStretch) {
    insights.push(longestStretch)
  }

  const sleepTotal = sleepTotalInsight(sleepRepo, now)
  if (sleepTotal) {
    insights.push(sleepTotal)
  }

  return insights
}
