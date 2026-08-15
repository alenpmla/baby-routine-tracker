import { describe, it, expect } from 'vitest'
import { getDailyAverages } from '../averages'
import type { DiaperChange } from '../../model/DiaperChange'
import type { FeedingSession } from '../../model/FeedingSession'
import type { SleepSession } from '../../model/SleepSession'
import type { DiaperRepository, FeedingRepository, SleepRepository } from '../../repository/repositories'

const HOUR = 60 * 60 * 1000
const OZ_TO_GRAM = 28.3495

function sleepRepo(items: SleepSession[]): SleepRepository {
  return { getAll: () => items } as SleepRepository
}
function feedingRepo(items: FeedingSession[]): FeedingRepository {
  return { getAll: () => items } as FeedingRepository
}
function diaperRepo(items: DiaperChange[]): DiaperRepository {
  return { getAll: () => items } as DiaperRepository
}

// Fixed "now": 2026-08-09 local noon. Window = [2026-07-11 00:00, 2026-08-10 00:00).
const NOW = new Date(2026, 7, 9, 12)
const at = (dayOffsetFromToday: number, hour = 12) =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - dayOffsetFromToday, hour).toISOString()

describe('getDailyAverages', () => {
  it('returns zeros for empty data over the 30-day window', () => {
    const avg = getDailyAverages(sleepRepo([]), feedingRepo([]), diaperRepo([]), 30, NOW)
    expect(avg.days).toBe(30)
    expect(avg.avgSleepMs).toBe(0)
    expect(avg.avgSolidsGram).toBe(0)
    expect(avg.avgDiapers).toBe(0)
  })

  it('averages solids amount across the window, converting oz to grams', () => {
    const feedings: FeedingSession[] = [
      { id: 'f1', time: at(0), type: 'solids', foods: ['banana'], amount: 90, unit: 'gram' },
      { id: 'f2', time: at(0), type: 'solids', foods: ['apple'], amount: 60, unit: 'gram' },
      { id: 'f3', time: at(10), type: 'solids', foods: ['pear'], amount: 2, unit: 'oz' },
      { id: 'bottle', time: at(0), type: 'bottle', amount: 120, unit: 'ml' }, // not solids: ignored
      { id: 'old', time: at(45), type: 'solids', foods: ['x'], amount: 500, unit: 'gram' }, // outside window
    ]
    const avg = getDailyAverages(sleepRepo([]), feedingRepo(feedings), diaperRepo([]), 30, NOW)
    const expectedGram = (90 + 60 + 2 * OZ_TO_GRAM) / 30
    expect(avg.avgSolidsGram).toBeCloseTo(expectedGram, 6)
  })

  it('averages diaper change count across the window', () => {
    const diapers: DiaperChange[] = [
      { id: 'd1', time: at(0), type: 'wet' },
      { id: 'd2', time: at(0), type: 'wet' },
      { id: 'd3', time: at(3), type: 'dirty' },
      { id: 'old', time: at(60), type: 'wet' },
    ]
    const avg = getDailyAverages(sleepRepo([]), feedingRepo([]), diaperRepo(diapers), 30, NOW)
    expect(avg.avgDiapers).toBeCloseTo(3 / 30, 6)
  })

  it('averages sleep duration using completed sleeps only', () => {
    const sleeps: SleepSession[] = [
      { id: 's1', startTime: at(0, 1), endTime: at(0, 9) }, // 8h today
      { id: 's2', startTime: at(5, 22), endTime: at(5, 23) }, // 1h five days ago
      { id: 'ongoing', startTime: at(0, 10), endTime: null }, // ongoing: ignored
      { id: 'old', startTime: at(45, 0), endTime: at(45, 12) }, // outside window
    ]
    const avg = getDailyAverages(sleepRepo(sleeps), feedingRepo([]), diaperRepo([]), 30, NOW)
    expect(avg.avgSleepMs).toBeCloseTo((8 * HOUR + 1 * HOUR) / 30, 0)
  })

  it('splits the sleep average into night vs nap by kind', () => {
    const sleeps: SleepSession[] = [
      { id: 'night1', startTime: at(0, 1), endTime: at(0, 9) }, // 8h, start 1am -> night
      { id: 'nap1', startTime: at(0, 10), endTime: at(0, 11) }, // 1h, start 10am -> nap
      { id: 'night2', startTime: at(0, 12), endTime: at(0, 14), kind: 'night' }, // explicit night overrides nap inference
      { id: 'night3', startTime: at(5, 22), endTime: at(5, 23) }, // 1h, start 10pm -> night
    ]
    const avg = getDailyAverages(sleepRepo(sleeps), feedingRepo([]), diaperRepo([]), 30, NOW)
    expect(avg.avgSleepMs).toBeCloseTo((8 * HOUR + 1 * HOUR + 2 * HOUR + 1 * HOUR) / 30, 0)
    expect(avg.avgNightSleepMs).toBeCloseTo((8 * HOUR + 2 * HOUR + 1 * HOUR) / 30, 0)
    expect(avg.avgNapSleepMs).toBeCloseTo(HOUR / 30, 0)
  })

  it('excludes an ongoing sleep from the night/nap split even when it has an explicit kind', () => {
    const sleeps: SleepSession[] = [
      { id: 'night', startTime: at(0, 1), endTime: at(0, 9), kind: 'night' }, // 8h explicit night
      { id: 'ongoing', startTime: at(0, 22), endTime: null, kind: 'night' }, // ongoing night: excluded
      { id: 'nap', startTime: at(0, 12), endTime: at(0, 13) }, // 1h inferred nap
    ]
    const avg = getDailyAverages(sleepRepo(sleeps), feedingRepo([]), diaperRepo([]), 30, NOW)
    expect(avg.avgSleepMs).toBeCloseTo((9 * HOUR) / 30, 0)
    expect(avg.avgNightSleepMs).toBeCloseTo((8 * HOUR) / 30, 0)
    expect(avg.avgNapSleepMs).toBeCloseTo(HOUR / 30, 0)
  })

  it('honours a custom window size', () => {
    const feedings: FeedingSession[] = [
      { id: 'f1', time: at(0), type: 'solids', foods: ['banana'], amount: 70, unit: 'gram' },
    ]
    const avg = getDailyAverages(sleepRepo([]), feedingRepo(feedings), diaperRepo([]), 7, NOW)
    expect(avg.days).toBe(7)
    expect(avg.avgSolidsGram).toBeCloseTo(70 / 7, 6)
  })
})
