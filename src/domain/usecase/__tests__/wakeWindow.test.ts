import { describe, it, expect } from 'vitest'
import { getWakeInfo, shouldFireWakeReminder } from '../wakeWindow'

const HOUR = 60 * 60 * 1000

function sleep(startTime: string, endTime: string | null) {
  return { startTime, endTime }
}

const iso = (hoursAgo: number) => new Date(Date.now() - hoursAgo * HOUR).toISOString()

describe('getWakeInfo', () => {
  it('returns null while a sleep is running', () => {
    expect(getWakeInfo([sleep(iso(1), null)], Date.now())).toBeNull()
  })

  it('returns null when no sleep has ended', () => {
    expect(getWakeInfo([], Date.now())).toBeNull()
  })

  it('measures the window since the most recent completed sleep end', () => {
    const now = Date.now()
    const info = getWakeInfo(
      [
        sleep(iso(10), iso(8)), // ended 8h ago
        sleep(iso(5), iso(4)), // ended 4h ago (most recent)
      ],
      now,
    )
    expect(info).not.toBeNull()
    expect(info?.sourceEndMs).toBeCloseTo(now - 4 * HOUR, -2)
    expect(info?.wakeMs).toBeCloseTo(4 * HOUR, -2)
  })
})

describe('shouldFireWakeReminder', () => {
  const base = {
    enabled: true,
    asleep: false,
    lastWakeEndMs: Date.now() - 4 * HOUR,
    notifiedForEnd: null,
    thresholdMs: 3 * HOUR,
    nowMs: Date.now(),
  }

  it('does not fire when disabled', () => {
    expect(shouldFireWakeReminder({ ...base, enabled: false })).toBe(false)
  })

  it('does not fire while the baby is asleep', () => {
    expect(shouldFireWakeReminder({ ...base, asleep: true })).toBe(false)
  })

  it('does not fire without a wake end', () => {
    expect(shouldFireWakeReminder({ ...base, lastWakeEndMs: null })).toBe(false)
  })

  it('does not fire before the threshold', () => {
    expect(shouldFireWakeReminder({ ...base, lastWakeEndMs: Date.now() - 2 * HOUR })).toBe(false)
  })

  it('fires once when overdue and not yet notified', () => {
    expect(shouldFireWakeReminder(base)).toBe(true)
  })

  it('does not re-fire for the same wake cycle', () => {
    expect(shouldFireWakeReminder({ ...base, notifiedForEnd: String(base.lastWakeEndMs) })).toBe(false)
  })

  it('fires again for a new wake cycle', () => {
    const newEnd = base.lastWakeEndMs + HOUR
    expect(shouldFireWakeReminder({ ...base, lastWakeEndMs: newEnd, notifiedForEnd: String(base.lastWakeEndMs) })).toBe(
      true,
    )
  })
})
