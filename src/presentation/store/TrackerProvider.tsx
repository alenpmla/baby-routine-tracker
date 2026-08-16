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
import type { SleepSession, SleepKind } from '../../domain/model/SleepSession'
import type { WeightEntry, WeightUnit } from '../../domain/model/WeightEntry'
import type { HeadCircumferenceEntry, HeadCircumferenceUnit } from '../../domain/model/HeadCircumferenceEntry'
import type { MedicationEntry, MedicationUnit } from '../../domain/model/MedicationEntry'
import type { MilestoneEntry } from '../../domain/model/MilestoneEntry'
import type { TeethingDay, TeethingSymptom } from '../../domain/model/TeethingDay'
import type { TemperatureEntry, TemperatureLocation, TemperatureUnit } from '../../domain/model/TemperatureEntry'
import type { ToothEntry, ToothName } from '../../domain/model/ToothEntry'
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
import {
  deleteMedication,
  recordMedication,
  updateMedication,
  type UpdateMedicationInput,
} from '../../domain/usecase/medication'
import {
  deleteTemperature,
  latestTemperature,
  recordTemperature,
  updateTemperature,
  type UpdateTemperatureInput,
} from '../../domain/usecase/temperature'
import {
  deleteMilestone,
  firstMilestones,
  recordMilestone,
  updateMilestone,
  type MilestoneFirst,
  type UpdateMilestoneInput,
} from '../../domain/usecase/milestone'
import {
  deleteHeadCircumference,
  recordHeadCircumference,
  updateHeadCircumference,
  latestHeadCircumference,
} from '../../domain/usecase/headCircumference'
import {
  deleteTooth,
  eruptedTeeth as eruptedTeethUseCase,
  recordTooth,
  updateTooth,
  type UpdateToothInput,
} from '../../domain/usecase/teeth'
import {
  deleteTeethingDay,
  recordTeethingDay,
  updateTeethingDay,
  type UpdateTeethingDayInput,
} from '../../domain/usecase/teething'
import { getDayTimeline } from '../../domain/usecase/timeline'
import { saveBabyProfile } from '../../domain/usecase/baby'
import type { SaveBabyInput } from '../../domain/usecase/baby'
import { addFoodSuggestion, removeFoodSuggestion } from '../../domain/usecase/settings'
import { getDailyAverages, type DailyAverages } from '../../domain/usecase/averages'
import { getInsights, type Insight } from '../../domain/usecase/insights'
import { getFoodVariety, type FoodVariety } from '../../domain/usecase/foodVariety'
import { getMostUsedFoods } from '../../domain/usecase/foodFrequency'
import { getTeethingSleepCorrelation, type TeethingSleepCorrelation } from '../../domain/usecase/sleepCorrelation'
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
  dayCounts: {
    sleeps: number
    feeds: number
    diapers: number
    headCircumferences: number
    teeth: number
    teethingDays: number
  }
  foodSuggestions: string[]
  dailyAverages: DailyAverages
  insights: Insight[]
  foodVariety: FoodVariety | null
  mostUsedFoods: string[]
  teethingSleepCorrelation: TeethingSleepCorrelation | null
  lastWakeEndMs: number | null
  settings: AppSettings
  now: Date
}

