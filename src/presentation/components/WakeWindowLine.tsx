import type { SleepSession } from '../../domain/model/SleepSession'
import { isNap } from '../../domain/model/SleepSession'
import { getWakeInfo } from '../../domain/usecase/wakeWindow'
import { formatClock, formatDuration } from '../utils/time'

export type WakeKind = 'nap' | 'night'

export interface WakeGap {
  key: string
  fromMs: number
  toMs: number
  gapMs: number
  fromKind: WakeKind
  toKind: WakeKind
}

export interface LiveWakeWindow {
  sourceEndMs: number
  wakeMs: number
}

/**
 * Completed wake windows for a day: the gap between consecutive sleep events
 * where at least one side is a nap — morning wake to first nap, nap to nap,
 * last nap to bedtime. `daySleeps` are the sleeps rendered for the day
 * (end-anchored); `boundarySleeps` are overnight sleeps that *start* in the
 * day but end after it (e.g. the bedtime night), closing the last gap.
 */
export function computeWakeGaps(daySleeps: SleepSession[], boundarySleeps: SleepSession[] = []): WakeGap[] {
  const rendered = new Set(daySleeps.map((s) => s.id))
  const ordered = [...daySleeps, ...boundarySleeps].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )
  const gaps: WakeGap[] = []
  for (let i = 0; i + 1 < ordered.length; i++) {
    const from = ordered[i]
    const to = ordered[i + 1]
    if (!from.endTime || !rendered.has(from.id)) {
      continue
    }
    if (!isNap(from) && !isNap(to)) {
      continue
    }
    const fromMs = new Date(from.endTime).getTime()
    const toMs = new Date(to.startTime).getTime()
    gaps.push({
      key: `${from.id}-${to.id}`,
      fromMs,
      toMs,
      gapMs: Math.max(0, toMs - fromMs),
      fromKind: isNap(from) ? 'nap' : 'night',
      toKind: isNap(to) ? 'nap' : 'night',
    })
  }
  return gaps
}

/**
 * The live "awake since the last completed nap" window for the day, or null
 * while a sleep is running or the last completed sleep was a night sleep.
 */
export function computeLiveWakeWindow(sleeps: SleepSession[], nowMs: number): LiveWakeWindow | null {
  const info = getWakeInfo(sleeps, nowMs)
  if (!info) {
    return null
  }
  const source = sleeps.find((s) => s.endTime && new Date(s.endTime).getTime() === info.sourceEndMs)
  if (!source || !isNap(source)) {
    return null
  }
  return { sourceEndMs: info.sourceEndMs, wakeMs: info.wakeMs }
}

export function wakeGapLabel(gap: WakeGap): string {
  const duration = formatDuration(gap.gapMs)
  if (gap.fromKind === 'nap' && gap.toKind === 'nap') {
    return `Awake ${duration} between naps`
  }
  if (gap.fromKind === 'night') {
    return `Awake ${duration} after waking`
  }
  return `Awake ${duration} before bed`
}

export function liveWakeLabel(live: LiveWakeWindow): string {
  return `Awake since ${formatClock(new Date(live.sourceEndMs).toISOString())} · ${formatDuration(live.wakeMs)}`
}

interface WakeWindowLineProps {
  /** The day's rendered sleeps (end-anchored). */
  sleeps: SleepSession[]
  /** Overnight sleeps that start in the day but end after it. */
  boundarySleeps?: SleepSession[]
  /** Current time in ms, used for the live window. */
  nowMs: number
  /** Whether to render the live "awake since" window (today only). */
  live: boolean
}

/**
 * "Wake windows" card for the sleep day view: the gaps between naps for the
 * day, plus the live awake-since line while awake now. Renders nothing when
 * there are no nap wake windows for the day.
 */
export default function WakeWindowLine({ sleeps, boundarySleeps = [], nowMs, live }: WakeWindowLineProps) {
  const gaps = computeWakeGaps(sleeps, boundarySleeps)
  const liveWindow = live ? computeLiveWakeWindow(sleeps, nowMs) : null
  if (gaps.length === 0 && !liveWindow) {
    return null
  }
  return (
    <section className="card wake-windows" aria-label="Wake windows">
      <h2 className="wake-windows-title">Wake windows</h2>
      <ul className="wake-windows-list">
        {gaps.map((gap) => (
          <li key={gap.key} className="wake-window-row">
            <span className="wake-window-dot" aria-hidden="true" />
            <span className="wake-window-text">{wakeGapLabel(gap)}</span>
          </li>
        ))}
        {liveWindow && (
          <li className="wake-window-row wake-window-live" role="status">
            <span className="wake-window-dot" aria-hidden="true" />
            <span className="wake-window-text">{liveWakeLabel(liveWindow)}</span>
          </li>
        )}
      </ul>
    </section>
  )
}
