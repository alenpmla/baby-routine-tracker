import { useEffect, useRef } from 'react'
import { shouldFireWakeReminder } from '../../domain/usecase/wakeWindow'
import { useTracker } from './TrackerProvider'
import { useNotificationPrefs } from './NotificationPrefsProvider'
import { useSnackbar } from './SnackbarProvider'
import { showSystemNotification } from '../utils/notify'
import { formatDuration } from '../utils/time'

const NOTIFIED_KEY = 'wakeNotifiedForEnd'
const CHECK_INTERVAL_MS = 30_000

function readNotifiedFor(): string | null {
  try {
    return window.localStorage.getItem(`bt.${NOTIFIED_KEY}`)
  } catch {
    return null
  }
}

function writeNotifiedFor(value: string) {
  try {
    window.localStorage.setItem(`bt.${NOTIFIED_KEY}`, value)
  } catch {
    /* ignore */
  }
}

function sendNotification(body: string) {
  void showSystemNotification('Wake window', body)
}

export function useWakeWindowReminder() {
  const { activeSleep, lastWakeEndMs } = useTracker()
  const { wakeWindowEnabled, wakeWindowMinutes } = useNotificationPrefs()
  const { showSnackbar } = useSnackbar()
  const notifiedFor = useRef<string | null>(readNotifiedFor())
  const showSnackbarRef = useRef(showSnackbar)
  showSnackbarRef.current = showSnackbar

  useEffect(() => {
    const check = () => {
      const fire = shouldFireWakeReminder({
        enabled: wakeWindowEnabled,
        asleep: activeSleep !== null,
        lastWakeEndMs,
        notifiedForEnd: notifiedFor.current,
        thresholdMs: wakeWindowMinutes * 60_000,
        nowMs: Date.now(),
      })
      if (!fire || lastWakeEndMs === null) {
        return
      }
      const source = String(lastWakeEndMs)
      notifiedFor.current = source
      writeNotifiedFor(source)
      const body = `Baby has been awake for ${formatDuration(wakeWindowMinutes * 60_000)} — time for a nap?`
      sendNotification(body)
      showSnackbarRef.current(body)
    }

    check()
    const interval = window.setInterval(check, CHECK_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [wakeWindowEnabled, wakeWindowMinutes, activeSleep, lastWakeEndMs])
}
