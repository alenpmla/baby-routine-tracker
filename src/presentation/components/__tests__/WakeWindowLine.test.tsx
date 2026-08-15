import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { SleepSession } from '../../../domain/model/SleepSession'
import WakeWindowLine, {
  computeLiveWakeWindow,
  computeWakeGaps,
  liveWakeLabel,
  wakeGapLabel,
} from '../WakeWindowLine'

const H = 3600 * 1000
const DAY_START = new Date('2026-08-14T00:00:00Z').getTime()

function sleep(id: string, startHours: number, endHours: number | null, kind: 'nap' | 'night'): SleepSession {
  return {
    id,
    startTime: new Date(DAY_START + startHours * H).toISOString(),
    endTime: endHours === null ? null : new Date(DAY_START + endHours * H).toISOString(),
    kind,
  }
}

// A classic two-nap day: morning night ends 06:00, nap1 09:30-11:00,
// nap2 14:00-15:30, bedtime night starts 19:00 (ends next day => boundary).
const nightMorning = sleep('n1', 0, 6, 'night')
const nap1 = sleep('a1', 9.5, 11, 'nap')
const nap2 = sleep('a2', 14, 15.5, 'nap')
const nightBedtime = sleep('n2', 19, 30, 'night')

describe('computeWakeGaps', () => {
  it('computes the three gaps of a two-nap day (after waking, between naps, before bed)', () => {
    const gaps = computeWakeGaps([nightMorning, nap1, nap2], [nightBedtime])
    expect(gaps).toHaveLength(3)

    expect(gaps[0]).toMatchObject({ fromKind: 'night', toKind: 'nap', gapMs: 3.5 * H })
    expect(wakeGapLabel(gaps[0])).toBe('Awake 3h 30m after waking')

    expect(gaps[1]).toMatchObject({ fromKind: 'nap', toKind: 'nap', gapMs: 3 * H })
    expect(wakeGapLabel(gaps[1])).toBe('Awake 3h 0m between naps')

    expect(gaps[2]).toMatchObject({ fromKind: 'nap', toKind: 'night', gapMs: 3.5 * H })
    expect(wakeGapLabel(gaps[2])).toBe('Awake 3h 30m before bed')
  })

  it('returns no gaps for a day with no naps (nights are not wake windows)', () => {
    expect(computeWakeGaps([nightMorning], [nightBedtime])).toEqual([])
    expect(computeWakeGaps([])).toEqual([])
  })

  it('never uses a boundary sleep as the source of a gap', () => {
    const lateNap = sleep('a3', 20, 21, 'nap')
    // The bedtime night starts at 19:00 (before the late nap) but ends next
    // day; it must not become the source of a gap.
    const gaps = computeWakeGaps([nap1, lateNap], [nightBedtime])
    expect(gaps.every((g) => g.fromKind === 'nap')).toBe(true)
  })

  it('keeps a boundary night that starts the day target-only', () => {
    // A night sleep that starts at the very beginning of the day (00:00) and
    // ends after local midnight belongs to the next day; as the first event of
    // the day it must never open a gap, and the rendered naps still pair up.
    const nightStartsDay = sleep('nb', 0, 30, 'night')
    const gaps = computeWakeGaps([nap1, nap2], [nightStartsDay])
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toMatchObject({ fromKind: 'nap', toKind: 'nap', gapMs: 3 * H })
  })

  it('ignores ongoing sleeps as sources', () => {
    const ongoing = sleep('a3', 14, null, 'nap')
    const gaps = computeWakeGaps([nap1, ongoing])
    expect(gaps).toHaveLength(1)
    expect(gaps[0].toMs).toBe(new Date(ongoing.startTime).getTime())
  })
})

describe('computeLiveWakeWindow', () => {
  it('returns the awake-since window after the last completed nap', () => {
    const live = computeLiveWakeWindow([nightMorning, nap1, nap2], DAY_START + 17 * H)
    expect(live).toEqual({ sourceEndMs: DAY_START + 15.5 * H, wakeMs: 1.5 * H })
    expect(liveWakeLabel(live as NonNullable<typeof live>)).toMatch(/^Awake since .+ · 1h 30m$/)
  })

  it('returns null while a sleep is running', () => {
    const ongoing = sleep('a3', 16, null, 'nap')
    expect(computeLiveWakeWindow([nap1, ongoing], DAY_START + 17 * H)).toBeNull()
  })

  it('returns null when the last completed sleep is a night sleep (no nap window)', () => {
    expect(computeLiveWakeWindow([nightMorning], DAY_START + 17 * H)).toBeNull()
    expect(computeLiveWakeWindow([], DAY_START + 17 * H)).toBeNull()
  })
})

describe('WakeWindowLine', () => {
  it('renders the between-nap gaps for a past day (no live window)', () => {
    render(<WakeWindowLine sleeps={[nightMorning, nap1, nap2]} boundarySleeps={[nightBedtime]} nowMs={0} live={false} />)

    const region = screen.getByRole('region', { name: 'Wake windows' })
    expect(region).toHaveTextContent('Awake 3h 30m after waking')
    expect(region).toHaveTextContent('Awake 3h 0m between naps')
    expect(region).toHaveTextContent('Awake 3h 30m before bed')
    expect(region).not.toHaveTextContent('Awake since')
  })

  it('shows the live awake-since line on top when the baby is awake now', () => {
    render(<WakeWindowLine sleeps={[nightMorning, nap1, nap2]} boundarySleeps={[nightBedtime]} nowMs={DAY_START + 17 * H} live />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/Awake since .+ · 1h 30m/)
  })

  it('hides the live window when live is false (past day)', () => {
    render(<WakeWindowLine sleeps={[nightMorning, nap1, nap2]} boundarySleeps={[nightBedtime]} nowMs={DAY_START + 17 * H} live={false} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Wake windows' })).toBeInTheDocument()
  })

  it('hides the live window while a sleep is running', () => {
    const ongoing = sleep('a3', 16, null, 'nap')
    render(<WakeWindowLine sleeps={[nap1, ongoing]} nowMs={DAY_START + 17 * H} live />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders nothing for an empty day', () => {
    const { container } = render(<WakeWindowLine sleeps={[]} nowMs={DAY_START + 17 * H} live />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a nap-free day', () => {
    const { container } = render(
      <WakeWindowLine sleeps={[nightMorning]} boundarySleeps={[nightBedtime]} nowMs={DAY_START + 17 * H} live />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
