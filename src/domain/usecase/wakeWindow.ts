export const HOUR_MS = 60 * 60 * 1000

export interface WakeInfo {
  sourceEndMs: number
  wakeMs: number
}

/**
 * The current wake window: milliseconds since the most recent completed
 * sleep ended. Returns null while a sleep is running or if no sleep has
 * ended yet.
 */
export function getWakeInfo(sleeps: { startTime: string; endTime: string | null }[], nowMs: number): WakeInfo | null {
  if (sleeps.some((s) => s.endTime === null)) {
    return null
  }
  let lastEnd = -1
  for (const s of sleeps) {
    if (s.endTime) {
      const t = new Date(s.endTime).getTime()
      if (t > lastEnd) {
        lastEnd = t
      }
    }
  }
  if (lastEnd < 0) {
    return null
  }
  return { sourceEndMs: lastEnd, wakeMs: Math.max(0, nowMs - lastEnd) }
}

export interface WakeReminderInput {
  enabled: boolean
  asleep: boolean
  lastWakeEndMs: number | null
  notifiedForEnd: string | null
  thresholdMs: number
  nowMs: number
}

/** Whether a wake-window reminder should fire (once per wake cycle). */
export function shouldFireWakeReminder(input: WakeReminderInput): boolean {
  if (!input.enabled || input.asleep || input.lastWakeEndMs === null) {
    return false
  }
  const overdue = input.nowMs - input.lastWakeEndMs >= input.thresholdMs
  return overdue && input.notifiedForEnd !== String(input.lastWakeEndMs)
}
