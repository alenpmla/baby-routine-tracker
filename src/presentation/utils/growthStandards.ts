/**
 * WHO Child Growth Standards — weight-for-age (kg), 0–24 months.
 * Median (m) and standard deviation (sd) for boys and girls, per month.
 * Source: WHO Child Growth Standards (weight-for-age).
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
