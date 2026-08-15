/**
 * WHO Child Growth Standards — 0–24 months.
 * Median (m) and standard deviation (sd) for boys and girls, per month.
 * Sources:
 *  - weight-for-age (kg): WHO Child Growth Standards (weight-for-age),
 *    https://www.who.int/tools/child-growth-standards/standards/weight-for-age
 *  - head circumference-for-age (cm): WHO Child Growth Standards
 *    (head circumference-for-age, z-scores, birth to 24 months; L=1, sd = M × S),
 *    https://www.who.int/tools/child-growth-standards/standards/head-circumference-for-age
 */
interface MonthPoint {
  month: number
  m: number
  sd: number
}

const BOYS: MonthPoint[] = [
  { month: 0, m: 3.346, sd: 0.443 },
  { month: 1, m: 4.471, sd: 0.534 },
  { month: 2, m: 5.567, sd: 0.603 },
  { month: 3, m: 6.376, sd: 0.653 },
  { month: 4, m: 7.002, sd: 0.689 },
  { month: 5, m: 7.51, sd: 0.718 },
  { month: 6, m: 7.93, sd: 0.742 },
  { month: 7, m: 8.284, sd: 0.766 },
  { month: 8, m: 8.59, sd: 0.789 },
  { month: 9, m: 8.861, sd: 0.811 },
  { month: 10, m: 9.105, sd: 0.833 },
  { month: 11, m: 9.326, sd: 0.854 },
  { month: 12, m: 9.528, sd: 0.874 },
  { month: 13, m: 9.714, sd: 0.894 },
  { month: 14, m: 9.888, sd: 0.914 },
  { month: 15, m: 10.054, sd: 0.933 },
  { month: 16, m: 10.214, sd: 0.952 },
  { month: 17, m: 10.368, sd: 0.971 },
  { month: 18, m: 10.52, sd: 0.99 },
  { month: 19, m: 10.671, sd: 1.009 },
  { month: 20, m: 10.821, sd: 1.028 },
  { month: 21, m: 10.969, sd: 1.047 },
  { month: 22, m: 11.116, sd: 1.066 },
  { month: 23, m: 11.261, sd: 1.085 },
  { month: 24, m: 11.404, sd: 1.104 },
]

const GIRLS: MonthPoint[] = [
  { month: 0, m: 3.232, sd: 0.43 },
  { month: 1, m: 4.187, sd: 0.499 },
  { month: 2, m: 5.128, sd: 0.559 },
  { month: 3, m: 5.845, sd: 0.606 },
  { month: 4, m: 6.423, sd: 0.643 },
  { month: 5, m: 6.898, sd: 0.674 },
  { month: 6, m: 7.297, sd: 0.7 },
  { month: 7, m: 7.641, sd: 0.723 },
  { month: 8, m: 7.947, sd: 0.744 },
  { month: 9, m: 8.224, sd: 0.765 },
  { month: 10, m: 8.479, sd: 0.784 },
  { month: 11, m: 8.715, sd: 0.804 },
  { month: 12, m: 8.938, sd: 0.822 },
  { month: 13, m: 9.15, sd: 0.841 },
  { month: 14, m: 9.352, sd: 0.859 },
  { month: 15, m: 9.543, sd: 0.877 },
  { month: 16, m: 9.725, sd: 0.895 },
  { month: 17, m: 9.899, sd: 0.913 },
  { month: 18, m: 10.065, sd: 0.93 },
  { month: 19, m: 10.225, sd: 0.948 },
  { month: 20, m: 10.38, sd: 0.965 },
  { month: 21, m: 10.531, sd: 0.982 },
  { month: 22, m: 10.68, sd: 0.999 },
  { month: 23, m: 10.827, sd: 1.015 },
  { month: 24, m: 10.971, sd: 1.032 },
]

/** z-score for a given percentile. */
const Z: Record<number, number> = { 3: -1.881, 50: 0, 97: 1.881 }

export type GrowthSex = 'male' | 'female' | 'combined'

function interpolate(points: MonthPoint[], month: number): MonthPoint {
  const idx = Math.max(0, Math.min(points.length - 1, Math.floor(month)))
  const a = points[idx]
  const b = points[Math.min(points.length - 1, idx + 1)]
  const t = Math.max(0, Math.min(1, month - a.month))
  return { month, m: a.m + (b.m - a.m) * t, sd: a.sd + (b.sd - a.sd) * t }
}

function refAt(month: number, sex: GrowthSex): MonthPoint {
  const b = interpolate(BOYS, month)
  const g = interpolate(GIRLS, month)
  if (sex === 'male') {
    return b
  }
  if (sex === 'female') {
    return g
  }
  return { month, m: (b.m + g.m) / 2, sd: (b.sd + g.sd) / 2 }
}

/** Expected weight (kg) at `month` for the given percentile and sex. */
export function percentileKg(month: number, percentile: number, sex: GrowthSex = 'combined'): number {
  const ref = refAt(month, sex)
  return ref.m + (Z[percentile] ?? 0) * ref.sd
}

/** Points for a percentile line across 0..maxMonth (integer months, linearly interpolated). */
export function percentileSeries(
  percentile: number,
  maxMonth: number,
  sex: GrowthSex = 'combined',
): { month: number; kg: number }[] {
  const end = Math.max(0, Math.floor(maxMonth))
  const out: { month: number; kg: number }[] = []
  for (let month = 0; month <= end; month++) {
    out.push({ month, kg: percentileKg(month, percentile, sex) })
  }
  return out
}

