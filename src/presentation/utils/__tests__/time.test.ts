import { describe, it, expect } from 'vitest'
import { formatClock, formatDuration, describeAge, getDayRange } from '../time'

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
})
