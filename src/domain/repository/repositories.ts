import type { AppSettings } from '../model/AppSettings'
import type { Baby } from '../model/Baby'
import type { DiaperChange } from '../model/DiaperChange'
import type { FeedingSession } from '../model/FeedingSession'
import type { SleepSession } from '../model/SleepSession'
import type { WeightEntry } from '../model/WeightEntry'

export interface BabyRepository {
  get(): Baby | null
  save(baby: Baby): void
}

export interface SleepRepository {
  add(session: SleepSession): void
  update(session: SleepSession): void
  getAll(): SleepSession[]
  getActive(): SleepSession | null
  delete(id: string): void
}

export interface FeedingRepository {
  add(session: FeedingSession): void
  update(session: FeedingSession): void
  getAll(): FeedingSession[]
  delete(id: string): void
}

export interface DiaperRepository {
  add(change: DiaperChange): void
  update(change: DiaperChange): void
  getAll(): DiaperChange[]
  delete(id: string): void
}

export interface WeightRepository {
  add(entry: WeightEntry): void
  update(entry: WeightEntry): void
  getAll(): WeightEntry[]
  delete(id: string): void
}

export interface SettingsRepository {
  get(): AppSettings
  save(settings: AppSettings): void
}
