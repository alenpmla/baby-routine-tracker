import type { AppSettings } from '../model/AppSettings'
import type { Baby } from '../model/Baby'
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

export interface HeadCircumferenceRepository {
  add(entry: HeadCircumferenceEntry): void
  update(entry: HeadCircumferenceEntry): void
  getAll(): HeadCircumferenceEntry[]
  delete(id: string): void
}

export interface MedicationRepository {
  add(entry: MedicationEntry): void
  update(entry: MedicationEntry): void
  getAll(): MedicationEntry[]
  delete(id: string): void
}

export interface MilestoneRepository {
  add(entry: MilestoneEntry): void
  update(entry: MilestoneEntry): void
  getAll(): MilestoneEntry[]
  delete(id: string): void
}

export interface TemperatureRepository {
  add(entry: TemperatureEntry): void
  update(entry: TemperatureEntry): void
  getAll(): TemperatureEntry[]
  delete(id: string): void
}

export interface ToothRepository {
  add(entry: ToothEntry): void
  update(entry: ToothEntry): void
  getAll(): ToothEntry[]
  delete(id: string): void
}

export interface TeethingDayRepository {
  add(day: TeethingDay): void
  update(day: TeethingDay): void
  getAll(): TeethingDay[]
  delete(id: string): void
}

export interface SettingsRepository {
  get(): AppSettings
  save(settings: AppSettings): void
}
