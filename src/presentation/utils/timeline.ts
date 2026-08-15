import type { TimelineEvent } from '../../domain/usecase/timeline'
import { foodsOf } from '../../domain/model/FeedingSession'
import { sleepKind, type SleepSession } from '../../domain/model/SleepSession'
import { describeFeedingMeta } from './feeding'
import { formatClock, formatDuration } from './time'

/** The bottom-bar tab a timeline entry navigates to. */
export function timelineTab(event: TimelineEvent): 'sleep' | 'feeding' | 'diaper' {
  return event.kind
}

/** Night vs nap for a sleep, incl. running sleeps (inferred from start hour). */
function isNight(s: SleepSession): boolean {
  if (s.endTime) {
    return sleepKind(s) === 'night'
  }
  const hour = new Date(s.startTime).getHours()
  return hour >= 19 || hour < 9
}

export interface TimelineWording {
  /** Natural-language headline, e.g. "Woke up at 8:00 AM". */
  headline: string
  /** Secondary meta line, e.g. duration / amount; empty when there is none. */
  meta: string
  /** ISO-8601 anchor used for the rail clock and chronological ordering. */
  time: string
}

/**
 * Builds the natural-language wording for a single day-log entry used by the
 * Home timeline view. Presentation-only: wordings are never persisted.
 *
 * The story reads morning → night: the day opens with "Woke up at …", daytime
 * naps are "Napped …" / "Started nap at …", and it closes with "Started night
 * sleep at …".
 */
export function timelineWording(event: TimelineEvent): TimelineWording {
  if (event.kind === 'sleep') {
    const startClock = formatClock(event.data.startTime)
    // Start-side of a sleep (used for a night sleep that began in this day but
    // ends after it): the day closes with "Started night sleep at …".
    if (event.mode === 'start') {
      return isNight(event.data)
        ? { headline: `Started night sleep at ${startClock}`, meta: 'asleep', time: event.data.startTime }
        : { headline: `Started nap at ${startClock}`, meta: 'asleep', time: event.data.startTime }
    }
    if (!event.data.endTime) {
      // Running sleep: the day (or night) is still going.
      return isNight(event.data)
        ? { headline: `Started night sleep at ${startClock}`, meta: 'asleep now', time: event.data.startTime }
        : { headline: `Started nap at ${startClock}`, meta: 'asleep now', time: event.data.startTime }
    }
    const endClock = formatClock(event.data.endTime)
    const duration = formatDuration(
      new Date(event.data.endTime).getTime() - new Date(event.data.startTime).getTime(),
    )
    if (isNight(event.data)) {
      // A completed night sleep spans the evening→morning; the headline is the
      // wake-up, so anchor it at the end time (the morning).
      return {
        headline: `Woke up at ${endClock}`,
        meta: `slept ${startClock}–${endClock} · ${duration}`,
        time: event.data.endTime,
      }
    }
    return {
      headline: `Napped ${startClock}–${endClock}`,
      meta: duration,
      time: event.data.startTime,
    }
  }

  if (event.kind === 'feeding') {
    const f = event.data
    if (f.type === 'solids') {
      const foods = foodsOf(f)
      return {
        headline: foods.length > 0 ? `Had ${foods.join(', ')}` : 'Had solid food',
        meta: describeFeedingMeta(f),
        time: event.time,
      }
    }
    if (f.type === 'bottle') {
      const amount = f.amount !== undefined && f.unit ? `${f.amount} ${f.unit}` : ''
      return {
        headline: amount ? `Had ${amount} bottle` : 'Had a bottle',
        meta: describeFeedingMeta(f),
        time: event.time,
      }
    }
    // breast
    const duration =
      f.startTime && f.endTime
        ? formatDuration(new Date(f.endTime).getTime() - new Date(f.startTime).getTime())
        : describeFeedingMeta(f)
    return { headline: duration ? `Nursed ${duration}` : 'Nursed', meta: '', time: event.time }
  }

  // diaper
  const type = event.data.type
  if (type === 'wet') {
    return { headline: 'Wet diaper', meta: formatClock(event.time), time: event.time }
  }
  if (type === 'dirty') {
    return { headline: 'Dirty diaper', meta: formatClock(event.time), time: event.time }
  }
  return { headline: 'Diaper (both)', meta: formatClock(event.time), time: event.time }
}

