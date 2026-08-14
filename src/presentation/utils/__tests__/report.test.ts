import { describe, it, expect } from 'vitest'
import { buildDailyTotals, buildReportPdf, buildReportSummary } from '../report'
import { startOfDay, toInputDate } from '../time'

const units = { bottle: 'ml', solids: 'g' } as const

describe('report generator', () => {
  it('builds summary totals from records', () => {
    const records = {
      sleeps: [
        {
          id: 's1',
          startTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          endTime: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        },
      ],
      feedings: [
        { id: 'f1', time: 't1', type: 'bottle' as const, amount: 120, unit: 'ml' as const },
        { id: 'f2', time: 't2', type: 'solids' as const, foods: ['avocado'], amount: 30, unit: 'gram' as const },
      ],
      diapers: [
        { id: 'd1', time: 't1', type: 'wet' as const },
        { id: 'd2', time: 't2', type: 'both' as const },
      ],
    }
    const s = buildReportSummary(records, units)
    expect(s.sleepCount).toBe(1)
    expect(s.totalSleep).toBe('1h 0m')
    expect(s.feedCount).toBe(2)
    expect(s.bottleCount).toBe(1)
    expect(s.bottleTotal).toBe('120ml')
    expect(s.solidsTotal).toBe('30g')
    expect(s.diaperCount).toBe(2)
    expect(s.both).toBe(1)
  })

  it('groups records by local day and sorts chronologically', () => {
    const sleepStart = '2026-08-14T20:00:00.000Z'
    const feedTime = '2026-08-16T08:30:00.000Z'
    const diaperTime = '2026-08-12T10:00:00.000Z'
    const records = {
      sleeps: [{ id: 's1', startTime: sleepStart, endTime: '2026-08-14T21:30:00.000Z' }],
      feedings: [{ id: 'f1', time: feedTime, type: 'bottle' as const, amount: 120, unit: 'ml' as const }],
      diapers: [{ id: 'd1', time: diaperTime, type: 'wet' as const }],
    }
    const days = buildDailyTotals(records, units)
    expect(days).toHaveLength(3)
    expect(days.map((d) => d.dayKey)).toEqual([
      toInputDate(new Date(diaperTime)),
      toInputDate(new Date(sleepStart)),
      toInputDate(new Date(feedTime)),
    ])
    expect(days[0].diaperCount).toBe(1)
    expect(days[0].feedCount).toBe(0)
    expect(days[0].sleepCount).toBe(0)
    expect(days[1].sleepCount).toBe(1)
    expect(days[1].sleepTotal).toBe('1h 30m')
    expect(days[2].feedCount).toBe(1)
    expect(days[2].bottleTotal).toBe('120ml')
  })

  it('attributes a midnight-spanning sleep to its start day', () => {
    const midnight = startOfDay(new Date('2026-08-14T12:00:00.000Z'))
    const startIso = new Date(midnight.getTime() - 3600 * 1000).toISOString()
    const endIso = new Date(midnight.getTime() + 3600 * 1000).toISOString()
    const records = {
      sleeps: [{ id: 's1', startTime: startIso, endTime: endIso }],
      feedings: [{ id: 'f1', time: endIso, type: 'bottle' as const, amount: 60, unit: 'ml' as const }],
      diapers: [],
    }
    const days = buildDailyTotals(records, units)
    expect(days).toHaveLength(2)
    expect(days[0].dayKey).toBe(toInputDate(new Date(startIso)))
    expect(days[0].sleepCount).toBe(1)
    expect(days[0].sleepTotal).toBe('2h 0m')
    expect(days[0].feedCount).toBe(0)
    expect(days[1].dayKey).toBe(toInputDate(new Date(endIso)))
    expect(days[1].sleepCount).toBe(0)
    expect(days[1].feedCount).toBe(1)
  })

  it('excludes an ongoing sleep from duration and count', () => {
    const midnight = startOfDay(new Date('2026-08-14T12:00:00.000Z'))
    const sameDay = (hours: number) => new Date(midnight.getTime() + hours * 3600 * 1000).toISOString()
    const records = {
      sleeps: [
        { id: 's1', startTime: sameDay(10), endTime: sameDay(11) },
        { id: 's2', startTime: sameDay(14), endTime: null },
      ],
      feedings: [],
      diapers: [],
    }
    const days = buildDailyTotals(records, units)
    expect(days).toHaveLength(1)
    expect(days[0].sleepCount).toBe(1)
    expect(days[0].sleepTotal).toBe('1h 0m')
  })

  it('reports a day containing only an ongoing sleep with count 0 and no duration', () => {
    const midnight = startOfDay(new Date('2026-08-14T12:00:00.000Z'))
    const startIso = new Date(midnight.getTime() + 10 * 3600 * 1000).toISOString()
    const records = {
      sleeps: [{ id: 's1', startTime: startIso, endTime: null }],
      feedings: [],
      diapers: [],
    }
    const days = buildDailyTotals(records, units)
    expect(days).toHaveLength(1)
    expect(days[0].dayKey).toBe(toInputDate(new Date(startIso)))
    expect(days[0].sleepCount).toBe(0)
    expect(days[0].sleepTotal).toBe('0m')
  })

  it('computes per-day bottle, breast, and solids totals with unit conversion', () => {
    const day1Midnight = startOfDay(new Date('2026-08-14T12:00:00.000Z'))
    const day2Midnight = startOfDay(new Date(day1Midnight.getTime() + 48 * 3600 * 1000))
    const at = (midnight: Date, hours: number) => new Date(midnight.getTime() + hours * 3600 * 1000).toISOString()
    const records = {
      sleeps: [],
      feedings: [
        { id: 'b1', time: at(day1Midnight, 8), type: 'bottle' as const, amount: 200, unit: 'ml' as const },
        { id: 'b2', time: at(day1Midnight, 12), type: 'bottle' as const, amount: 2, unit: 'oz' as const },
        { id: 'n1', time: at(day1Midnight, 15), type: 'breast' as const, startTime: at(day1Midnight, 15), endTime: at(day1Midnight, 15.33) },
        { id: 's1', time: at(day2Midnight, 10), type: 'solids' as const, foods: ['avocado'], amount: 100, unit: 'gram' as const },
        { id: 's2', time: at(day2Midnight, 13), type: 'solids' as const, foods: ['banana'], amount: 2, unit: 'oz' as const },
      ],
      diapers: [],
    }
    const days = buildDailyTotals(records, units)
    expect(days).toHaveLength(2)
    const day1 = days[0]
    expect(day1.feedCount).toBe(3)
    expect(day1.bottleCount).toBe(2)
    expect(day1.breastCount).toBe(1)
    expect(day1.solidsCount).toBe(0)
    expect(day1.bottleTotal).toBe('259ml')
    expect(day1.solidsTotal).toBe('')
    const day2 = days[1]
    expect(day2.feedCount).toBe(2)
    expect(day2.bottleCount).toBe(0)
    expect(day2.solidsCount).toBe(2)
    expect(day2.solidsTotal).toBe('157g')
    expect(day2.bottleTotal).toBe('')
  })

  it('breaks down diaper wet/dirty/both per day', () => {
    const day1Midnight = startOfDay(new Date('2026-08-14T12:00:00.000Z'))
    const day2Midnight = startOfDay(new Date(day1Midnight.getTime() + 48 * 3600 * 1000))
    const at = (midnight: Date, hours: number) => new Date(midnight.getTime() + hours * 3600 * 1000).toISOString()
    const records = {
      sleeps: [],
      feedings: [],
      diapers: [
        { id: 'd1', time: at(day1Midnight, 8), type: 'wet' as const },
        { id: 'd2', time: at(day1Midnight, 10), type: 'wet' as const },
        { id: 'd3', time: at(day1Midnight, 12), type: 'dirty' as const },
        { id: 'd4', time: at(day2Midnight, 9), type: 'both' as const },
      ],
    }
    const days = buildDailyTotals(records, units)
    expect(days).toHaveLength(2)
    expect(days[0].diaperCount).toBe(3)
    expect(days[0].wet).toBe(2)
    expect(days[0].dirty).toBe(1)
    expect(days[0].both).toBe(0)
    expect(days[1].diaperCount).toBe(1)
    expect(days[1].wet).toBe(0)
    expect(days[1].dirty).toBe(0)
    expect(days[1].both).toBe(1)
  })

  it('yields zero/placeholder-safe values for a day with no records in a category', () => {
    const records = {
      sleeps: [],
      feedings: [
        { id: 'f1', time: '2026-08-14T08:00:00.000Z', type: 'solids' as const, foods: ['avocado'] },
      ],
      diapers: [],
    }
    const days = buildDailyTotals(records, units)
    expect(days).toHaveLength(1)
    expect(days[0].sleepCount).toBe(0)
    expect(days[0].sleepTotal).toBe('0m')
    expect(days[0].feedCount).toBe(1)
    expect(days[0].bottleCount).toBe(0)
    expect(days[0].breastCount).toBe(0)
    expect(days[0].solidsCount).toBe(1)
    expect(days[0].bottleTotal).toBe('')
    expect(days[0].solidsTotal).toBe('')
    expect(days[0].diaperCount).toBe(0)
    expect(days[0].wet).toBe(0)
    expect(days[0].dirty).toBe(0)
    expect(days[0].both).toBe(0)
  })

  it('merges records across all categories on the same local day into a single row', () => {
    const day1Midnight = startOfDay(new Date('2026-08-14T12:00:00.000Z'))
    const at = (hours: number) => new Date(day1Midnight.getTime() + hours * 3600 * 1000).toISOString()
    const records = {
      sleeps: [{ id: 's1', startTime: at(2), endTime: at(4) }],
      feedings: [
        { id: 'f1', time: at(8), type: 'bottle' as const, amount: 120, unit: 'ml' as const },
        { id: 'f2', time: at(10), type: 'solids' as const, foods: ['avocado'], amount: 30, unit: 'gram' as const },
      ],
      diapers: [
        { id: 'd1', time: at(9), type: 'wet' as const },
        { id: 'd2', time: at(11), type: 'dirty' as const },
      ],
    }
    const days = buildDailyTotals(records, units)
    expect(days).toHaveLength(1)
    const day = days[0]
    expect(day.dayKey).toBe(toInputDate(new Date(at(2))))
    expect(day.date.getTime()).toBe(day1Midnight.getTime())
    expect(day.sleepCount).toBe(1)
    expect(day.sleepTotal).toBe('2h 0m')
    expect(day.feedCount).toBe(2)
    expect(day.bottleCount).toBe(1)
    expect(day.bottleTotal).toBe('120ml')
    expect(day.solidsCount).toBe(1)
    expect(day.solidsTotal).toBe('30g')
    expect(day.diaperCount).toBe(2)
    expect(day.wet).toBe(1)
    expect(day.dirty).toBe(1)
    expect(day.both).toBe(0)
  })

  it('returns an empty array when there are no records', () => {
    expect(buildDailyTotals({ sleeps: [], feedings: [], diapers: [] }, units)).toEqual([])
  })

  it('generates a valid PDF (starts with %PDF header)', () => {
    const bytes = buildReportPdf(
      { id: 'b1', name: 'Ciara', dob: '2025-10-30', notes: '' },
      new Date('2026-08-01'),
      new Date('2026-08-08'),
      { sleeps: [], feedings: [], diapers: [] },
      units,
    )
    const header = new TextDecoder().decode(new Uint8Array(bytes.slice(0, 4)))
    expect(header).toBe('%PDF')
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })

  it('renders a valid PDF with populated records (daily totals rows included)', () => {
    const day1Midnight = startOfDay(new Date('2026-08-14T12:00:00.000Z'))
    const day2Midnight = startOfDay(new Date(day1Midnight.getTime() + 24 * 3600 * 1000))
    const at = (midnight: Date, hours: number) => new Date(midnight.getTime() + hours * 3600 * 1000).toISOString()
    const records = {
      sleeps: [{ id: 's1', startTime: at(day1Midnight, 1), endTime: at(day1Midnight, 3) }],
      feedings: [
        { id: 'f1', time: at(day1Midnight, 8), type: 'bottle' as const, amount: 120, unit: 'ml' as const },
        { id: 'f2', time: at(day2Midnight, 10), type: 'solids' as const, foods: ['avocado'], amount: 30, unit: 'gram' as const },
      ],
      diapers: [
        { id: 'd1', time: at(day1Midnight, 9), type: 'wet' as const },
        { id: 'd2', time: at(day2Midnight, 11), type: 'both' as const },
      ],
    }
    const bytes = buildReportPdf(
      { id: 'b1', name: 'Ciara', dob: '2025-10-30', notes: '' },
      new Date(day1Midnight),
      new Date(day2Midnight.getTime() + 23 * 3600 * 1000),
      records,
      units,
    )
    const header = new TextDecoder().decode(new Uint8Array(bytes.slice(0, 4)))
    expect(header).toBe('%PDF')
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })
})
