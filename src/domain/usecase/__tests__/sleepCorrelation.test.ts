import { describe, it, expect } from 'vitest'
import { getTeethingSleepCorrelation } from '../sleepCorrelation'
import type { SleepSession } from '../../model/SleepSession'
import type { TeethingDay } from '../../model/TeethingDay'

const HOUR = 60 * 60 * 1000

// Constructor-based local Date round-trips through ISO, so the LOCAL hour and
// day stay fixed regardless of the test runner's timezone (same approach as
// averages.test.ts / sleepKind.test.ts).
const NOW = new Date(2026, 7, 9, 12)
const at = (dayOffsetFromToday: number, hour: number): string =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - dayOffsetFromToday, hour).toISOString()

const endAfter = (startIso: string, hours: number): string =>
  new Date(new Date(startIso).getTime() + hours * HOUR).toISOString()

const dayKey = (dayOffsetFromToday: number): string => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - dayOffsetFromToday)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const teething = (offsets: number[]): TeethingDay[] =>
  offsets.map((o, i) => ({ id: `t${i}`, day: dayKey(o), symptoms: ['Drooling'] }))

const sleep = (id: string, startIso: string, hours: number): SleepSession => ({
  id,
  startTime: startIso,
  endTime: endAfter(startIso, hours),
})

