import { describe, it, expect } from 'vitest'
import {
  formatClock,
  formatDuration,
  describeAge,
  getDayRange,
  formatDate,
  formatDayMonth,
  firstOfMonth,
  lastOfMonth,
  monthBack,
  toInputDate,
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

describe('month boundary helpers', () => {
  it('firstOfMonth returns local midnight of day 1 of the calendar month', () => {
    const result = firstOfMonth(new Date(2026, 7, 16))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(7)
    expect(result.getDate()).toBe(1)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(toInputDate(result)).toBe('2026-08-01')
  })

  it('firstOfMonth handles January boundaries', () => {
    const result = firstOfMonth(new Date(2026, 0, 16))
    expect(toInputDate(result)).toBe('2026-01-01')
  })

  it('lastOfMonth returns the last day of the calendar month', () => {
    const result = lastOfMonth(new Date(2026, 7, 16))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(7)
    expect(result.getDate()).toBe(31)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(toInputDate(result)).toBe('2026-08-31')
  })

  it('lastOfMonth returns 28 for non-leap February', () => {
    const result = lastOfMonth(new Date(2026, 1, 5))
    expect(toInputDate(result)).toBe('2026-02-28')
  })

  it('lastOfMonth returns 29 for a leap-year February', () => {
    const result = lastOfMonth(new Date(2028, 1, 29))
    expect(result.getFullYear()).toBe(2028)
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(29)
    expect(toInputDate(result)).toBe('2028-02-29')
  })

  it('monthBack keeps the same day-of-month', () => {
    const result = monthBack(new Date(2026, 7, 14), 3)
    expect(toInputDate(result)).toBe('2026-05-14')
  })

  it('monthBack clamps to the target month last day', () => {
    const result = monthBack(new Date(2026, 4, 31), 1)
    expect(toInputDate(result)).toBe('2026-04-30')
  })

  it('monthBack keeps the same day when the target month is long enough', () => {
    const result = monthBack(new Date(2026, 7, 31), 3)
    expect(toInputDate(result)).toBe('2026-05-31')
  })

  it('monthBack crosses a year boundary', () => {
    const result = monthBack(new Date(2026, 0, 15), 1)
    expect(toInputDate(result)).toBe('2025-12-15')
  })

  it('monthBack returns the same date for n of zero', () => {
    const result = monthBack(new Date(2026, 7, 16), 0)
    expect(toInputDate(result)).toBe('2026-08-16')
  })

  it('this month range spans first to last of the month', () => {
    const start = firstOfMonth(new Date(2026, 7, 14))
    const end = lastOfMonth(new Date(2026, 7, 14))
    expect(toInputDate(start)).toBe('2026-08-01')
    expect(toInputDate(end)).toBe('2026-08-31')
  })

  it('last month range spans first to last of the previous month', () => {
    const start = firstOfMonth(monthBack(new Date(2026, 7, 14), 1))
    const end = lastOfMonth(monthBack(new Date(2026, 7, 14), 1))
    expect(toInputDate(start)).toBe('2026-07-01')
    expect(toInputDate(end)).toBe('2026-07-31')
  })

  it('past 3 months starts today minus 3 calendar months', () => {
    const start = monthBack(new Date(2026, 7, 14), 3)
    expect(toInputDate(start)).toBe('2026-05-14')
  })
})
