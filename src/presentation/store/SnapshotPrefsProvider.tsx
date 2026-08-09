import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useTracker } from './TrackerProvider'
import {
  DEFAULT_AVERAGES_DAYS,
  DEFAULT_SNAPSHOT_UNITS,
  type AveragesDays,
  type BottleUnit,
  type SnapshotUnits,
  type SolidsUnit,
} from '../../domain/model/AppSettings'

export type { AveragesDays, BottleUnit, SnapshotUnits, SolidsUnit } from '../../domain/model/AppSettings'

interface SnapshotPrefsValue {
  units: SnapshotUnits
  setBottleUnit: (unit: BottleUnit) => void
  setSolidsUnit: (unit: SolidsUnit) => void
  reportUnits: SnapshotUnits
  setReportBottleUnit: (unit: BottleUnit) => void
  setReportSolidsUnit: (unit: SolidsUnit) => void
  averagesDays: AveragesDays
  setAveragesDays: (days: AveragesDays) => void
}

const SnapshotPrefsContext = createContext<SnapshotPrefsValue | null>(null)

const AVERAGES_DAYS_OPTIONS: AveragesDays[] = [7, 15, 30, 60]

function readLegacy<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(`bt.${key}`)
    if (raw !== null) {
      return JSON.parse(raw) as T
    }
  } catch {
    /* ignore */
  }
  return null
}

export function SnapshotPrefsProvider({ children }: { children: ReactNode }) {
  const { ready, settings, updateSettings } = useTracker()
  const units = settings.snapshotUnits ?? DEFAULT_SNAPSHOT_UNITS
  const reportUnits = settings.reportUnits ?? DEFAULT_SNAPSHOT_UNITS
  const averagesDays = settings.averagesDays ?? DEFAULT_AVERAGES_DAYS

  const setBottleUnit = useCallback((bottle: BottleUnit) => updateSettings({ snapshotUnits: { ...units, bottle } }), [units, updateSettings])
  const setSolidsUnit = useCallback((solids: SolidsUnit) => updateSettings({ snapshotUnits: { ...units, solids } }), [units, updateSettings])
  const setReportBottleUnit = useCallback(
    (bottle: BottleUnit) => updateSettings({ reportUnits: { ...reportUnits, bottle } }),
    [reportUnits, updateSettings],
  )
  const setReportSolidsUnit = useCallback(
    (solids: SolidsUnit) => updateSettings({ reportUnits: { ...reportUnits, solids } }),
    [reportUnits, updateSettings],
  )
  const setAveragesDays = useCallback((days: AveragesDays) => updateSettings({ averagesDays: days }), [updateSettings])

  // One-time migration from legacy per-device keys into synced settings.
  // Waits for the initial load so it never clobbers the freshly loaded settings.
  useEffect(() => {
    if (!ready) {
      return
    }
    const patch: Record<string, unknown> = {}
    if (!settings.snapshotUnits) {
      const legacy = readLegacy<SnapshotUnits>('snapshotUnits')
      if (legacy && legacy.bottle && legacy.solids) {
        patch.snapshotUnits = legacy
      }
    }
    if (!settings.reportUnits) {
      const legacy = readLegacy<SnapshotUnits>('reportUnits')
      if (legacy && legacy.bottle && legacy.solids) {
        patch.reportUnits = legacy
      }
    }
    if (!settings.averagesDays) {
      const legacy = readLegacy<number>('averagesDays')
      if (legacy && (AVERAGES_DAYS_OPTIONS as number[]).includes(legacy)) {
        patch.averagesDays = legacy as AveragesDays
      }
    }
    if (Object.keys(patch).length > 0) {
      updateSettings(patch)
    }
  }, [ready, settings.snapshotUnits, settings.reportUnits, settings.averagesDays, updateSettings])

  const value = useMemo<SnapshotPrefsValue>(
    () => ({
      units,
      setBottleUnit,
      setSolidsUnit,
      reportUnits,
      setReportBottleUnit,
      setReportSolidsUnit,
      averagesDays,
      setAveragesDays,
    }),
    [units, setBottleUnit, setSolidsUnit, reportUnits, setReportBottleUnit, setReportSolidsUnit, averagesDays, setAveragesDays],
  )

  return <SnapshotPrefsContext.Provider value={value}>{children}</SnapshotPrefsContext.Provider>
}

export function useSnapshotPrefs(): SnapshotPrefsValue {
  const ctx = useContext(SnapshotPrefsContext)
  if (!ctx) {
    throw new Error('useSnapshotPrefs must be used within SnapshotPrefsProvider')
  }
  return ctx
}
