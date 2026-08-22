import { useMemo } from 'react'
import type { TemperatureEntry } from '../../domain/model/TemperatureEntry'
import {
  FEVER_THRESHOLD_C,
  TYPICAL_LOW_C,
  TYPICAL_HIGH_C,
  describeTempStatus,
  tempStatusLabel,
  tempInC,
} from '../../domain/usecase/temperature'

const W = 620
const H = 320
const PAD = { l: 40, r: 14, t: 16, b: 30 }

interface TemperatureChartProps {
  /** Temperature entries within the 7-day window, any unit. */
  entries: TemperatureEntry[]
  /** Start of the 7-day window (Date). */
  windowStart: Date
  /** End of the window / now (Date). */
  windowEnd: Date
}

function toC(entry: TemperatureEntry): number {
  return tempInC(entry.temp, entry.unit)
}

/**
 * 7-day temperature line chart with a typical-range band (36–37.5 °C), a fever
 * reference line, and a status label ("In range" / "Fever" / "Low temp") based
 * on the most recent reading in the window. Readings at/above the threshold are
 * highlighted with the error accent.
 */
export default function TemperatureChart({ entries, windowStart, windowEnd }: TemperatureChartProps) {
  const data = useMemo(() => {
    const startMs = windowStart.getTime()
    const endMs = windowEnd.getTime()
    return entries
      .map((e) => ({ time: new Date(e.time).getTime(), value: toC(e) }))
      .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.value) && p.time >= startMs && p.time <= endMs)
      .sort((a, b) => a.time - b.time)
  }, [entries, windowStart, windowEnd])

  const status = useMemo(() => {
    if (data.length === 0) {
      return 'in-range' as const
    }
    return describeTempStatus(data[data.length - 1].value)
  }, [data])

  const { yMin, yMax } = useMemo(() => {
    const lo = Math.min(TYPICAL_LOW_C - 0.5, ...data.map((d) => d.value))
    const hi = Math.max(40, ...data.map((d) => d.value), FEVER_THRESHOLD_C + 0.5)
    return { yMin: Math.floor(lo - 0.5), yMax: Math.ceil(hi + 0.5) }
  }, [data])

  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const span = Math.max(1, windowEnd.getTime() - windowStart.getTime())
  const x = (ms: number) => PAD.l + ((ms - windowStart.getTime()) / span) * plotW
  const y = (value: number) => PAD.t + (1 - (value - yMin) / (yMax - yMin)) * plotH

  const linePath = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const lowY = y(TYPICAL_LOW_C)
  const highY = y(TYPICAL_HIGH_C)
  const feverY = y(FEVER_THRESHOLD_C)

  const yTicks: number[] = []
  for (let v = yMin; v <= yMax; v += 1) {
    yTicks.push(v)
  }
  const xTicks = [0, 1, 2, 3, 4, 5, 6].map((d) => {
    const t = new Date(windowStart)
    t.setDate(t.getDate() + d)
    return t
  })

  return (
    <div className="growth-chart temperature-chart">
      <div className="temperature-status" role="status">
        <span className={`temperature-status-dot temperature-status-${status}`} aria-hidden="true" />
        <span>{tempStatusLabel(status)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Temperature over the last 7 days">
        <text x={PAD.l - 6} y={PAD.t - 6} textAnchor="end" fontSize="10" fill="var(--md-on-surface-variant)">
          °C
        </text>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} stroke="var(--md-outline-variant)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--md-on-surface-variant)">
              {v}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t.getTime()} x={x(t.getTime())} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--md-on-surface-variant)">
            {t.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
          </text>
        ))}

        {/* Typical range band 36–37.5 °C */}
        <rect x={PAD.l} y={highY} width={plotW} height={Math.max(0, lowY - highY)} fill="var(--accent-health-bg)" opacity="0.4" />
        <line x1={PAD.l} y1={lowY} x2={W - PAD.r} y2={lowY} stroke="var(--accent-health-fg)" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={PAD.l + 4} y={lowY - 4} fontSize="10" fill="var(--accent-health-fg)">
          {TYPICAL_LOW_C} °C
        </text>
        <line x1={PAD.l} y1={highY} x2={W - PAD.r} y2={highY} stroke="var(--accent-health-fg)" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={PAD.l + 4} y={highY + 11} fontSize="10" fill="var(--accent-health-fg)">
          {TYPICAL_HIGH_C} °C
        </text>

        {/* Fever line */}
        <line x1={PAD.l} y1={feverY} x2={W - PAD.r} y2={feverY} stroke="var(--md-error)" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={W - PAD.r} y={feverY - 4} textAnchor="end" fontSize="10" fill="var(--md-error)">
          Fever ≥ {FEVER_THRESHOLD_C} °C
        </text>

        {linePath && <path d={linePath} fill="none" stroke="var(--accent-health-fg)" strokeWidth="2.5" strokeLinejoin="round" />}
        {data.map((p, i) => (
          <circle
            key={i}
            cx={x(p.time)}
            cy={y(p.value)}
            r="4"
            fill={p.value >= FEVER_THRESHOLD_C ? 'var(--md-error)' : 'var(--accent-health-bg)'}
            stroke={p.value >= FEVER_THRESHOLD_C ? 'var(--md-error)' : 'var(--accent-health-fg)'}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="growth-legend">
        <span className="growth-key">
          <span className="growth-swatch" style={{ background: 'var(--accent-health-fg)', height: 3 }} /> Typical range
        </span>
        <span className="growth-key">
          <span className="growth-swatch" style={{ background: 'var(--md-error)', height: 3 }} /> Fever
        </span>
      </div>
    </div>
  )
}