import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const ENABLED_KEY = 'wakeWindowEnabled'
const MINUTES_KEY = 'wakeWindowMinutes'
const LEGACY_HOURS_KEY = 'wakeWindowHours'
const DEFAULT_ENABLED = true
const DEFAULT_MINUTES = 180
const MIN_MINUTES = 15
const MAX_MINUTES = 720

interface NotificationPrefsValue {
  wakeWindowEnabled: boolean
  setWakeWindowEnabled: (enabled: boolean) => void
  wakeWindowMinutes: number
  setWakeWindowMinutes: (minutes: number) => void
}

const NotificationPrefsContext = createContext<NotificationPrefsValue | null>(null)

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(`bt.${key}`)
    if (raw !== null) {
      return raw === 'true'
    }
  } catch {
    /* ignore */
  }
  return fallback
}

function clampMinutes(n: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n))
}

function readMinutes(): number {
  try {
    const raw = window.localStorage.getItem(`bt.${MINUTES_KEY}`)
    if (raw !== null) {
      const n = Number(raw)
      if (Number.isFinite(n)) {
        return clampMinutes(Math.round(n))
      }
    }
    const legacy = window.localStorage.getItem(`bt.${LEGACY_HOURS_KEY}`)
    if (legacy !== null) {
      const h = Number(legacy)
      if (Number.isFinite(h) && h >= 1 && h <= 12) {
        return clampMinutes(h * 60)
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_MINUTES
}

export function NotificationPrefsProvider({ children }: { children: ReactNode }) {
  const [wakeWindowEnabled, setWakeWindowEnabledState] = useState(() => readBool(ENABLED_KEY, DEFAULT_ENABLED))
  const [wakeWindowMinutes, setWakeWindowMinutesState] = useState(readMinutes)

  useEffect(() => {
    try {
      window.localStorage.setItem(`bt.${ENABLED_KEY}`, String(wakeWindowEnabled))
    } catch {
      /* ignore */
    }
  }, [wakeWindowEnabled])

  useEffect(() => {
    try {
      window.localStorage.setItem(`bt.${MINUTES_KEY}`, String(wakeWindowMinutes))
    } catch {
      /* ignore */
    }
  }, [wakeWindowMinutes])

  const setWakeWindowEnabled = useCallback((enabled: boolean) => setWakeWindowEnabledState(enabled), [])
  const setWakeWindowMinutes = useCallback((minutes: number) => setWakeWindowMinutesState(clampMinutes(minutes)), [])

  const value = useMemo<NotificationPrefsValue>(
    () => ({ wakeWindowEnabled, setWakeWindowEnabled, wakeWindowMinutes, setWakeWindowMinutes }),
    [wakeWindowEnabled, setWakeWindowEnabled, wakeWindowMinutes, setWakeWindowMinutes],
  )

  return <NotificationPrefsContext.Provider value={value}>{children}</NotificationPrefsContext.Provider>
}

export function useNotificationPrefs(): NotificationPrefsValue {
  const ctx = useContext(NotificationPrefsContext)
  if (!ctx) {
    throw new Error('useNotificationPrefs must be used within NotificationPrefsProvider')
  }
  return ctx
}
