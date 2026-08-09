import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useTracker } from './TrackerProvider'
import { DEFAULT_WAKE_WINDOW_ENABLED, DEFAULT_WAKE_WINDOW_MINUTES } from '../../domain/model/AppSettings'

const MIN_MINUTES = 15
const MAX_MINUTES = 720

interface NotificationPrefsValue {
  wakeWindowEnabled: boolean
  setWakeWindowEnabled: (enabled: boolean) => void
  wakeWindowMinutes: number
  setWakeWindowMinutes: (minutes: number) => void
}

const NotificationPrefsContext = createContext<NotificationPrefsValue | null>(null)

function clampMinutes(n: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n))
}

function readLegacyBool(key: string): boolean | null {
  try {
    const raw = window.localStorage.getItem(`bt.${key}`)
    if (raw !== null) {
      return raw === 'true'
    }
  } catch {
    /* ignore */
  }
  return null
}

function readLegacyMinutes(): number | null {
  try {
    const raw = window.localStorage.getItem('bt.wakeWindowMinutes')
    if (raw !== null) {
      const n = Number(raw)
      if (Number.isFinite(n)) {
        return clampMinutes(Math.round(n))
      }
    }
    const legacyHours = window.localStorage.getItem('bt.wakeWindowHours')
    if (legacyHours !== null) {
      const h = Number(legacyHours)
      if (Number.isFinite(h) && h >= 1 && h <= 12) {
        return clampMinutes(h * 60)
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

export function NotificationPrefsProvider({ children }: { children: ReactNode }) {
  const { ready, settings, updateSettings } = useTracker()
  const wakeWindowEnabled = settings.wakeWindowEnabled ?? DEFAULT_WAKE_WINDOW_ENABLED
  const wakeWindowMinutes = settings.wakeWindowMinutes ?? DEFAULT_WAKE_WINDOW_MINUTES

  const setWakeWindowEnabled = useCallback((enabled: boolean) => updateSettings({ wakeWindowEnabled: enabled }), [updateSettings])
  const setWakeWindowMinutes = useCallback((minutes: number) => updateSettings({ wakeWindowMinutes: clampMinutes(minutes) }), [updateSettings])

  // One-time migration from legacy per-device keys into synced settings.
  // Waits for the initial load so it never clobbers the freshly loaded settings.
  useEffect(() => {
    if (!ready) {
      return
    }
    const patch: Record<string, unknown> = {}
    if (settings.wakeWindowEnabled === undefined) {
      const legacy = readLegacyBool('wakeWindowEnabled')
      if (legacy !== null) {
        patch.wakeWindowEnabled = legacy
      }
    }
    if (settings.wakeWindowMinutes === undefined) {
      const legacy = readLegacyMinutes()
      if (legacy !== null) {
        patch.wakeWindowMinutes = legacy
      }
    }
    if (Object.keys(patch).length > 0) {
      updateSettings(patch)
    }
  }, [ready, settings.wakeWindowEnabled, settings.wakeWindowMinutes, updateSettings])

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
