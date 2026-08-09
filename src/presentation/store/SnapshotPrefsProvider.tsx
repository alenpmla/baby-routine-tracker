import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { BottleUnit, SnapshotUnits, SolidsUnit } from '../utils/feeding'

const KEY = 'snapshotUnits'
const REPORT_KEY = 'reportUnits'
const AVERAGES_KEY = 'averagesDays'
const DEFAULTS: SnapshotUnits = { bottle: 'ml', solids: 'g' }

export type AveragesDays = 7 | 15 | 30 | 60
const AVERAGES_DAYS: AveragesDays[] = [7, 15, 30, 60]
const DEFAULT_AVERAGES_DAYS: AveragesDays = 30

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

function readStored(key: string): SnapshotUnits {
  try {
    const raw = window.localStorage.getItem(`bt.${key}`)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SnapshotUnits>
      const bottle = parsed.bottle === 'oz' || parsed.bottle === 'ml' ? parsed.bottle : DEFAULTS.bottle
      const solids = parsed.solids === 'oz' || parsed.solids === 'g' ? parsed.solids : DEFAULTS.solids
      return { bottle, solids }
    }
  } catch {
    /* ignore */
  }
  return DEFAULTS
}

function writeStored(key: string, units: SnapshotUnits) {
  try {
    window.localStorage.setItem(`bt.${key}`, JSON.stringify(units))
  } catch {
    /* ignore */
  }
}

function readAveragesDays(): AveragesDays {
  try {
    const raw = window.localStorage.getItem(`bt.${AVERAGES_KEY}`)
    if (raw !== null) {
      const n = Number(raw)
      if (AVERAGES_DAYS.includes(n as AveragesDays)) {
        return n as AveragesDays
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_AVERAGES_DAYS
}

export function SnapshotPrefsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<SnapshotUnits>(() => readStored(KEY))
  const [reportUnits, setReportUnits] = useState<SnapshotUnits>(() => readStored(REPORT_KEY))
  const [averagesDays, setAveragesDaysState] = useState<AveragesDays>(readAveragesDays)

  useEffect(() => {
    writeStored(KEY, units)
  }, [units])

  useEffect(() => {
    writeStored(REPORT_KEY, reportUnits)
  }, [reportUnits])

  useEffect(() => {
    try {
      window.localStorage.setItem(`bt.${AVERAGES_KEY}`, String(averagesDays))
    } catch {
      /* ignore */
    }
  }, [averagesDays])

  const setAveragesDays = useCallback((days: AveragesDays) => setAveragesDaysState(days), [])

  const value = useMemo<SnapshotPrefsValue>(
    () => ({
      units,
      setBottleUnit: (bottle) => setUnits((u) => ({ ...u, bottle })),
      setSolidsUnit: (solids) => setUnits((u) => ({ ...u, solids })),
      reportUnits,
      setReportBottleUnit: (bottle) => setReportUnits((u) => ({ ...u, bottle })),
      setReportSolidsUnit: (solids) => setReportUnits((u) => ({ ...u, solids })),
      averagesDays,
      setAveragesDays,
    }),
    [units, reportUnits, averagesDays, setAveragesDays],
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
