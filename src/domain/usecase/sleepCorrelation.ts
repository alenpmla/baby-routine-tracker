import type { SleepSession } from '../model/SleepSession'
import { isNightSleep } from '../model/SleepSession'
import type { TeethingDay } from '../model/TeethingDay'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The local calendar day as yyyy-mm-dd. TeethingDay.day is a local date-only
 * string and sleeps are grouped by their local start day (start-day
 * attribution, matching the report daily-totals grouping).
 */
function localDayString(at: Date): string {
  const year = at.getFullYear()
  const month = String(at.getMonth() + 1).padStart(2, '0')
  const date = String(at.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

export interface TeethingSleepCorrelation {
  /** The window length in days that was analysed. */
  windowDays: number
  /** Average daily sleep duration on days with a teething day logged. */
  teethingDaysAvgMs: number
  /** Average daily sleep duration on days without a teething day logged. */
  nonTeethingDaysAvgMs: number
  /** Average night-wakings per day on teething days (WP100 night semantics). */
  teethingNightWakingsAvg: number
  /** Average night-wakings per day on non-teething days (WP100 night semantics). */
  nonTeethingNightWakingsAvg: number
  /** Number of teething days within the window that had sleep data. */
  teethingDayCount: number
  /** Number of non-teething days within the window that had sleep data. */
  nonTeethingDayCount: number
  /** Total night-wakings on teething days within the window. */
  teethingNightWakingsCount: number
  /** Total night-wakings on non-teething days within the window. */
  nonTeethingNightWakingsCount: number
  /** teethingDaysAvgMs minus nonTeethingDaysAvgMs. */
  diffMs: number
}

/**
 * Compares average daily sleep duration and average night-wakings on teething
 * days vs non-teething days over a window of local calendar days ending today
 * (inclusive).
 *
 * - Completed sleeps are grouped by their local start day (start-day
 *   attribution); a night that spans midnight counts in full on the day it
 *   started, matching the report daily-totals grouping.
 * - A day counts as a teething day when a TeethingDay entry's date-only `day`
 *   matches that local calendar day.
 * - Only days with at least one completed sleep are averaged into their group;
 *   days without sleep data are ignored.
 * - Night-wakings per day count the sleeps classified as night (WP100
 *   semantics: local start hour >= 19 or < 9, via `isNightSleep`) that start
 *   in that day's window; days with sleep but no night sleep count as 0
 *   wakings. The night-wakings average uses the same group denominator as the
 *   duration average (days with sleep data).
 * - Returns null when either group has no day with sleep data (insufficient
 *   data to compare).
 *
 * Read-only over existing sleep + teething data; no sleep logic is added.
 */
export function getTeethingSleepCorrelation(
  teethingDays: TeethingDay[],
  sleeps: SleepSession[],
  windowDays = 30,
  now = new Date(),
): TeethingSleepCorrelation | null {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const windowStart = todayStart - (windowDays - 1) * DAY_MS

  const teethingKeys = new Set(teethingDays.map((d) => d.day))

  let teethingMs = 0
  let teethingWakings = 0
  let teethingDaysWithSleep = 0
  let nonTeethingMs = 0
  let nonTeethingWakings = 0
  let nonTeethingDaysWithSleep = 0

  for (let i = 0; i < windowDays; i += 1) {
    const dayStartMs = windowStart + i * DAY_MS
    const dayEndMs = dayStartMs + DAY_MS

    let daySleepMs = 0
    let dayNightWakings = 0
    for (const s of sleeps) {
      if (!s.endTime) {
        continue
      }
      const startMs = new Date(s.startTime).getTime()
      if (startMs >= dayStartMs && startMs < dayEndMs) {
        const duration = new Date(s.endTime).getTime() - startMs
        if (duration > 0) {
          daySleepMs += duration
          if (isNightSleep(s)) {
            dayNightWakings += 1
          }
        }
      }
    }
    if (daySleepMs <= 0) {
      continue
    }

    if (teethingKeys.has(localDayString(new Date(dayStartMs)))) {
      teethingMs += daySleepMs
      teethingWakings += dayNightWakings
      teethingDaysWithSleep += 1
    } else {
      nonTeethingMs += daySleepMs
      nonTeethingWakings += dayNightWakings
      nonTeethingDaysWithSleep += 1
    }
  }

  if (teethingDaysWithSleep === 0 || nonTeethingDaysWithSleep === 0) {
    return null
  }

  const teethingDaysAvgMs = teethingMs / teethingDaysWithSleep
  const nonTeethingDaysAvgMs = nonTeethingMs / nonTeethingDaysWithSleep
  const teethingNightWakingsAvg = teethingWakings / teethingDaysWithSleep
  const nonTeethingNightWakingsAvg = nonTeethingWakings / nonTeethingDaysWithSleep
  return {
    windowDays,
    teethingDaysAvgMs,
    nonTeethingDaysAvgMs,
    teethingNightWakingsAvg,
    nonTeethingNightWakingsAvg,
    teethingDayCount: teethingDaysWithSleep,
    nonTeethingDayCount: nonTeethingDaysWithSleep,
    teethingNightWakingsCount: teethingWakings,
    nonTeethingNightWakingsCount: nonTeethingWakings,
    diffMs: teethingDaysAvgMs - nonTeethingDaysAvgMs,
  }
}
