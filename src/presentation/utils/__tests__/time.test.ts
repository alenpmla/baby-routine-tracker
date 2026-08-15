import { describe, it, expect } from 'vitest'
import {
  formatClock,
  formatDuration,
  describeAge,
  getDayRange,
  formatDate,
  formatDayMonth,
} from '../time'

describe('time utils', () => {
  it('formats a clock from ISO in local time', () => {
    const d = new Date('2026-08-08T09:05:00.000Z')
    expect(formatClock('2026-08-08T09:05:00.000Z')).toBe(
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    )
  })

  it('formats duration in h/m units', () => {
    expect(formatDuration(45 * 60 * 1000)).toBe('45m')
    expect(formatDuration(83 * 60 * 1000)).toBe('1h 23m')
  })

  it('computes the local day range', () => {
    const { start, end } = getDayRange(new Date(2026, 7, 8, 14, 30))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(7)
    expect(start.getDate()).toBe(8)
    expect(end.getDate()).toBe(9)
  })

  it('describes a baby age', () => {
    expect(describeAge('2026-01-15', new Date('2026-03-15'))).toContain('2 mo')
    expect(describeAge('2025-01-15', new Date('2026-01-15'))).toBe('1 yr')
  })

  it('formats a date in local time and returns empty for invalid input', () => {
    const d = new Date('2026-08-03T12:00:00.000Z')
    expect(formatDate('2026-08-03T12:00:00.000Z')).toBe(
      d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    )
    expect(formatDate('not-a-date')).toBe('')
  })

  it('formats a day-month in local time and returns empty for invalid input', () => {
    const d = new Date('2026-08-03T12:00:00.000Z')
    expect(formatDayMonth('2026-08-03T12:00:00.000Z')).toBe(
      d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    )
    expect(formatDayMonth('not-a-date')).toBe('')
  })
})
