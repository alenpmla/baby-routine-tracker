import { useEffect, useState } from 'react'
import { useTracker } from './TrackerProvider'
import { useNotificationPrefs } from './NotificationPrefsProvider'

export interface WakeStatus {
  asleep: boolean
  remainingMs: number | null
  overdue: boolean
}

const TICK_MS = 30_000

/** Time until the wake window elapses. null when there is no active wake window. */
export function useWakeStatus(): WakeStatus {
  const { activeSleep, lastWakeEndMs } = useTracker()
  const { wakeWindowMinutes } = useNotificationPrefs()
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  if (activeSleep) {
    return { asleep: true, remainingMs: null, overdue: false }
  }
  if (lastWakeEndMs === null) {
    return { asleep: false, remainingMs: null, overdue: false }
  }
  const remainingMs = wakeWindowMinutes * 60_000 - (nowMs - lastWakeEndMs)
  return { asleep: false, remainingMs, overdue: remainingMs <= 0 }
}
