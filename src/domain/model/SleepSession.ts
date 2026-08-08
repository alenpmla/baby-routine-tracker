export interface SleepSession {
  id: string
  /** ISO-8601 UTC */
  startTime: string
  /** ISO-8601 UTC; null while the sleep is still running */
  endTime: string | null
}