/**
 * WHO Child Growth Standards — head circumference-for-age (cm), 0–24 months.
 * Median (m) and standard deviation (sd) for boys and girls, per month.
 * Source: WHO Child Growth Standards, head circumference-for-age (z-scores,
 * birth to 24 months), https://www.who.int/tools/child-growth-standards/standards/head-circumference-for-age
 */
const HC_BOYS: MonthPoint[] = [
  { month: 0, m: 34.4618, sd: 1.2703 },
  { month: 1, m: 37.2759, sd: 1.1679 },
  { month: 2, m: 39.1285, sd: 1.1727 },
  { month: 3, m: 40.5135, sd: 1.1822 },
  { month: 4, m: 41.6317, sd: 1.194 },
  { month: 5, m: 42.5576, sd: 1.2074 },
  { month: 6, m: 43.3306, sd: 1.2206 },
  { month: 7, m: 43.9803, sd: 1.2332 },
  { month: 8, m: 44.53, sd: 1.2451 },
  { month: 9, m: 44.9998, sd: 1.2564 },
  { month: 10, m: 45.4051, sd: 1.2668 },
  { month: 11, m: 45.7573, sd: 1.2762 },
  { month: 12, m: 46.0661, sd: 1.2848 },
  { month: 13, m: 46.3395, sd: 1.2924 },
  { month: 14, m: 46.5844, sd: 1.3002 },
  { month: 15, m: 46.806, sd: 1.3068 },
  { month: 16, m: 47.0088, sd: 1.3139 },
  { month: 17, m: 47.1962, sd: 1.3201 },
  { month: 18, m: 47.3711, sd: 1.3264 },
  { month: 19, m: 47.5357, sd: 1.3324 },
  { month: 20, m: 47.6919, sd: 1.3382 },
  { month: 21, m: 47.8408, sd: 1.3443 },
  { month: 22, m: 47.9833, sd: 1.3498 },
  { month: 23, m: 48.1201, sd: 1.3555 },
  { month: 24, m: 48.2515, sd: 1.3612 },
]

const HC_GIRLS: MonthPoint[] = [
  { month: 0, m: 33.8787, sd: 1.1844 },
  { month: 1, m: 36.5463, sd: 1.1731 },
  { month: 2, m: 38.2521, sd: 1.2118 },
  { month: 3, m: 39.5328, sd: 1.2413 },
  { month: 4, m: 40.5817, sd: 1.2657 },
  { month: 5, m: 41.459, sd: 1.2861 },
  { month: 6, m: 42.1995, sd: 1.3027 },
  { month: 7, m: 42.829, sd: 1.317 },
  { month: 8, m: 43.3671, sd: 1.3283 },
  { month: 9, m: 43.83, sd: 1.3381 },
  { month: 10, m: 44.2319, sd: 1.3464 },
  { month: 11, m: 44.5844, sd: 1.3531 },
  { month: 12, m: 44.8965, sd: 1.359 },
  { month: 13, m: 45.1752, sd: 1.3638 },
  { month: 14, m: 45.4265, sd: 1.3683 },
  { month: 15, m: 45.6551, sd: 1.3724 },
  { month: 16, m: 45.865, sd: 1.3755 },
  { month: 17, m: 46.0598, sd: 1.3786 },
  { month: 18, m: 46.2424, sd: 1.3813 },
  { month: 19, m: 46.4152, sd: 1.3841 },
  { month: 20, m: 46.5801, sd: 1.3867 },
  { month: 21, m: 46.7384, sd: 1.3891 },
  { month: 22, m: 46.8913, sd: 1.3913 },
  { month: 23, m: 47.0391, sd: 1.3933 },
  { month: 24, m: 47.1822, sd: 1.3952 },
]

function hcRefAt(month: number, sex: GrowthSex): MonthPoint {
  const b = interpolate(HC_BOYS, month)
  const g = interpolate(HC_GIRLS, month)
  if (sex === 'male') {
    return b
  }
  if (sex === 'female') {
    return g
  }
  return { month, m: (b.m + g.m) / 2, sd: (b.sd + g.sd) / 2 }
}

/** Expected head circumference (cm) at `month` for the given percentile and sex. */
export function percentileCm(month: number, percentile: number, sex: GrowthSex = 'combined'): number {
  const ref = hcRefAt(month, sex)
  return ref.m + (Z[percentile] ?? 0) * ref.sd
}

/** Points for a head-circumference percentile line across 0..maxMonth (integer months, linearly interpolated). */
export function percentileCmSeries(
  percentile: number,
  maxMonth: number,
  sex: GrowthSex = 'combined',
): { month: number; cm: number }[] {
  const end = Math.max(0, Math.floor(maxMonth))
  const out: { month: number; cm: number }[] = []
  for (let month = 0; month <= end; month++) {
    out.push({ month, cm: percentileCm(month, percentile, sex) })
  }
  return out
}

/** Convert a head-circumference measurement to centimetres (identity for 'cm', ×2.54 for 'in'). */
export function headCircumferenceToCm(value: number, unit: 'cm' | 'in'): number {
  return unit === 'in' ? value * 2.54 : value
}
