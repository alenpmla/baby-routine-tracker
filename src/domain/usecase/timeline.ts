import type { DiaperChange } from '../model/DiaperChange'
import type { FeedingSession } from '../model/FeedingSession'
import type { SleepSession } from '../model/SleepSession'
import type { WeightEntry } from '../model/WeightEntry'
import type {
  DiaperRepository,
  FeedingRepository,
  SleepRepository,
  WeightRepository,
} from '../repository/repositories'
import { listDiaperChangesForDay } from './diaper'
import { listFeedingsForDay } from './feeding'
import { listSleepsForDay } from './sleep'
import { listWeightsForDay } from './weight'

export type TimelineEvent =
  | { kind: 'sleep'; id: string; time: string; data: SleepSession }
  | { kind: 'feeding'; id: string; time: string; data: FeedingSession }
  | { kind: 'diaper'; id: string; time: string; data: DiaperChange }

export interface DayTimeline {
  sleeps: SleepSession[]
  feedings: FeedingSession[]
  diapers: DiaperChange[]
  weights: WeightEntry[]
  events: TimelineEvent[]
}

export function getDayTimeline(
  sleepRepo: SleepRepository,
  feedingRepo: FeedingRepository,
  diaperRepo: DiaperRepository,
  weightRepo: WeightRepository,
  dayStart: Date,
  dayEnd: Date,
): DayTimeline {
  const sleeps = listSleepsForDay(sleepRepo, dayStart, dayEnd)
  const feedings = listFeedingsForDay(feedingRepo, dayStart, dayEnd)
  const diapers = listDiaperChangesForDay(diaperRepo, dayStart, dayEnd)
  const weights = listWeightsForDay(weightRepo, dayStart, dayEnd)

  const events: TimelineEvent[] = [
    ...sleeps.map<TimelineEvent>((s) => ({ kind: 'sleep', id: s.id, time: s.startTime, data: s })),
    ...feedings.map<TimelineEvent>((f) => ({ kind: 'feeding', id: f.id, time: f.time, data: f })),
    ...diapers.map<TimelineEvent>((d) => ({ kind: 'diaper', id: d.id, time: d.time, data: d })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return { sleeps, feedings, diapers, weights, events }
}