describe('getTeethingSleepCorrelation', () => {
  it('groups completed sleeps by local day and compares per-day averages by teething bucket', () => {
    const sleeps = [
      sleep('today-night', at(0, 1), 8),
      sleep('today-nap', at(0, 10), 1),
      sleep('d2-night', at(2, 22), 9),
      sleep('d1-night', at(1, 2), 7),
      sleep('d3-nap', at(3, 12), 1),
    ]
    const result = getTeethingSleepCorrelation(teething([0, 2]), sleeps, 30, NOW)

    expect(result).not.toBeNull()
    expect(result!.windowDays).toBe(30)
    expect(result!.teethingDayCount).toBe(2)
    expect(result!.nonTeethingDayCount).toBe(2)
    expect(result!.teethingDaysAvgMs).toBeCloseTo(9 * HOUR, 6)
    expect(result!.nonTeethingDaysAvgMs).toBeCloseTo(4 * HOUR, 6)
    expect(result!.diffMs).toBeCloseTo(5 * HOUR, 6)
    // Teething: today night (1:00) + d2 night (22:00) = 2 wakings over 2 days.
    // Non-teething: d1 night (2:00) = 1 waking, d3 nap (12:00) = 0, over 2 days.
    expect(result!.teethingNightWakingsAvg).toBeCloseTo(1, 6)
    expect(result!.nonTeethingNightWakingsAvg).toBeCloseTo(0.5, 6)
    expect(result!.teethingNightWakingsCount).toBe(2)
    expect(result!.nonTeethingNightWakingsCount).toBe(1)
  })

  it('excludes days without sleep data from that bucket average', () => {
    const sleeps = [
      sleep('teeth', at(0, 1), 8),
      sleep('plain', at(1, 2), 4),
    ]
    // Teething day at offset 2 has no sleep; non-teething day at offset 3 has no sleep.
    const result = getTeethingSleepCorrelation(teething([0, 2]), sleeps, 30, NOW)

    expect(result).not.toBeNull()
    expect(result!.teethingDayCount).toBe(1)
    expect(result!.nonTeethingDayCount).toBe(1)
    expect(result!.teethingDaysAvgMs).toBeCloseTo(8 * HOUR, 6)
    expect(result!.nonTeethingDaysAvgMs).toBeCloseTo(4 * HOUR, 6)
  })

  it('returns null when there is no teething day with sleep data', () => {
    const sleeps = [sleep('d1', at(1, 2), 7), sleep('d2', at(2, 12), 1)]
    expect(getTeethingSleepCorrelation([], sleeps, 30, NOW)).toBeNull()
    expect(getTeethingSleepCorrelation(teething([5]), sleeps, 30, NOW)).toBeNull()
  })

  it('returns null when there is no non-teething day with sleep data', () => {
    const sleeps = [sleep('teeth', at(0, 1), 8)]
    expect(getTeethingSleepCorrelation(teething([0, 1, 2]), sleeps, 30, NOW)).toBeNull()
  })

  it('returns null for empty and ongoing-only data', () => {
    expect(getTeethingSleepCorrelation([], [], 30, NOW)).toBeNull()
    const ongoingOnly: SleepSession[] = [
      { id: 'o', startTime: at(0, 23), endTime: null },
    ]
    expect(getTeethingSleepCorrelation(teething([0]), ongoingOnly, 30, NOW)).toBeNull()
  })

  it('attributes a midnight-spanning night sleep in full to its local start day', () => {
    const start = at(0, 23)
    const sleeps = [
      { id: 'span', startTime: start, endTime: endAfter(start, 6) }, // 23:00 -> 05:00 next local day
      sleep('plain', at(1, 12), 1),
    ]
    const result = getTeethingSleepCorrelation(teething([0]), sleeps, 30, NOW)

    expect(result).not.toBeNull()
    expect(result!.teethingDayCount).toBe(1)
    expect(result!.teethingDaysAvgMs).toBeCloseTo(6 * HOUR, 6)
    expect(result!.nonTeethingDaysAvgMs).toBeCloseTo(HOUR, 6)
  })

  it('is TZ-robust: day keys come from the local calendar day of the sleep start', () => {
    // Same fixtures as the grouping test; both the helper's grouping and the
    // expected keys are derived from local getters, so the assertions hold
    // under any timezone (verified via TZ= sweep).
    const sleeps = [
      sleep('a', at(0, 23), 8),
      sleep('b', at(0, 12), 1),
      sleep('c', at(1, 2), 7),
      sleep('d', at(3, 12), 1),
    ]
    const result = getTeethingSleepCorrelation(teething([0]), sleeps, 30, NOW)
    expect(result).not.toBeNull()
    expect(result!.teethingDaysAvgMs).toBeCloseTo(9 * HOUR, 6)
    expect(result!.nonTeethingDaysAvgMs).toBeCloseTo(4 * HOUR, 6)
  })

  it('honours a custom window size and ignores sleeps outside it', () => {
    const sleeps = [
      sleep('in', at(0, 1), 8),
      sleep('in2', at(1, 2), 4),
      sleep('out', at(10, 22), 9),
    ]
    const result = getTeethingSleepCorrelation(teething([0, 10]), sleeps, 7, NOW)

    expect(result).not.toBeNull()
    expect(result!.windowDays).toBe(7)
    expect(result!.teethingDayCount).toBe(1)
    expect(result!.nonTeethingDayCount).toBe(1)
    expect(result!.teethingDaysAvgMs).toBeCloseTo(8 * HOUR, 6)
    expect(result!.nonTeethingDaysAvgMs).toBeCloseTo(4 * HOUR, 6)
  })

  it('includes the last window day (boundary) as a teething day', () => {
    const sleeps = [
      sleep('edge', at(6, 1), 8),
      sleep('today', at(0, 2), 4),
    ]
    const result = getTeethingSleepCorrelation(teething([6]), sleeps, 7, NOW)
    expect(result).not.toBeNull()
    expect(result!.teethingDayCount).toBe(1)
    expect(result!.nonTeethingDayCount).toBe(1)
  })

  it('excludes ongoing sleeps from day totals even with a duration-like frame', () => {
    const sleeps: SleepSession[] = [
      sleep('done', at(0, 1), 8),
      { id: 'ongoing', startTime: at(0, 20), endTime: null },
      sleep('plain', at(1, 12), 1),
    ]
    const result = getTeethingSleepCorrelation(teething([0]), sleeps, 30, NOW)
    expect(result).not.toBeNull()
    expect(result!.teethingDaysAvgMs).toBeCloseTo(8 * HOUR, 6)
    expect(result!.nonTeethingDaysAvgMs).toBeCloseTo(HOUR, 6)
  })

  it('counts each night sleep starting in a day as a waking and averages per group', () => {
    const sleeps = [
      sleep('t-night-1', at(0, 23), 7),
      sleep('t-night-2', at(0, 2), 5),
      sleep('t-nap', at(0, 10), 1),
      sleep('nt-nap', at(1, 12), 2),
      sleep('nt-night', at(2, 20), 8),
    ]
    // Teething: day 0 has 2 night sleeps -> 2 wakings over 1 day.
    // Non-teething: day 1 nap only -> 0 wakings; day 2 night -> 1 waking; avg 0.5.
    const result = getTeethingSleepCorrelation(teething([0]), sleeps, 30, NOW)

    expect(result).not.toBeNull()
    expect(result!.teethingDayCount).toBe(1)
    expect(result!.nonTeethingDayCount).toBe(2)
    expect(result!.teethingNightWakingsAvg).toBeCloseTo(2, 6)
    expect(result!.nonTeethingNightWakingsAvg).toBeCloseTo(0.5, 6)
    expect(result!.teethingNightWakingsCount).toBe(2)
    expect(result!.nonTeethingNightWakingsCount).toBe(1)
  })

  it('counts a day with a night sleep as 1 waking and a nap-only day as 0 wakings', () => {
    const sleeps = [
      sleep('one-night', at(0, 23), 8),
      sleep('plain-nap', at(1, 12), 1),
    ]
    const result = getTeethingSleepCorrelation(teething([0]), sleeps, 30, NOW)

    expect(result).not.toBeNull()
    expect(result!.teethingDayCount).toBe(1)
    expect(result!.teethingNightWakingsAvg).toBe(1)
    expect(result!.teethingNightWakingsCount).toBe(1)
    expect(result!.nonTeethingDayCount).toBe(1)
    expect(result!.nonTeethingNightWakingsAvg).toBe(0)
    expect(result!.nonTeethingNightWakingsCount).toBe(0)
  })

  it('honors an explicit kind label over the local start hour for wakings', () => {
    const sleeps: SleepSession[] = [
      { id: 'explicit-night', startTime: at(0, 12), endTime: endAfter(at(0, 12), 2), kind: 'night' },
      { id: 'explicit-nap', startTime: at(1, 20), endTime: endAfter(at(1, 20), 2), kind: 'nap' },
    ]
    // Noon sleep explicitly labeled night counts as a waking on the teething
    // day; 8pm sleep explicitly labeled nap does not count on the non-teething day.
    const result = getTeethingSleepCorrelation(teething([0]), sleeps, 30, NOW)

    expect(result).not.toBeNull()
    expect(result!.teethingNightWakingsAvg).toBe(1)
    expect(result!.nonTeethingNightWakingsAvg).toBe(0)
  })
})
