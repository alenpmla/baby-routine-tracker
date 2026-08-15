import { useMemo } from 'react'
import {
  headCircumferenceToCm,
  percentileCmSeries,
  percentileSeries,
  type GrowthSex,
} from '../utils/growthStandards'

const MONTH_MS = 2629746000 // average month (~30.44 days)
const W = 620
const H = 300
const PAD = { l: 38, r: 14, t: 16, b: 30 }

export interface GrowthPoint {
  /** ISO-8601 UTC */
  time: string
  /** Measurement value (head circumference in cm/in). */
  value?: number
  /** Unit as recorded (cm/in for head circumference). */
  unit?: string
  /** Weight in kg (weight metric). */
  weight?: number
}

export interface GrowthMetric {
  id: 'weight' | 'head-circumference'
  /** Heading shown above the chart by the caller. */
  title: string
  /** Accessible label for the SVG. */
  ariaLabel: string
  /** Unit symbol appended to y-axis values. */
  unit: string
  /** Vertical gridline/axis step. */
  step: number
  /** Build a percentile curve in chart units. */
  percentile: (percentile: number, maxMonth: number, sex: GrowthSex) => { month: number; value: number }[]
  /** Extract a plot value (in chart units) from a point. */
  valueOf: (point: GrowthPoint) => number
  /** Source note rendered under the legend. */
  note: string
}

export const WEIGHT_METRIC: GrowthMetric = {
  id: 'weight',
  title: 'Weight progress',
  ariaLabel: 'Weight growth chart',
  unit: 'kg',
  step: 2,
  percentile: (percentile, maxMonth, sex) =>
    percentileSeries(percentile, maxMonth, sex).map(({ month, kg }) => ({ month, value: kg })),
  valueOf: (point) => point.weight ?? point.value ?? 0,
  note: 'Based on WHO Child Growth Standards (weight-for-age, 0–24 months).',
}

export const HEAD_CIRCUMFERENCE_METRIC: GrowthMetric = {
  id: 'head-circumference',
  title: 'Head circumference',
  ariaLabel: 'Head circumference growth chart',
  unit: 'cm',
  step: 2,
  percentile: (percentile, maxMonth, sex) =>
    percentileCmSeries(percentile, maxMonth, sex).map(({ month, cm }) => ({ month, value: cm })),
  valueOf: (point) => headCircumferenceToCm(point.value ?? 0, point.unit === 'in' ? 'in' : 'cm'),
  note: 'Based on WHO Child Growth Standards (head circumference-for-age, 0–24 months).',
}

interface GrowthChartProps {
  dob: string
  /** Measurement points in the metric's recording unit (cm/in or kg). */
  points: GrowthPoint[]
  metric?: GrowthMetric
  /** Baby sex; falls back to the combined curve when unset. */
  sex?: GrowthSex
  /** Birth value in chart units (e.g. birth weight kg). */
  birthValue?: number
}

export default function GrowthChart({
  dob,
  points,
  metric = WEIGHT_METRIC,
  sex = 'combined',
  birthValue,
}: GrowthChartProps) {
  const data = useMemo(() => {
    const dobMs = new Date(`${dob}T00:00:00`).getTime()
    if (Number.isNaN(dobMs)) {
      return []
    }
    const pts = points
      .map((p) => {
        const timeMs = new Date(p.time).getTime()
        return { month: (timeMs - dobMs) / MONTH_MS, value: metric.valueOf(p) }
      })
      .filter((p) => Number.isFinite(p.month) && p.month >= 0)
      .sort((a, b) => a.month - b.month)
    if (birthValue != null && birthValue > 0 && !pts.some((p) => p.month === 0)) {
      pts.unshift({ month: 0, value: birthValue })
    }
    return pts
  }, [dob, points, metric, birthValue])

  const maxMonth = Math.max(24, ...data.map((d) => Math.ceil(d.month)))

  const series = useMemo(
    () => ({
      p3: metric.percentile(3, maxMonth, sex),
      p50: metric.percentile(50, maxMonth, sex),
      p97: metric.percentile(97, maxMonth, sex),
    }),
    [metric, maxMonth, sex],
  )

  const { yMin, yMax } = useMemo(() => {
    const lo = Math.min(...series.p3.map((p) => p.value), ...series.p97.map((p) => p.value), ...data.map((d) => d.value), 0)
    const hi = Math.max(...series.p97.map((p) => p.value), ...data.map((d) => d.value), 1)
    const min = Math.max(0, Math.floor((lo - metric.step) / metric.step) * metric.step)
    const max = Math.max(metric.step, Math.ceil(hi / metric.step) * metric.step)
    return { yMin: min, yMax: max }
  }, [series, data, metric.step])

  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const x = (month: number) => PAD.l + (month / maxMonth) * plotW
  const y = (value: number) => PAD.t + (1 - (value - yMin) / (yMax - yMin)) * plotH

  const linePath = (pts: { month: number; value: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.month).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')

  const bandPath = useMemo(() => {
    if (series.p3.length === 0) {
      return ''
    }
    const forward = linePath(series.p3)
    const backward = [...series.p97].reverse().map((p) => `L${x(p.month).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
    return `${forward} ${backward} Z`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, maxMonth, yMin, yMax])

  const valuePath = data.length > 1 ? linePath(data) : ''
  const xTicks = [0, 6, 12, 18, 24].filter((m) => m <= maxMonth)
  const yTicks: number[] = []
  for (let v = yMin; v <= yMax; v += metric.step) {
    yTicks.push(v)
  }

  return (
    <div className="growth-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={metric.ariaLabel}>
        <text x={PAD.l - 6} y={PAD.t - 6} textAnchor="end" fontSize="10" fill="var(--md-on-surface-variant)">
          {metric.unit}
        </text>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} stroke="var(--md-outline-variant)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--md-on-surface-variant)">
              {v}
            </text>
          </g>
        ))}
        {xTicks.map((m) => (
          <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--md-on-surface-variant)">
            {m}m
          </text>
        ))}

        {bandPath && <path d={bandPath} fill="var(--md-primary-container)" opacity="0.45" stroke="none" />}
        <path d={linePath(series.p3)} fill="none" stroke="var(--md-primary)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
        <path d={linePath(series.p97)} fill="none" stroke="var(--md-primary)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
        <path d={linePath(series.p50)} fill="none" stroke="var(--md-primary)" strokeWidth="2" />

        {valuePath && (
          <path d={valuePath} fill="none" stroke="var(--accent-weight-fg)" strokeWidth="2.5" strokeLinejoin="round" />
        )}
        {data.map((p, i) => (
          <circle
            key={i}
            cx={x(p.month)}
            cy={y(p.value)}
            r="4"
            fill="var(--accent-weight-bg)"
            stroke="var(--accent-weight-fg)"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="growth-legend">
        <span className="growth-key">
          <span className="growth-swatch growth-swatch-band" /> Typical range (P3–P97)
        </span>
        <span className="growth-key">
          <span className="growth-swatch growth-swatch-median" /> Median (P50)
        </span>
        <span className="growth-key">
          <span className="growth-swatch growth-swatch-baby" /> Baby
        </span>
      </div>
      <p className="growth-note">{metric.note}</p>
    </div>
  )
}
