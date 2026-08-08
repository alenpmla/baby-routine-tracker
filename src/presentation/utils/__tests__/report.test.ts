import { describe, it, expect } from 'vitest'
import { buildReportPdf, buildReportSummary } from '../report'

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
})
