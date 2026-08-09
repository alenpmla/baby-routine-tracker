import { describe, it, expect } from 'vitest'
import { getInsights } from '../insights'
import type { FeedingSession } from '../../model/FeedingSession'
import type { SleepSession } from '../../model/SleepSession'
import type { FeedingRepository, SleepRepository } from '../../repository/repositories'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

// Fixed "now": 2026-08-09 local noon.
const NOW = new Date(2026, 7, 9, 12)
const ms = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString()

function feedingRepo(items: FeedingSession[]): FeedingRepository {
  return { getAll: () => items } as FeedingRepository
}
function sleepRepo(items: SleepSession[]): SleepRepository {
  return { getAll: () => items } as SleepRepository
}

function milk(id: string, offsetMs: number, type: 'bottle' | 'breast' = 'bottle'): FeedingSession {
  return { id, time: ms(offsetMs), type }
}

describe('getInsights', () => {
  it('returns no insights for empty data', () => {
    expect(getInsights(sleepRepo([]), feedingRepo([]), NOW)).toEqual([])
  })

  describe('next_feed', () => {
    it('predicts the next feed from the median milk-feed gap', () => {
      const feeds = [milk('a', -8 * HOUR), milk('b', -5 * HOUR), milk('c', -2 * HOUR)]
      const insights = getInsights(sleepRepo([]), feedingRepo(feeds), NOW)
      const next = insights.find((i) => i.id === 'next_feed')
      expect(next).toBeDefined()
      if (next?.id === 'next_feed') {
        expect(next.overdue).toBe(false)
        expect(next.medianGapMs).toBe(3 * HOUR)
        expect(next.nextAt).toBe(ms(1 * HOUR))
      }
    })

    it('reframes as overdue when the last feed is well past the typical gap', () => {
      const feeds = [milk('a', -11 * HOUR), milk('b', -8 * HOUR), milk('c', -5 * HOUR)]
      const insights = getInsights(sleepRepo([]), feedingRepo(feeds), NOW)
      const next = insights.find((i) => i.id === 'next_feed')
      expect(next).toBeDefined()
      if (next?.id === 'next_feed') {
        expect(next.overdue).toBe(true)
        expect(next.nextAt).toBeUndefined()
      }
    })

    it('ignores solids feeds when measuring the feeding rhythm', () => {
      const feeds = [
        milk('a', -8 * HOUR),
        milk('b', -5 * HOUR),
        { id: 'solids', time: ms(-2 * HOUR), type: 'solids', foods: ['banana'] } as FeedingSession,
      ]
      const insights = getInsights(sleepRepo([]), feedingRepo(feeds), NOW)
      expect(insights.find((i) => i.id === 'next_feed')).toBeUndefined()
    })

    it('requires at least three milk feeds in 48h', () => {
      const feeds = [milk('a', -8 * HOUR), milk('b', -5 * HOUR)]
      const insights = getInsights(sleepRepo([]), feedingRepo(feeds), NOW)
      expect(insights.find((i) => i.id === 'next_feed')).toBeUndefined()
    })

    it('filters out implausibly short gaps', () => {
      const feeds = [milk('a', -6 * HOUR), milk('b', -3 * HOUR), milk('c', -3 * HOUR + 10 * 60 * 1000)]
      const insights = getInsights(sleepRepo([]), feedingRepo(feeds), NOW)
      const next = insights.find((i) => i.id === 'next_feed')
      if (next?.id === 'next_feed') {
        expect(next.medianGapMs).toBe(3 * HOUR)
      } else {
        expect(next).toBeDefined()
      }
    })
  })

  describe('longest_stretch', () => {
    it('reports the largest gap between milk feeds in 24h', () => {
      const feeds = [milk('a', -20 * HOUR), milk('b', -6 * HOUR), milk('c', -4 * HOUR)]
      const insights = getInsights(sleepRepo([]), feedingRepo(feeds), NOW)
      const stretch = insights.find((i) => i.id === 'longest_stretch')
      expect(stretch).toBeDefined()
      if (stretch?.id === 'longest_stretch') {
        expect(stretch.durationMs).toBe(14 * HOUR)
        expect(stretch.startAt).toBe(ms(-20 * HOUR))
        expect(stretch.endAt).toBe(ms(-6 * HOUR))
      }
    })

    it('omits the insight when no gap reaches two hours', () => {
      const feeds = [milk('a', -90 * 60 * 1000), milk('b', -60 * 60 * 1000)]
      const insights = getInsights(sleepRepo([]), feedingRepo(feeds), NOW)
      expect(insights.find((i) => i.id === 'longest_stretch')).toBeUndefined()
    })

    it('requires at least two milk feeds', () => {
      const insights = getInsights(sleepRepo([]), feedingRepo([milk('a', -5 * HOUR)]), NOW)
      expect(insights.find((i) => i.id === 'longest_stretch')).toBeUndefined()
    })
  })

  describe('sleep_total', () => {
    it('reports completed sleep so far today vs the 30-day daily average', () => {
      const sleeps: SleepSession[] = [
        { id: 's1', startTime: ms(-3 * HOUR), endTime: ms(-2 * HOUR) }, // 1h today
        { id: 's2', startTime: new Date(NOW.getTime() - 5 * DAY).toISOString(), endTime: new Date(NOW.getTime() - 5 * DAY + 2 * HOUR).toISOString() }, // 2h five days ago
      ]
      const insights = getInsights(sleepRepo(sleeps), feedingRepo([]), NOW)
      const sleep = insights.find((i) => i.id === 'sleep_total')
      expect(sleep).toBeDefined()
      if (sleep?.id === 'sleep_total') {
        expect(sleep.todayMs).toBe(HOUR)
        expect(sleep.avgDayMs).toBeCloseTo((3 * HOUR) / 30, 4)
      }
    })

    it('counts an overnight sleep by its overlap with today', () => {
      const sleeps: SleepSession[] = [
        { id: 'overnight', startTime: ms(-10 * HOUR), endTime: ms(-2 * HOUR) },
      ]
      // start 02:00, end 10:00 local -> both within today: 8h today
      const insights = getInsights(sleepRepo(sleeps), feedingRepo([]), NOW)
      const sleep = insights.find((i) => i.id === 'sleep_total')
      expect(sleep).toBeDefined()
      if (sleep?.id === 'sleep_total') {
        expect(sleep.todayMs).toBe(8 * HOUR)
      }
    })

    it('omits the insight when nothing was slept today', () => {
      const sleeps: SleepSession[] = [
        { id: 's1', startTime: new Date(NOW.getTime() - 2 * DAY).toISOString(), endTime: new Date(NOW.getTime() - 2 * DAY + 2 * HOUR).toISOString() },
      ]
      const insights = getInsights(sleepRepo(sleeps), feedingRepo([]), NOW)
      expect(insights.find((i) => i.id === 'sleep_total')).toBeUndefined()
    })

    it('ignores a running sleep', () => {
      const sleeps: SleepSession[] = [
        { id: 'running', startTime: ms(-3 * HOUR), endTime: null },
      ]
      const insights = getInsights(sleepRepo(sleeps), feedingRepo([]), NOW)
      expect(insights.find((i) => i.id === 'sleep_total')).toBeUndefined()
    })
  })
})
