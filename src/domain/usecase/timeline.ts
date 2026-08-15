import type { DiaperChange } from '../model/DiaperChange'
import type { FeedingSession } from '../model/FeedingSession'
import type { HeadCircumferenceEntry } from '../model/HeadCircumferenceEntry'
import type { MedicationEntry } from '../model/MedicationEntry'
import type { MilestoneEntry } from '../model/MilestoneEntry'
import type { SleepSession } from '../model/SleepSession'
import type { TeethingDay } from '../model/TeethingDay'
import type { TemperatureEntry } from '../model/TemperatureEntry'
import type { ToothEntry } from '../model/ToothEntry'
import type { WeightEntry } from '../model/WeightEntry'
import type {
  DiaperRepository,
  FeedingRepository,
  HeadCircumferenceRepository,
  MedicationRepository,
  MilestoneRepository,
  SleepRepository,
  TeethingDayRepository,
  TemperatureRepository,
  ToothRepository,
  WeightRepository,
} from '../repository/repositories'
import { listDiaperChangesForDay } from './diaper'
import { listFeedingsForDay } from './feeding'
import { listHeadCircumferencesForDay } from './headCircumference'
import { listMedicationsForDay } from './medication'
import { listMilestonesForDay } from './milestone'
import { listSleepsForDay, sleepTotalsByKind, type SleepTotalsByKind } from './sleep'
import { listTeethForDay } from './teeth'
import { listTeethingDaysForDay } from './teething'
import { listTemperaturesForDay } from './temperature'
import { listWeightsForDay } from './weight'

export type TimelineEvent =
  | { kind: 'sleep'; id: string; time: string; data: SleepSession; mode?: 'start' | 'end' }
  | { kind: 'feeding'; id: string; time: string; data: FeedingSession }
  | { kind: 'diaper'; id: string; time: string; data: DiaperChange }

export interface DaySleepTotals extends SleepTotalsByKind {
  totalMs: number
}

export interface DayTimeline {
  sleeps: SleepSession[]
  feedings: FeedingSession[]
  diapers: DiaperChange[]
  weights: WeightEntry[]
  headCircumferences: HeadCircumferenceEntry[]
  medications: MedicationEntry[]
  temperatures: TemperatureEntry[]
  milestones: MilestoneEntry[]
  teeth: ToothEntry[]
  teethingDays: TeethingDay[]
  sleepTotals: DaySleepTotals
  events: TimelineEvent[]
}

export function getDayTimeline(
  sleepRepo: SleepRepository,
  feedingRepo: FeedingRepository,
  diaperRepo: DiaperRepository,
  weightRepo: WeightRepository,
  headCircumferenceRepo: HeadCircumferenceRepository,
  medicationRepo: MedicationRepository,
  temperatureRepo: TemperatureRepository,
  milestoneRepo: MilestoneRepository,
  toothRepo: ToothRepository,
  teethingDayRepo: TeethingDayRepository,
  dayStart: Date,
  dayEnd: Date,
): DayTimeline {
  const sleeps = listSleepsForDay(sleepRepo, dayStart, dayEnd)
  const feedings = listFeedingsForDay(feedingRepo, dayStart, dayEnd)
  const diapers = listDiaperChangesForDay(diaperRepo, dayStart, dayEnd)
  const weights = listWeightsForDay(weightRepo, dayStart, dayEnd)
  const headCircumferences = listHeadCircumferencesForDay(headCircumferenceRepo, dayStart, dayEnd)
  const medications = listMedicationsForDay(medicationRepo, dayStart, dayEnd)
  const temperatures = listTemperaturesForDay(temperatureRepo, dayStart, dayEnd)
  const milestones = listMilestonesForDay(milestoneRepo, dayStart, dayEnd)
  const teeth = listTeethForDay(toothRepo, dayStart, dayEnd)
  const teethingDays = listTeethingDaysForDay(teethingDayRepo, dayStart)
  const split = sleepTotalsByKind(sleeps)

  const events: TimelineEvent[] = [
    ...sleeps.map<TimelineEvent>((s) => ({ kind: 'sleep', id: s.id, time: s.startTime, data: s })),
    ...feedings.map<TimelineEvent>((f) => ({ kind: 'feeding', id: f.id, time: f.time, data: f })),
    ...diapers.map<TimelineEvent>((d) => ({ kind: 'diaper', id: d.id, time: d.time, data: d })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return {
    sleeps,
    feedings,
    diapers,
    weights,
    headCircumferences,
    medications,
    temperatures,
    milestones,
    teeth,
    teethingDays,
    sleepTotals: { ...split, totalMs: split.nightMs + split.napMs },
    events,
  }
}
