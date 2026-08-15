export type SleepKind = 'nap' | 'night'

export interface SleepSession {
  id: string
  /** ISO-8601 UTC */
  startTime: string
  /** ISO-8601 UTC; null while the sleep is still running */
  endTime: string | null
  /** Explicit nap/night label; absent on legacy records, inferred via sleepKind */
  kind?: SleepKind
}

/**
 * Night sleep = a completed sleep whose LOCAL start hour falls in the 7pm–9am
 * window (`hour >= 19 || hour < 9`); everything else is a nap. Ongoing sleeps
 * (no endTime) are treated as naps unless a kind is explicitly set.
 */
export function inferSleepKind(session: SleepSession): SleepKind {
  if (!session.endTime) {
    return 'nap'
  }
  const hour = new Date(session.startTime).getHours()
  return hour >= 19 || hour < 9 ? 'night' : 'nap'
}

/** Concrete kind for a session: explicit `kind` if present, else inferred. */
export function sleepKind(session: SleepSession): SleepKind {
  return session.kind ?? inferSleepKind(session)
}

export function isNightSleep(session: SleepSession): boolean {
  return sleepKind(session) === 'night'
}

export function isNap(session: SleepSession): boolean {
  return sleepKind(session) === 'nap'
}
