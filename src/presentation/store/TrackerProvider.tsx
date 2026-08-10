import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Baby } from '../../domain/model/Baby'
import type { AppSettings } from '../../domain/model/AppSettings'
import type { DiaperChange, DiaperType } from '../../domain/model/DiaperChange'
import type { FeedingSession, FeedingType } from '../../domain/model/FeedingSession'
import type { SleepSession } from '../../domain/model/SleepSession'
import type { WeightEntry, WeightUnit } from '../../domain/model/WeightEntry'
import type { DayTimeline } from '../../domain/usecase/timeline'
import {
  deleteDiaperChange,
  recordDiaperChange,
} from '../../domain/usecase/diaper'
import { updateDiaperChange as updateDiaperUseCase } from '../../domain/usecase/diaper'
import { deleteFeeding, recordFeeding, type FeedingDetails } from '../../domain/usecase/feeding'
import { updateFeeding as updateFeedingUseCase } from '../../domain/usecase/feeding'
import {
  deleteSleep,
  getActiveSleep,
  logCompletedSleep,
  startSleep,
  stopSleep,
} from '../../domain/usecase/sleep'
import { updateSleep as updateSleepUseCase } from '../../domain/usecase/sleep'
import { deleteWeight, recordWeight, updateWeight, latestWeight } from '../../domain/usecase/weight'
import { getDayTimeline } from '../../domain/usecase/timeline'
import { saveBabyProfile } from '../../domain/usecase/baby'
import type { SaveBabyInput } from '../../domain/usecase/baby'
import { addFoodSuggestion, removeFoodSuggestion } from '../../domain/usecase/settings'
import { getDailyAverages, type DailyAverages } from '../../domain/usecase/averages'
import { getInsights, type Insight } from '../../domain/usecase/insights'
import { getFoodVariety, type FoodVariety } from '../../domain/usecase/foodVariety'
import { DEFAULT_AVERAGES_DAYS } from '../../domain/model/AppSettings'
import { createSyncRepositories, type SyncRepositories } from '../../data/repositories'
import type { BackupData } from '../../data/repositories/RemoteRepositories'
import { getDayRange, shiftDays, startOfDay } from '../utils/time'
import type { ReportRecords } from '../utils/report'

export interface TrackerState {
  ready: boolean
  offline: boolean
  baby: Baby | null
  activeSleep: SleepSession | null
  selectedDay: Date
  day: DayTimeline
  dayCounts: { sleeps: number; feeds: number; diapers: number }
  foodSuggestions: string[]
  dailyAverages: DailyAverages
  insights: Insight[]
  foodVariety: FoodVariety | null
  lastWakeEndMs: number | null
  settings: AppSettings
  now: Date
}

export interface TrackerActions {
  saveProfile: (input: SaveBabyInput) => Baby
  updateSettings: (patch: Partial<AppSettings>) => void
  startSleepTimer: (at?: Date) => SleepSession
  stopSleepTimer: () => SleepSession
  logPastSleep: (start: Date, end: Date) => SleepSession
  removeSleep: (id: string) => void
  addFeeding: (type: FeedingType, at?: Date, details?: FeedingDetails) => FeedingSession
  removeFeeding: (id: string) => void
  addDiaper: (type: DiaperType, at?: Date) => DiaperChange
  removeDiaper: (id: string) => void
  updateSleepRecord: (id: string, start: Date, end: Date | null) => SleepSession
  updateFeedingRecord: (id: string, type: FeedingType, at: Date, details?: FeedingDetails) => FeedingSession
  updateDiaperRecord: (id: string, type: DiaperType, at: Date) => DiaperChange
  addWeight: (weight: number, unit: WeightUnit, at?: Date) => WeightEntry
  removeWeight: (id: string) => void
  updateWeightRecord: (id: string, weight: number, unit: WeightUnit, at: Date) => WeightEntry
  latestWeight: () => WeightEntry | null
  allWeights: () => WeightEntry[]
  prevDay: () => void
  nextDay: () => void
  goToToday: () => void
  syncNow: () => Promise<void>
  addSuggestion: (value: string) => void
  removeSuggestion: (value: string) => void
  exportData: () => Promise<BackupData>
  importData: (data: BackupData) => Promise<void>
  getPeriodRecords: (start: Date, end: Date) => ReportRecords
}

export interface UseTracker extends TrackerState, TrackerActions {}

const TrackerContext = createContext<UseTracker | null>(null)

