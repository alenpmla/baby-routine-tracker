import { describe, it, expect } from 'vitest'
import {
  headCircumferenceToCm,
  percentileCm,
  percentileCmSeries,
  percentileKg,
  percentileSeries,
} from '../growthStandards'

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

describe('WHO head circumference-for-age reference', () => {
  it('matches the WHO medians at birth for boys and girls', () => {
    expect(percentileCm(0, 50, 'male')).toBeCloseTo(34.4618, 4)
    expect(percentileCm(0, 50, 'female')).toBeCloseTo(33.8787, 4)
    expect(percentileCm(12, 50, 'male')).toBeCloseTo(46.0661, 4)
    expect(percentileCm(12, 50, 'female')).toBeCloseTo(44.8965, 4)
  })

  it('returns sex-specific P3/P97 anchored on the WHO median ± 1.881 sd', () => {
    const month12Male = { m: 46.0661, sd: 1.2848 }
    expect(percentileCm(12, 3, 'male')).toBeCloseTo(month12Male.m - 1.881 * month12Male.sd, 4)
    expect(percentileCm(12, 97, 'male')).toBeCloseTo(month12Male.m + 1.881 * month12Male.sd, 4)
  })

  it('orders percentiles P3 < P50 < P97 and rises with age for both sexes', () => {
    for (const sex of ['male', 'female'] as const) {
      for (const month of [0, 6, 12, 24]) {
        const p3 = percentileCm(month, 3, sex)
        const p50 = percentileCm(month, 50, sex)
        const p97 = percentileCm(month, 97, sex)
        expect(p3).toBeLessThan(p50)
        expect(p50).toBeLessThan(p97)
      }
      expect(percentileCm(24, 50, sex)).toBeGreaterThan(percentileCm(0, 50, sex))
    }
  })

  it('boys and girls medians differ (boys larger) but stay within WHO ranges', () => {
    for (const month of [0, 6, 12, 24]) {
      const male = percentileCm(month, 50, 'male')
      const female = percentileCm(month, 50, 'female')
      expect(male).toBeGreaterThan(female)
      expect(male - female).toBeGreaterThan(0.5)
      expect(male - female).toBeLessThan(1.3)
    }
  })

  it('combined is the average of boys and girls at a given month', () => {
    const at12 = (percentileCm(12, 50, 'male') + percentileCm(12, 50, 'female')) / 2
    expect(percentileCm(12, 50, 'combined')).toBeCloseTo(at12, 6)
  })

  it('interpolates linearly between integer months', () => {
    const male6 = percentileCm(6, 50, 'male')
    const male7 = percentileCm(7, 50, 'male')
    expect(percentileCm(6.5, 50, 'male')).toBeCloseTo((male6 + male7) / 2, 6)
    expect(percentileCm(6.5, 3, 'female')).toBeCloseTo(
      (percentileCm(6, 3, 'female') + percentileCm(7, 3, 'female')) / 2,
      6,
    )
  })

  it('builds a monotonic P50 series 0..24 with one point per month', () => {
    const series = percentileCmSeries(50, 24)
    expect(series).toHaveLength(25)
    expect(series[0].month).toBe(0)
    expect(series[24].month).toBe(24)
    for (let i = 1; i < series.length; i++) {
      expect(series[i].cm).toBeGreaterThan(series[i - 1].cm)
    }
    for (const sex of ['male', 'female'] as const) {
      expect(percentileCmSeries(50, 12, sex)).toHaveLength(13)
    }
  })

  it('keeps the combined series within the sex-specific bands', () => {
    const male = percentileCm(12, 3, 'male')
    const female = percentileCm(12, 97, 'female')
    const combined = percentileCm(12, 50, 'combined')
    expect(combined).toBeGreaterThan(male)
    expect(combined).toBeLessThan(female)
  })

  it('headCircumferenceToCm converts inches to cm and keeps cm as-is', () => {
    expect(headCircumferenceToCm(17, 'in')).toBeCloseTo(43.18, 2)
    expect(headCircumferenceToCm(43.18, 'cm')).toBeCloseTo(43.18, 2)
    expect(headCircumferenceToCm(0, 'in')).toBe(0)
  })
})
