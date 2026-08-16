import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { registerBackOverlay } from '../store/useBackNav'
import type { GrowthPoint, GrowthMetric } from './GrowthChart'

interface GrowthChartZoomModalProps {
  open: boolean
  title: string
  dob: string
  points: GrowthPoint[]
  metric: GrowthMetric
  sex?: 'male' | 'female' | 'combined'
  birthValue?: number
  onClose: () => void
}

const MONTH_MS = 2629746000 // average month (~30.44 days)
const EXIT_MS = 220

// Stable identity for the back overlay. DashboardScreen recreates the inline
// onClose on every render (its 1s now tick), so without a stable id the
// [open, onClose] effect would consume + re-push an overlay entry each tick.
const ZOOM_OVERLAY_ID = 'zoom'

const raf: (cb: () => void) => { cancel: () => void } = (cb) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    const id = window.requestAnimationFrame(cb)
    return { cancel: () => window.cancelAnimationFrame(id) }
  }
  const id = window.setTimeout(cb, 0)
  return { cancel: () => window.clearTimeout(id) }
}

export default function GrowthChartZoomModal({
  open,
  title,
  dob,
  points,
  metric,
  sex = 'combined',
  birthValue,
  onClose,
}: GrowthChartZoomModalProps) {
  // x-axis zoom via the Recharts Brush (startIndex/endIndex control the window).
  const [brush, setBrush] = useState<{ startIndex: number; endIndex: number } | null>(null)
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const snapshot = useRef({ title })
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  if (open) {
    snapshot.current = { title }
  }

  useEffect(() => {
    if (open) {
      setMounted(true)
      const t = raf(() => setEntered(true))
      return t.cancel
    }
    setEntered(false)
    const id = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(id)
  }, [open])

  // Back navigation (browser/hardware back) closes the modal: push a history
  // entry when it opens and close on popstate. The X / Escape / backdrop paths
  // restore the stack so the back button behaves predictably afterwards. The
  // keyed-on-open effect runs only when `open` changes, so re-renders (the
  // parent's now tick) swap nothing — the handler always calls the latest
  // onClose via the ref, keeping the overlay entry count net-zero.
  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
      }
    }
    const handleBack = () => onCloseRef.current()
    // Let the app's back handler close this modal instead of navigating, and
    // without pushing raw history entries (which would corrupt the nav stack).
    registerBackOverlay(handleBack, ZOOM_OVERLAY_ID)
    document.addEventListener('keydown', onKey)
    return () => {
      registerBackOverlay(null)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleClose = () => {
    registerBackOverlay(null)
    onClose()
  }

  const data = useMemo(() => {
    const dobMs = new Date(`${dob}T00:00:00`).getTime()
    if (Number.isNaN(dobMs)) {
      return []
    }
    const pts = points
      .map((p) => {
        const timeMs = new Date(p.time).getTime()
        return { month: Math.round(((timeMs - dobMs) / MONTH_MS) * 10) / 10 }
      })
      .filter((m) => Number.isFinite(m.month) && m.month >= 0)
    if (birthValue != null && birthValue > 0 && !pts.some((p) => p.month === 0)) {
      pts.unshift({ month: 0 })
    }
    const maxMonth = Math.max(24, ...pts.map((p) => Math.ceil(p.month)))

    // Percentile curves at month resolution, keyed by month.
    const curves: Record<number, { p3: number; p50: number; p97: number }> = {}
    for (const percentile of [3, 50, 97]) {
      const curve = metric.percentile(percentile, maxMonth, sex)
      for (const c of curve) {
        const m = Math.round(c.month)
        curves[m] = curves[m] ?? { p3: 0, p50: 0, p97: 0 }
        if (percentile === 3) {
          curves[m].p3 = c.value
        } else if (percentile === 50) {
          curves[m].p50 = c.value
        } else {
          curves[m].p97 = c.value
        }
      }
    }

    // Merge measurements with percentile rows.
    const byMonth = new Map<number, { baby?: number }>()
    for (const p of points) {
      const timeMs = new Date(p.time).getTime()
      const m = Math.round(((timeMs - dobMs) / MONTH_MS) * 10) / 10
      const mm = Math.round(m)
      const row = byMonth.get(mm) ?? {}
      row.baby = metric.valueOf(p)
      byMonth.set(mm, row)
    }
    if (birthValue != null && birthValue > 0) {
      const row = byMonth.get(0) ?? {}
      row.baby = birthValue
      byMonth.set(0, row)
    }

    const rows: { month: number; p3?: number; p50?: number; p97?: number; baby?: number }[] = []
    for (let m = 0; m <= maxMonth; m += 1) {
      const curve = curves[m]
      const meas = byMonth.get(m)
      if (curve || meas) {
        rows.push({ month: m, ...curve, ...meas })
      }
    }
    return rows
  }, [dob, points, metric, sex, birthValue])

  // Recharts needs a controlled brush window to keep zoom stable across renders.
  const brushState =
    brush && brush.endIndex > brush.startIndex ? brush : { startIndex: 0, endIndex: Math.max(0, data.length - 1) }

  const zoomed = brushState.startIndex > 0 || brushState.endIndex < data.length - 1

  // y-domain from the visible slice so zoom also refits the vertical scale.
  const yDomain = useMemo(() => {
    const slice = data.slice(brushState.startIndex, brushState.endIndex + 1)
    const lo = Math.min(...slice.map((r) => Math.min(r.p3 ?? 0, r.baby ?? Infinity)))
    const hi = Math.max(...slice.map((r) => Math.max(r.p97 ?? 0, r.baby ?? 0)), 1)
    const min = Math.max(0, Math.floor((lo - metric.step) / metric.step) * metric.step)
    const max = Math.max(metric.step, Math.ceil(hi / metric.step) * metric.step)
    return [min, max] as [number, number]
  }, [data, brushState, metric.step])

  const handleBrushChange = (e: { startIndex?: number; endIndex?: number } | null) => {
    if (e && typeof e.startIndex === 'number' && typeof e.endIndex === 'number') {
      setBrush({ startIndex: e.startIndex, endIndex: e.endIndex })
    }
  }

  if (!mounted) {
    return null
  }

  const shownTitle = open ? title : snapshot.current.title

  const currentWindow = data.slice(brushState.startIndex, brushState.endIndex + 1)
  const xDomain: [number, number] =
    currentWindow.length > 0
      ? [currentWindow[0].month, currentWindow[currentWindow.length - 1].month]
      : [0, 24]

  const xAxisTicks = () => {
    const len = data.length
    if (len <= 0) {
      return []
    }
    const step = Math.max(1, Math.ceil(len / 6))
    const ticks: number[] = []
    for (let i = 0; i < len; i += step) {
      ticks.push(data[i].month)
    }
    if (ticks[ticks.length - 1] !== data[len - 1].month) {
      ticks.push(data[len - 1].month)
    }
    return ticks
  }

  const chart = (
    <div className="zoom-chart">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="var(--md-outline-variant)" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            domain={xDomain}
            type="number"
            ticks={xAxisTicks().filter((t) => t >= xDomain[0] && t <= xDomain[1])}
            tickFormatter={(v: number) => `${v}m`}
            stroke="var(--md-on-surface-variant)"
            tick={{ fill: 'var(--md-on-surface-variant)', fontSize: 11 }}
          />
          <YAxis
            domain={yDomain}
            tickCount={6}
            unit={metric.unit}
            stroke="var(--md-on-surface-variant)"
            tick={{ fill: 'var(--md-on-surface-variant)', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--md-outline)', strokeDasharray: '3 3' }}
            wrapperStyle={{ pointerEvents: 'none', outline: 'none' }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) {
                return null
              }
              const rows = payload as unknown as Array<{
                name?: string
                value?: number | string
                dataKey?: string
              }>
              const series = [
                { key: 'baby', label: 'Baby', color: '#7c4dff' },
                { key: 'p50', label: 'Median', color: 'var(--md-primary)' },
                { key: 'p3', label: 'P3', color: 'var(--md-on-surface-variant)' },
                { key: 'p97', label: 'P97', color: 'var(--md-on-surface-variant)' },
              ]
              const fmt = (v: number | string | undefined) => {
                const n = Number(v)
                return Number.isFinite(n) ? `${Math.round(n * 10) / 10}${metric.unit}` : String(v ?? '—')
              }
              return (
                <div
                  className="zoom-tooltip"
                  style={{
                    background: 'var(--md-surface-container-high)',
                    border: '1px solid var(--md-outline-variant)',
                    borderRadius: 10,
                    padding: '6px 10px',
                    fontSize: 12,
                    boxShadow: 'var(--elevation-2)',
                    color: 'var(--md-on-surface)',
                  }}
                >
                  <div className="zoom-tooltip-month">{label}m</div>
                  {series.map((s) => {
                    const item = rows.find((r) => r.dataKey === s.key || r.name === s.label)
                    if (!item) {
                      return null
                    }
                    return (
                      <div key={s.key} className="zoom-tooltip-row">
                        <span className="zoom-tooltip-dot" style={{ background: s.color }} />
                        <span className="zoom-tooltip-name">{s.label}</span>
                        <span className="zoom-tooltip-value">{fmt(item.value)}</span>
                      </div>
                    )
                  })}
                </div>
              )
            }}
          />
          <Area
            dataKey="p3"
            stroke="var(--md-primary)"
            strokeWidth={1}
            strokeDasharray="3 3"
            fill="var(--md-primary-container)"
            fillOpacity={0.45}
            name="p3"
          />
          <Area
            dataKey="p50"
            stroke="var(--md-primary)"
            strokeWidth={2}
            fill="none"
            name="p50"
          />
          <Area
            dataKey="p97"
            stroke="var(--md-primary)"
            strokeWidth={1}
            strokeDasharray="3 3"
            fill="none"
            name="p97"
          />
          <Area
            dataKey="baby"
            stroke="#7c4dff"
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            connectNulls={false}
            name="baby"
          />
          <Brush
            dataKey="month"
            height={26}
            stroke="var(--md-primary)"
            fill="var(--md-surface-container-high)"
            travellerWidth={10}
            startIndex={brushState.startIndex}
            endIndex={brushState.endIndex}
            onChange={handleBrushChange}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="growth-toolbar">
        {zoomed && (
          <button
            type="button"
            className="chip chip-small"
            onClick={() => setBrush({ startIndex: 0, endIndex: Math.max(0, data.length - 1) })}
          >
            Reset zoom
          </button>
        )}
      </div>
    </div>
  )

  return createPortal(
    <div
      className={`modal-overlay modal-overlay-fullscreen zoom-modal${entered ? ' modal-overlay-open' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`modal modal-fullscreen zoom-modal-panel${entered ? ' modal-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={shownTitle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{shownTitle}</h2>
          <button type="button" className="icon-btn modal-close" aria-label="Close" onClick={handleClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="zoom-hint" role="status">
            Drag the slider to zoom · hover a point for details
          </p>
          {chart}
          <div className="growth-legend">
            <span className="growth-key">
              <span className="growth-swatch growth-swatch-band" /> Typical range (P3–P97)
            </span>
            <span className="growth-key">
              <span className="growth-swatch growth-swatch-median" /> Median (P50)
            </span>
            <span className="growth-key">
              <span
                className="growth-swatch growth-swatch-baby"
                style={{ background: '#7c4dff' }}
              />{' '}
              Baby
            </span>
          </div>
          <p className="growth-note">{metric.note}</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