export function TrackerProvider({ children }: { children: ReactNode }) {
  const repos = useRef<SyncRepositories>(createSyncRepositories())
  const [baby, setBaby] = useState<Baby | null>(null)
  const [ready, setReady] = useState(false)
  const [offline, setOffline] = useState(false)
  const [foodSuggestions, setFoodSuggestions] = useState<string[]>([])
  const [version, setVersion] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()))

  const refresh = useCallback(() => {
    setOffline(repos.current.isOffline())
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    void repos.current.loadAll().then(() => {
      if (cancelled) {
        return
      }
      setBaby(repos.current.baby.get())
      setFoodSuggestions(repos.current.settings.get().foodSuggestions)
      setReady(true)
      refresh()
    })
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Live sync via Server-Sent Events: re-fetch when the server broadcasts an
  // update (from another device) or when the connection (re)establishes.
  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      return
    }
    let source: EventSource | null = null
    try {
      source = new EventSource('/api/events')
    } catch {
      return
    }
    let firstOpen = true
    const reload = () => {
      void repos.current.refreshFromServer().then((ok) => {
        if (!ok) {
          return
        }
        setBaby(repos.current.baby.get())
        setFoodSuggestions(repos.current.settings.get().foodSuggestions)
        refresh()
      })
    }
    source.onmessage = reload
    source.onopen = () => {
      if (firstOpen) {
        firstOpen = false
        return
      }
      reload()
    }
    return () => source?.close()
  }, [refresh])

  const syncNow = useCallback(async () => {
    const ok = await repos.current.syncNow()
    setOffline(!ok)
    refresh()
  }, [refresh])

  const addSuggestion = useCallback(
    (value: string) => {
      setFoodSuggestions(addFoodSuggestion(repos.current.settings, value))
      refresh()
    },
    [refresh],
  )

  const removeSuggestion = useCallback(
    (value: string) => {
      setFoodSuggestions(removeFoodSuggestion(repos.current.settings, value))
      refresh()
    },
    [refresh],
  )

  const exportData = useCallback(() => repos.current.exportData(), [])

  const importData = useCallback(
    async (data: BackupData) => {
      await repos.current.importData(data)
      setBaby(repos.current.baby.get())
      setFoodSuggestions(repos.current.settings.get().foodSuggestions)
      refresh()
    },
    [refresh],
  )

  const getPeriodRecords = useCallback((start: Date, end: Date): ReportRecords => {
    const inPeriod = (iso: string) => {
      const ms = new Date(iso).getTime()
      return ms >= start.getTime() && ms <= end.getTime()
    }
    return {
      sleeps: repos.current.sleep.getAll().filter((s) => inPeriod(s.startTime)),
      feedings: repos.current.feeding.getAll().filter((f) => inPeriod(f.time)),
      diapers: repos.current.diaper.getAll().filter((d) => inPeriod(d.time)),
    }
  }, [])

  const { start, end } = getDayRange(selectedDay)
  const day = useMemo(
    () =>
      getDayTimeline(
        repos.current.sleep,
        repos.current.feeding,
        repos.current.diaper,
        repos.current.weight,
        start,
        end,
      ),
    [version, selectedDay, start, end],
  )

  const settings = useMemo(() => repos.current.settings.get(), [version])

  const dailyAverages = useMemo(
    () =>
      getDailyAverages(
        repos.current.sleep,
        repos.current.feeding,
        repos.current.diaper,
        settings.averagesDays ?? DEFAULT_AVERAGES_DAYS,
      ),
    [version, settings],
  )

  const insights = useMemo(
    () => getInsights(repos.current.sleep, repos.current.feeding),
    [version, now],
  )

  const foodVariety = useMemo(() => getFoodVariety(repos.current.feeding), [version])

  const lastWakeEndMs = useMemo(() => {
    let last: number | null = null
    for (const s of repos.current.sleep.getAll()) {
      if (s.endTime) {
        const t = new Date(s.endTime).getTime()
        if (last === null || t > last) {
          last = t
        }
      }
    }
    return last
  }, [version])

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      const next: AppSettings = { ...repos.current.settings.get(), ...patch }
      repos.current.settings.save(next)
      setFoodSuggestions(next.foodSuggestions)
      refresh()
    },
    [refresh],
  )

  const activeSleep = useMemo(() => getActiveSleep(repos.current.sleep), [version, now])

  useEffect(() => {
    if (!activeSleep) {
      return
    }
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [activeSleep])

  const prevDay = useCallback(() => setSelectedDay((d) => startOfDay(shiftDays(d, -1))), [])
  const nextDay = useCallback(
    () =>
      setSelectedDay((d) => {
        const today = startOfDay(new Date())
        const candidate = startOfDay(shiftDays(d, 1))
        return candidate.getTime() <= today.getTime() ? candidate : d
      }),
    [],
  )
  const goToToday = useCallback(() => setSelectedDay(startOfDay(new Date())), [])

  const saveProfile = useCallback(
    (input: SaveBabyInput): Baby => {
      const saved = saveBabyProfile(repos.current.baby, input, baby)
      setBaby(saved)
      return saved
    },
    [baby],
  )

  const startSleepTimer = useCallback(
    (at?: Date): SleepSession => {
      const session = startSleep(repos.current.sleep, at)
      refresh()
      return session
    },
    [refresh],
  )

  const stopSleepTimer = useCallback((): SleepSession => {
    const active = getActiveSleep(repos.current.sleep)
    if (!active) {
      throw new Error('No active sleep timer')
    }
    const stopped = stopSleep(repos.current.sleep, active.id)
    refresh()
    return stopped
  }, [refresh])

  const logPastSleep = useCallback(
    (start: Date, end: Date): SleepSession => {
      const session = logCompletedSleep(repos.current.sleep, start, end)
      refresh()
      return session
    },
    [refresh],
  )

  const removeSleep = useCallback(
    (id: string) => {
      deleteSleep(repos.current.sleep, id)
      refresh()
    },
    [refresh],
  )

  const addFeeding = useCallback(
    (type: FeedingType, at?: Date, details?: FeedingDetails): FeedingSession => {
      const session = recordFeeding(repos.current.feeding, type, at, details)
      refresh()
      return session
    },
    [refresh],
  )

  const removeFeeding = useCallback(
    (id: string) => {
      deleteFeeding(repos.current.feeding, id)
      refresh()
    },
    [refresh],
  )

  const addDiaper = useCallback(
    (type: DiaperType, at?: Date): DiaperChange => {
      const change = recordDiaperChange(repos.current.diaper, type, at)
      refresh()
      return change
    },
    [refresh],
  )

  const removeDiaper = useCallback(
    (id: string) => {
      deleteDiaperChange(repos.current.diaper, id)
      refresh()
    },
    [refresh],
  )

  const updateSleepRecord = useCallback(
    (id: string, start: Date, end: Date | null): SleepSession => {
      const updated = updateSleepUseCase(repos.current.sleep, id, end === null ? { start } : { start, end })
      refresh()
      return updated
    },
    [refresh],
  )

  const updateFeedingRecord = useCallback(
    (id: string, type: FeedingType, at: Date, details?: FeedingDetails): FeedingSession => {
      const updated = updateFeedingUseCase(repos.current.feeding, id, { type, time: at, details })
      refresh()
      return updated
    },
    [refresh],
  )

  const updateDiaperRecord = useCallback(
    (id: string, type: DiaperType, at: Date): DiaperChange => {
      const updated = updateDiaperUseCase(repos.current.diaper, id, { type, time: at })
      refresh()
      return updated
    },
    [refresh],
  )

  const addWeight = useCallback(
    (weight: number, unit: WeightUnit, at?: Date): WeightEntry => {
      const entry = recordWeight(repos.current.weight, weight, unit, at)
      refresh()
      return entry
    },
    [refresh],
  )

  const removeWeight = useCallback(
    (id: string) => {
      deleteWeight(repos.current.weight, id)
      refresh()
    },
    [refresh],
  )

  const updateWeightRecord = useCallback(
    (id: string, weight: number, unit: WeightUnit, at: Date): WeightEntry => {
      const updated = updateWeight(repos.current.weight, id, { weight, unit, time: at })
      refresh()
      return updated
    },
    [refresh],
  )

  const latest = useCallback(() => latestWeight(repos.current.weight), [version])

  const allWeights = useCallback(() => repos.current.weight.getAll(), [version])

  const value: UseTracker = {
    ready,
    offline,
    baby,
    activeSleep,
    selectedDay,
    day,
    dayCounts: {
      sleeps: day.sleeps.length,
      feeds: day.feedings.length,
      diapers: day.diapers.length,
    },
    foodSuggestions,
    now,
    dailyAverages,
    insights,
    foodVariety,
    lastWakeEndMs,
    settings,
    saveProfile,
    updateSettings,
    startSleepTimer,
    stopSleepTimer,
    logPastSleep,
    removeSleep,
    addFeeding,
    removeFeeding,
    addDiaper,
    removeDiaper,
    updateSleepRecord,
    updateFeedingRecord,
    updateDiaperRecord,
    addWeight,
    removeWeight,
    updateWeightRecord,
    latestWeight: latest,
    allWeights,
    prevDay,
    nextDay,
    goToToday,
    syncNow,
    addSuggestion,
    removeSuggestion,
    exportData,
    importData,
    getPeriodRecords,
  }

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
}

export function useTracker(): UseTracker {
  const ctx = useContext(TrackerContext)
  if (!ctx) {
    throw new Error('useTracker must be used within TrackerProvider')
  }
  return ctx
}
