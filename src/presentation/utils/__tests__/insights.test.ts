import { describe, it, expect } from 'vitest'
import { describeInsight } from '../insights'

const HOUR = 60 * 60 * 1000
const NOW = new Date(2026, 7, 9, 12)

describe('describeInsight', () => {
  it('formats the next-feed prediction', () => {
    const nextAt = new Date(NOW.getTime() + HOUR)
    const { title, detail } = describeInsight(
      {
        id: 'next_feed',
        overdue: false,
        lastFeedAt: new Date(NOW.getTime() - 2 * HOUR).toISOString(),
        medianGapMs: 3 * HOUR,
        nextAt: nextAt.toISOString(),
      },
      NOW,
    )
    expect(title).toBe('Next feed likely')
    expect(detail).toContain('Around')
    expect(detail).toContain('typical gap 3h')
  })

  it('formats the overdue next-feed reframe', () => {
    const { title, detail } = describeInsight(
      {
        id: 'next_feed',
        overdue: true,
        lastFeedAt: new Date(NOW.getTime() - 5 * HOUR).toISOString(),
        medianGapMs: 3 * HOUR,
      },
      NOW,
    )
    expect(title).toBe('Feed time?')
    expect(detail).toContain('5h 0m since last feed')
    expect(detail).toContain('typical gap 3h 0m')
  })

  it('formats the longest stretch with its span', () => {
    const { title, detail } = describeInsight(
      {
        id: 'longest_stretch',
        startAt: new Date(NOW.getTime() - 20 * HOUR).toISOString(),
        endAt: new Date(NOW.getTime() - 6 * HOUR).toISOString(),
        durationMs: 14 * HOUR,
      },
      NOW,
    )
    expect(title).toBe('Longest stretch between feeds')
    expect(detail).toContain('14h')
    expect(detail).toContain('→')
  })

  it('formats the sleep-total pacing with "so far"', () => {
    const { title, detail } = describeInsight(
      {
        id: 'sleep_total',
        todayMs: 2 * HOUR + 30 * 60 * 1000,
        avgDayMs: 4 * HOUR,
      },
      NOW,
    )
    expect(title).toBe('Slept today')
    expect(detail).toContain('2h 30m so far')
    expect(detail).toContain('~4h 0m/day')
  })
})
