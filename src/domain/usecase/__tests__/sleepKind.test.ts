import { describe, it, expect } from 'vitest'
import { inferSleepKind, sleepKind, isNightSleep, isNap } from '../../model/SleepSession'
import type { SleepSession, SleepKind } from '../../model/SleepSession'
import { sleepTotalsByKind } from '../sleep'

const HOUR = 60 * 60 * 1000

// Constructor-based local Date round-trips through ISO, so the LOCAL start hour
// stays fixed regardless of the test runner's timezone (same approach as
// averages.test.ts).
const iso = (hour: number) => new Date(2026, 7, 14, hour, 0).toISOString()

function completed(startHour: number, durationHours = 1, kind?: SleepKind): SleepSession {
  return {
    id: `s${startHour}`,
    startTime: iso(startHour),
    endTime: new Date(new Date(iso(startHour)).getTime() + durationHours * HOUR).toISOString(),
    ...(kind ? { kind } : {}),
  }
}

function ongoing(startHour: number, kind?: SleepKind): SleepSession {
  return {
    id: `o${startHour}`,
    startTime: iso(startHour),
    endTime: null,
    ...(kind ? { kind } : {}),
  }
}

describe('sleep kind inference', () => {
  it('respects an explicit kind over inference', () => {
    const s = completed(12, 1, 'night')
    expect(sleepKind(s)).toBe('night')
    expect(isNightSleep(s)).toBe(true)
    expect(isNap(s)).toBe(false)
  })

  it('classifies a completed sleep by its local start hour (night: >=19 or <9)', () => {
    const expected: Record<number, 'nap' | 'night'> = {
      6: 'night',
      8: 'night',
      9: 'nap',
      10: 'nap',
      12: 'nap',
      18: 'nap',
      19: 'night',
      20: 'night',
      23: 'night',
    }
    for (const [hour, kind] of Object.entries(expected)) {
      const s = completed(Number(hour))
      expect(inferSleepKind(s)).toBe(kind)
      expect(sleepKind(s)).toBe(kind)
    }
  })

  it('buckets by local start hour, so minute-level boundaries follow the hour', () => {
    const at = (hour: number, minute: number) => new Date(2026, 7, 14, hour, minute).toISOString()
    const session = (startIso: string): SleepSession => ({
      id: startIso,
      startTime: startIso,
      endTime: new Date(new Date(startIso).getTime() + HOUR).toISOString(),
    })
    expect(inferSleepKind(session(at(8, 59)))).toBe('night')
    expect(inferSleepKind(session(at(9, 0)))).toBe('nap')
    expect(inferSleepKind(session(at(18, 59)))).toBe('nap')
    expect(inferSleepKind(session(at(19, 0)))).toBe('night')
  })

  it('treats an ongoing sleep without a kind as a nap', () => {
    const s = ongoing(23)
    expect(sleepKind(s)).toBe('nap')
    expect(isNightSleep(s)).toBe(false)
    expect(isNap(s)).toBe(true)
  })

  it('honors an explicit kind on an ongoing sleep', () => {
    expect(sleepKind(ongoing(10, 'night'))).toBe('night')
  })
})

describe('sleepTotalsByKind', () => {
  it('sums duration and counts by kind using explicit and inferred kinds', () => {
    const sleeps = [
      completed(23, 8, 'night'), // explicit night, 8h
      completed(6, 2), // inferred night (6am local), 2h
      completed(10, 1), // inferred nap, 1h
      completed(12, 2, 'nap'), // explicit nap, 2h
      ongoing(14), // ongoing: excluded
    ]
    const totals = sleepTotalsByKind(sleeps)
    expect(totals.nightMs).toBe(10 * HOUR)
    expect(totals.napMs).toBe(3 * HOUR)
    expect(totals.nightCount).toBe(2)
    expect(totals.napCount).toBe(2)
  })

  it('returns zeros for an empty list', () => {
    expect(sleepTotalsByKind([])).toEqual({ nightMs: 0, napMs: 0, nightCount: 0, napCount: 0 })
  })

  it('excludes ongoing sleeps from counts and duration even with an explicit kind', () => {
    const totals = sleepTotalsByKind([ongoing(23, 'night'), ongoing(10, 'nap')])
    expect(totals).toEqual({ nightMs: 0, napMs: 0, nightCount: 0, napCount: 0 })
  })
})