export interface TrackerActions {
  saveProfile: (input: SaveBabyInput) => Baby
  updateSettings: (patch: Partial<AppSettings>) => void
  startSleepTimer: (at?: Date, kind?: SleepKind) => SleepSession
  stopSleepTimer: () => SleepSession
  logPastSleep: (start: Date, end: Date, kind?: SleepKind) => SleepSession
  removeSleep: (id: string) => void
  addFeeding: (type: FeedingType, at?: Date, details?: FeedingDetails) => FeedingSession
  removeFeeding: (id: string) => void
  addDiaper: (type: DiaperType, at?: Date) => DiaperChange
  removeDiaper: (id: string) => void
  updateSleepRecord: (id: string, start: Date, end: Date | null, kind?: SleepKind) => SleepSession
  updateFeedingRecord: (id: string, type: FeedingType, at: Date, details?: FeedingDetails) => FeedingSession
  updateDiaperRecord: (id: string, type: DiaperType, at: Date) => DiaperChange
  addWeight: (weight: number, unit: WeightUnit, at?: Date) => WeightEntry
  removeWeight: (id: string) => void
  updateWeightRecord: (id: string, weight: number, unit: WeightUnit, at: Date) => WeightEntry
  latestWeight: () => WeightEntry | null
  allWeights: () => WeightEntry[]
  addHeadCircumference: (value: number, unit: HeadCircumferenceUnit, at?: Date) => HeadCircumferenceEntry
  removeHeadCircumference: (id: string) => void
  updateHeadCircumferenceRecord: (
    id: string,
    value: number,
    unit: HeadCircumferenceUnit,
    at: Date,
  ) => HeadCircumferenceEntry
  latestHeadCircumference: () => HeadCircumferenceEntry | null
  allHeadCircumferences: () => HeadCircumferenceEntry[]
  addMedication: (name: string, at?: Date, amount?: number, unit?: MedicationUnit, notes?: string) => MedicationEntry
  removeMedication: (id: string) => void
  updateMedicationRecord: (id: string, input: UpdateMedicationInput) => MedicationEntry
  addTemperature: (temp: number, unit: TemperatureUnit, at?: Date, location?: TemperatureLocation, notes?: string) => TemperatureEntry
  removeTemperature: (id: string) => void
  updateTemperatureRecord: (id: string, input: UpdateTemperatureInput) => TemperatureEntry
  latestTemperature: () => TemperatureEntry | null
  addMilestone: (milestone: string, at?: Date, notes?: string) => MilestoneEntry
  removeMilestone: (id: string) => void
  updateMilestoneRecord: (id: string, input: UpdateMilestoneInput) => MilestoneEntry
  allMilestones: () => MilestoneEntry[]
  firstMilestones: () => MilestoneFirst[]
  addTooth: (tooth: ToothName, at?: Date, notes?: string) => ToothEntry
  removeTooth: (id: string) => void
  updateToothRecord: (id: string, input: UpdateToothInput) => ToothEntry
  eruptedTeeth: () => ToothName[]
  addTeethingDay: (day: string, symptoms: TeethingSymptom[], notes?: string) => TeethingDay
  removeTeethingDay: (id: string) => void
  updateTeethingDayRecord: (id: string, input: UpdateTeethingDayInput) => TeethingDay
  prevDay: () => void
  nextDay: () => void
  goToToday: () => void
  syncNow: () => Promise<boolean>
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
      // On a normal online load the first open follows loadAll, so skip the
      // redundant reload. But if we were offline (e.g. the app loaded without
      // connectivity), the first open IS the reconnect — reload to merge queued
      // events and clear the offline banner.
      if (firstOpen && !repos.current.isOffline()) {
        firstOpen = false
        return
      }
      firstOpen = false
      reload()
    }
    return () => source?.close()
  }, [refresh])

  // Belt-and-suspenders: when the browser reports the network is back, trigger a
  // merge even if the SSE stream hasn't re-opened yet. Also reflect connectivity
  // loss proactively (offline event / navigator.onLine) so the banner appears even
  // when no request has failed yet.
  useEffect(() => {
    const setNetOffline = () => setOffline(true)
    const onOnline = () => {
      void repos.current.refreshFromServer().then((ok) => {
        if (!ok) {
          return
        }
        setBaby(repos.current.baby.get())
        setFoodSuggestions(repos.current.settings.get().foodSuggestions)
        refresh()
      })
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setNetOffline()
    }
    window.addEventListener('offline', setNetOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', setNetOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [refresh])

  const syncNow = useCallback(async (): Promise<boolean> => {
    const ok = await repos.current.syncNow()
    setOffline(!ok)
    refresh()
    return ok
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
    const inDay = (day: string) => {
      const ms = new Date(`${day}T00:00:00`).getTime()
      return ms >= start.getTime() && ms <= end.getTime()
    }
    return {
      sleeps: repos.current.sleep.getAll().filter((s) => inPeriod(s.startTime)),
      feedings: repos.current.feeding.getAll().filter((f) => inPeriod(f.time)),
      diapers: repos.current.diaper.getAll().filter((d) => inPeriod(d.time)),
      medications: repos.current.medication.getAll().filter((m) => inPeriod(m.time)),
      temperatures: repos.current.temperature.getAll().filter((t) => inPeriod(t.time)),
      weights: repos.current.weight.getAll().filter((w) => inPeriod(w.time)),
      headCircumferences: repos.current.headCircumference.getAll().filter((h) => inPeriod(h.time)),
      teeth: repos.current.tooth.getAll().filter((t) => inPeriod(t.time)),
      teethingDays: repos.current.teethingDay.getAll().filter((d) => inDay(d.day)),
      milestones: repos.current.milestone.getAll().filter((m) => inPeriod(m.time)),
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
        repos.current.headCircumference,
        repos.current.medication,
        repos.current.temperature,
        repos.current.milestone,
        repos.current.tooth,
        repos.current.teethingDay,
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

  const teethingSleepCorrelation = useMemo(
    () =>
      getTeethingSleepCorrelation(
        repos.current.teethingDay.getAll(),
        repos.current.sleep.getAll(),
        settings.averagesDays ?? DEFAULT_AVERAGES_DAYS,
        now,
      ),
    [version, settings, now],
  )

  const mostUsedFoods = useMemo(
    () => getMostUsedFoods(repos.current.feeding, foodSuggestions),
    [version, foodSuggestions],
  )

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
    (at?: Date, kind?: SleepKind): SleepSession => {
      const session = startSleep(repos.current.sleep, at, kind)
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
    (start: Date, end: Date, kind?: SleepKind): SleepSession => {
      const session = logCompletedSleep(repos.current.sleep, start, end, kind)
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
    (id: string, start: Date, end: Date | null, kind?: SleepKind): SleepSession => {
      const updated = updateSleepUseCase(
        repos.current.sleep,
        id,
        end === null ? { start, ...(kind ? { kind } : {}) } : { start, end, ...(kind ? { kind } : {}) },
      )
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

  const addHeadCircumference = useCallback(
    (value: number, unit: HeadCircumferenceUnit, at?: Date): HeadCircumferenceEntry => {
      const entry = recordHeadCircumference(repos.current.headCircumference, value, unit, at)
      refresh()
      return entry
    },
    [refresh],
  )

  const removeHeadCircumference = useCallback(
    (id: string) => {
      deleteHeadCircumference(repos.current.headCircumference, id)
      refresh()
    },
    [refresh],
  )

  const updateHeadCircumferenceRecord = useCallback(
    (id: string, value: number, unit: HeadCircumferenceUnit, at: Date): HeadCircumferenceEntry => {
      const updated = updateHeadCircumference(repos.current.headCircumference, id, { value, unit, time: at })
      refresh()
      return updated
    },
    [refresh],
  )

  const latestHC = useCallback(
    () => latestHeadCircumference(repos.current.headCircumference),
    [version],
  )

  const allHeadCircumferences = useCallback(
    () => repos.current.headCircumference.getAll(),
    [version],
  )

  const addMedication = useCallback(
    (name: string, at?: Date, amount?: number, unit?: MedicationUnit, notes?: string): MedicationEntry => {
      const entry = recordMedication(repos.current.medication, name, at, amount, unit, notes)
      refresh()
      return entry
    },
    [refresh],
  )

  const removeMedication = useCallback(
    (id: string) => {
      deleteMedication(repos.current.medication, id)
      refresh()
    },
    [refresh],
  )

  const updateMedicationRecord = useCallback(
    (id: string, input: UpdateMedicationInput): MedicationEntry => {
      const updated = updateMedication(repos.current.medication, id, input)
      refresh()
      return updated
    },
    [refresh],
  )

  const addTemperature = useCallback(
    (temp: number, unit: TemperatureUnit, at?: Date, location?: TemperatureLocation, notes?: string): TemperatureEntry => {
      const entry = recordTemperature(repos.current.temperature, temp, unit, at, location, notes)
      refresh()
      return entry
    },
    [refresh],
  )

  const removeTemperature = useCallback(
    (id: string) => {
      deleteTemperature(repos.current.temperature, id)
      refresh()
    },
    [refresh],
  )

  const updateTemperatureRecord = useCallback(
    (id: string, input: UpdateTemperatureInput): TemperatureEntry => {
      const updated = updateTemperature(repos.current.temperature, id, input)
      refresh()
      return updated
    },
    [refresh],
  )

  const latestTemp = useCallback(
    () => latestTemperature(repos.current.temperature),
    [version],
  )

  const addMilestone = useCallback(
    (milestone: string, at?: Date, notes?: string): MilestoneEntry => {
      const entry = recordMilestone(repos.current.milestone, milestone, at, notes)
      refresh()
      return entry
    },
    [refresh],
  )

  const removeMilestone = useCallback(
    (id: string) => {
      deleteMilestone(repos.current.milestone, id)
      refresh()
    },
    [refresh],
  )

  const updateMilestoneRecord = useCallback(
    (id: string, input: UpdateMilestoneInput): MilestoneEntry => {
      const updated = updateMilestone(repos.current.milestone, id, input)
      refresh()
      return updated
    },
    [refresh],
  )

  const allMilestones = useCallback(() => repos.current.milestone.getAll(), [version])

  const firsts = useCallback(
    () => firstMilestones(repos.current.milestone, baby?.dob ?? ''),
    [version, baby],
  )

  const addTooth = useCallback(
    (tooth: ToothName, at?: Date, notes?: string): ToothEntry => {
      const entry = recordTooth(repos.current.tooth, tooth, at, notes)
      refresh()
      return entry
    },
    [refresh],
  )

  const removeTooth = useCallback(
    (id: string) => {
      deleteTooth(repos.current.tooth, id)
      refresh()
    },
    [refresh],
  )

  const updateToothRecord = useCallback(
    (id: string, input: UpdateToothInput): ToothEntry => {
      const updated = updateTooth(repos.current.tooth, id, input)
      refresh()
      return updated
    },
    [refresh],
  )

  const erupted = useCallback(() => eruptedTeethUseCase(repos.current.tooth), [version])

  const addTeethingDay = useCallback(
    (day: string, symptoms: TeethingSymptom[], notes?: string): TeethingDay => {
      const entry = recordTeethingDay(repos.current.teethingDay, day, symptoms, notes)
      refresh()
      return entry
    },
    [refresh],
  )

  const removeTeethingDay = useCallback(
    (id: string) => {
      deleteTeethingDay(repos.current.teethingDay, id)
      refresh()
    },
    [refresh],
  )

  const updateTeethingDayRecord = useCallback(
    (id: string, input: UpdateTeethingDayInput): TeethingDay => {
      const updated = updateTeethingDay(repos.current.teethingDay, id, input)
      refresh()
      return updated
    },
    [refresh],
  )

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
      headCircumferences: day.headCircumferences.length,
      teeth: day.teeth.length,
      teethingDays: day.teethingDays.length,
    },
    foodSuggestions,
    now,
    dailyAverages,
    insights,
    foodVariety,
    mostUsedFoods,
    teethingSleepCorrelation,
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
    addHeadCircumference,
    removeHeadCircumference,
    updateHeadCircumferenceRecord,
    latestHeadCircumference: latestHC,
    allHeadCircumferences,
    addMedication,
    removeMedication,
    updateMedicationRecord,
    addTemperature,
    removeTemperature,
    updateTemperatureRecord,
    latestTemperature: latestTemp,
    addMilestone,
    removeMilestone,
    updateMilestoneRecord,
    allMilestones,
    firstMilestones: firsts,
    addTooth,
    removeTooth,
    updateToothRecord,
    eruptedTeeth: erupted,
    addTeethingDay,
    removeTeethingDay,
    updateTeethingDayRecord,
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
