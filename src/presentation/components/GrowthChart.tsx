import { useMemo } from 'react'
import { percentileSeries } from '../utils/growthStandards'

const MONTH_MS = 2629746000 // average month (~30.44 days)
const W = 620
const H = 300
const PAD = { l: 38, r: 14, t: 16, b: 30 }

export interface GrowthPoint {
  time: string
  weight: number
}

interface GrowthChartProps {
  dob: string
  weights: GrowthPoint[]
}

export default function GrowthChart({ dob, weights }: GrowthChartProps) {
  const data = useMemo(() => {
    const dobMs = new Date(`${dob}T00:00:00`).getTime()
    if (Number.isNaN(dobMs)) {
      return []
    }
    return weights
      .map((w) => {
        const timeMs = new Date(w.time).getTime()
        return { month: (timeMs - dobMs) / MONTH_MS, kg: w.weight }
      })
      .filter((p) => Number.isFinite(p.month) && p.month >= 0)
      .sort((a, b) => a.month - b.month)
  }, [dob, weights])

  const maxMonth = Math.max(24, ...data.map((d) => Math.ceil(d.month)))

  const series = useMemo(
    () => ({
      p3: percentileSeries(3, maxMonth),
      p50: percentileSeries(50, maxMonth),
      p97: percentileSeries(97, maxMonth),
    }),
    [maxMonth],
  )

  const yMax = useMemo(() => {
    const top = Math.max(...series.p97.map((p) => p.kg), ...data.map((d) => d.kg), 1)
    return Math.max(2, Math.ceil(top / 2) * 2)
  }, [series, data])

  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const x = (month: number) => PAD.l + (month / maxMonth) * plotW
  const y = (kg: number) => PAD.t + (1 - kg / yMax) * plotH

  const linePath = (pts: { month: number; kg: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.month).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')

  const bandPath = useMemo(() => {
    if (series.p3.length === 0) {
      return ''
    }
    const forward = linePath(series.p3)
    const backward = [...series.p97].reverse().map((p, i) => `${i === 0 ? 'L' : 'L'}${x(p.month).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')
    return `${forward} ${backward} Z`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, maxMonth, yMax])

  const weightPath = data.length > 1 ? linePath(data) : ''
  const xTicks = [0, 6, 12, 18, 24].filter((m) => m <= maxMonth)
  const yTicks: number[] = []
  for (let v = 0; v <= yMax; v += 2) {
    yTicks.push(v)
  }

  return (
    <div className="growth-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weight growth chart">
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

        {weightPath && (
          <path d={weightPath} fill="none" stroke="var(--accent-weight-fg)" strokeWidth="2.5" strokeLinejoin="round" />
        )}
        {data.map((p, i) => (
          <circle
            key={i}
            cx={x(p.month)}
            cy={y(p.kg)}
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
      <p className="growth-note">Based on WHO Child Growth Standards (weight-for-age, 0–24 months).</p>
    </div>
  )
}
