import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { BottleUnit, SnapshotUnits, SolidsUnit } from '../utils/feeding'

const KEY = 'snapshotUnits'
const REPORT_KEY = 'reportUnits'
const DEFAULTS: SnapshotUnits = { bottle: 'ml', solids: 'g' }

interface SnapshotPrefsValue {
  units: SnapshotUnits
  setBottleUnit: (unit: BottleUnit) => void
  setSolidsUnit: (unit: SolidsUnit) => void
  reportUnits: SnapshotUnits
  setReportBottleUnit: (unit: BottleUnit) => void
  setReportSolidsUnit: (unit: SolidsUnit) => void
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

export function SnapshotPrefsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<SnapshotUnits>(() => readStored(KEY))
  const [reportUnits, setReportUnits] = useState<SnapshotUnits>(() => readStored(REPORT_KEY))

  useEffect(() => {
    writeStored(KEY, units)
  }, [units])

  useEffect(() => {
    writeStored(REPORT_KEY, reportUnits)
  }, [reportUnits])

  const value = useMemo<SnapshotPrefsValue>(
    () => ({
      units,
      setBottleUnit: (bottle) => setUnits((u) => ({ ...u, bottle })),
      setSolidsUnit: (solids) => setUnits((u) => ({ ...u, solids })),
      reportUnits,
      setReportBottleUnit: (bottle) => setReportUnits((u) => ({ ...u, bottle })),
      setReportSolidsUnit: (solids) => setReportUnits((u) => ({ ...u, solids })),
    }),
    [units, reportUnits],
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
