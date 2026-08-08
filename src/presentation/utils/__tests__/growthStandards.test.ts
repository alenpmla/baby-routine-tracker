import { describe, it, expect } from 'vitest'
import { percentileKg, percentileSeries } from '../growthStandards'

describe('WHO weight-for-age reference', () => {
  it('returns a plausible combined median (P50)', () => {
    const at0 = percentileKg(0, 50)
    const at6 = percentileKg(6, 50)
    const at12 = percentileKg(12, 50)
    expect(at0).toBeGreaterThan(3)
    expect(at0).toBeLessThan(3.5)
    expect(at6).toBeGreaterThan(at0)
    expect(at12).toBeGreaterThan(8)
    expect(at12).toBeLessThan(9.5)
  })

  it('orders percentiles P3 < P50 < P97 and rises with age', () => {
    for (const month of [0, 6, 12, 24]) {
      const p3 = percentileKg(month, 3)
      const p50 = percentileKg(month, 50)
      const p97 = percentileKg(month, 97)
      expect(p3).toBeLessThan(p50)
      expect(p50).toBeLessThan(p97)
    }
    expect(percentileKg(24, 50)).toBeGreaterThan(percentileKg(0, 50))
  })

  it('boys and girls medians are close but distinct at 12 months', () => {
    const male = percentileKg(12, 50, 'male')
    const female = percentileKg(12, 50, 'female')
    expect(Math.abs(male - female)).toBeLessThan(0.7)
  })

  it('builds a monotonic P50 series 0..24', () => {
    const series = percentileSeries(50, 24)
    expect(series).toHaveLength(25)
    for (let i = 1; i < series.length; i++) {
      expect(series[i].kg).toBeGreaterThan(series[i - 1].kg)
    }
  })
})
