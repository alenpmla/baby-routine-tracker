import type { AppSettings } from '../domain/model/AppSettings'
import type { Baby } from '../domain/model/Baby'
import type { DiaperChange } from '../domain/model/DiaperChange'
import type { FeedingSession } from '../domain/model/FeedingSession'
import type { HeadCircumferenceEntry } from '../domain/model/HeadCircumferenceEntry'
import type { MedicationEntry } from '../domain/model/MedicationEntry'
import type { MilestoneEntry } from '../domain/model/MilestoneEntry'
import type { SleepSession } from '../domain/model/SleepSession'
import type { TeethingDay } from '../domain/model/TeethingDay'
import type { TemperatureEntry } from '../domain/model/TemperatureEntry'
import type { ToothEntry } from '../domain/model/ToothEntry'
import type { WeightEntry } from '../domain/model/WeightEntry'
import type {
  BabyRepository,
  DiaperRepository,
  FeedingRepository,
  HeadCircumferenceRepository,
  MedicationRepository,
  MilestoneRepository,
  SettingsRepository,
  SleepRepository,
  TeethingDayRepository,
  TemperatureRepository,
  ToothRepository,
  WeightRepository,
} from '../domain/repository/repositories'

export class MemoryBabyRepo implements BabyRepository {
  private baby: Baby | null = null

  get(): Baby | null {
    return this.baby
  }

  save(baby: Baby): void {
    this.baby = { ...baby }
  }
}

export class MemorySleepRepo implements SleepRepository {
  sessions: SleepSession[] = []

  add(session: SleepSession): void {
    this.sessions.push({ ...session })
  }

  update(session: SleepSession): void {
    const idx = this.sessions.findIndex((s) => s.id === session.id)
    if (idx >= 0) {
      this.sessions[idx] = { ...session }
    } else {
      this.sessions.push({ ...session })
    }
  }

  getAll(): SleepSession[] {
    return this.sessions.map((s) => ({ ...s }))
  }

  getActive(): SleepSession | null {
    return this.sessions.find((s) => s.endTime === null) ?? null
  }

  delete(id: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== id)
  }
}

export class MemoryFeedingRepo implements FeedingRepository {
  sessions: FeedingSession[] = []

  add(session: FeedingSession): void {
    this.sessions.push({ ...session })
  }

  update(session: FeedingSession): void {
    const idx = this.sessions.findIndex((s) => s.id === session.id)
    if (idx >= 0) {
      this.sessions[idx] = { ...session }
    } else {
      this.sessions.push({ ...session })
    }
  }

  getAll(): FeedingSession[] {
    return this.sessions.map((s) => ({ ...s }))
  }

  delete(id: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== id)
  }
}

export class MemoryDiaperRepo implements DiaperRepository {
  changes: DiaperChange[] = []

  add(change: DiaperChange): void {
    this.changes.push({ ...change })
  }

  update(change: DiaperChange): void {
    const idx = this.changes.findIndex((c) => c.id === change.id)
    if (idx >= 0) {
      this.changes[idx] = { ...change }
    } else {
      this.changes.push({ ...change })
    }
  }

  getAll(): DiaperChange[] {
    return this.changes.map((c) => ({ ...c }))
  }

  delete(id: string): void {
    this.changes = this.changes.filter((c) => c.id !== id)
  }
}

export class MemoryWeightRepo implements WeightRepository {
  entries: WeightEntry[] = []

  add(entry: WeightEntry): void {
    this.entries.push({ ...entry })
  }

  update(entry: WeightEntry): void {
    const idx = this.entries.findIndex((w) => w.id === entry.id)
    if (idx >= 0) {
      this.entries[idx] = { ...entry }
    } else {
      this.entries.push({ ...entry })
    }
  }

  getAll(): WeightEntry[] {
    return this.entries.map((w) => ({ ...w }))
  }

  delete(id: string): void {
    this.entries = this.entries.filter((w) => w.id !== id)
  }
}

export class MemoryHeadCircumferenceRepo implements HeadCircumferenceRepository {
  entries: HeadCircumferenceEntry[] = []

  add(entry: HeadCircumferenceEntry): void {
    this.entries.push({ ...entry })
  }

  update(entry: HeadCircumferenceEntry): void {
    const idx = this.entries.findIndex((h) => h.id === entry.id)
    if (idx >= 0) {
      this.entries[idx] = { ...entry }
    } else {
      this.entries.push({ ...entry })
    }
  }

  getAll(): HeadCircumferenceEntry[] {
    return this.entries.map((h) => ({ ...h }))
  }

  delete(id: string): void {
    this.entries = this.entries.filter((h) => h.id !== id)
  }
}

export class MemoryMedicationRepo implements MedicationRepository {
  entries: MedicationEntry[] = []

  add(entry: MedicationEntry): void {
    this.entries.push({ ...entry })
  }

  update(entry: MedicationEntry): void {
    const idx = this.entries.findIndex((m) => m.id === entry.id)
    if (idx >= 0) {
      this.entries[idx] = { ...entry }
    } else {
      this.entries.push({ ...entry })
    }
  }

  getAll(): MedicationEntry[] {
    return this.entries.map((m) => ({ ...m }))
  }

  delete(id: string): void {
    this.entries = this.entries.filter((m) => m.id !== id)
  }
}

export class MemoryMilestoneRepo implements MilestoneRepository {
  entries: MilestoneEntry[] = []

  add(entry: MilestoneEntry): void {
    this.entries.push({ ...entry })
  }

  update(entry: MilestoneEntry): void {
    const idx = this.entries.findIndex((m) => m.id === entry.id)
    if (idx >= 0) {
      this.entries[idx] = { ...entry }
    } else {
      this.entries.push({ ...entry })
    }
  }

  getAll(): MilestoneEntry[] {
    return this.entries.map((m) => ({ ...m }))
  }

  delete(id: string): void {
    this.entries = this.entries.filter((m) => m.id !== id)
  }
}

export class MemoryTemperatureRepo implements TemperatureRepository {
  entries: TemperatureEntry[] = []

  add(entry: TemperatureEntry): void {
    this.entries.push({ ...entry })
  }

  update(entry: TemperatureEntry): void {
    const idx = this.entries.findIndex((t) => t.id === entry.id)
    if (idx >= 0) {
      this.entries[idx] = { ...entry }
    } else {
      this.entries.push({ ...entry })
    }
  }

  getAll(): TemperatureEntry[] {
    return this.entries.map((t) => ({ ...t }))
  }

  delete(id: string): void {
    this.entries = this.entries.filter((t) => t.id !== id)
  }
}

export class MemoryToothRepo implements ToothRepository {
  entries: ToothEntry[] = []

  add(entry: ToothEntry): void {
    this.entries.push({ ...entry })
  }

  update(entry: ToothEntry): void {
    const idx = this.entries.findIndex((t) => t.id === entry.id)
    if (idx >= 0) {
      this.entries[idx] = { ...entry }
    } else {
      this.entries.push({ ...entry })
    }
  }

  getAll(): ToothEntry[] {
    return this.entries.map((t) => ({ ...t }))
  }

  delete(id: string): void {
    this.entries = this.entries.filter((t) => t.id !== id)
  }
}

export class MemoryTeethingDayRepo implements TeethingDayRepository {
  days: TeethingDay[] = []

  add(day: TeethingDay): void {
    this.days.push({ ...day, symptoms: [...day.symptoms] })
  }

  update(day: TeethingDay): void {
    const idx = this.days.findIndex((d) => d.id === day.id)
    const next = { ...day, symptoms: [...day.symptoms] }
    if (idx >= 0) {
      this.days[idx] = next
    } else {
      this.days.push(next)
    }
  }

  getAll(): TeethingDay[] {
    return this.days.map((d) => ({ ...d, symptoms: [...d.symptoms] }))
  }

  delete(id: string): void {
    this.days = this.days.filter((d) => d.id !== id)
  }
}

export class MemorySettingsRepo implements SettingsRepository {
  settings: AppSettings = { foodSuggestions: [] }

  get(): AppSettings {
    return { foodSuggestions: [...this.settings.foodSuggestions] }
  }

  save(settings: AppSettings): void {
    this.settings = { foodSuggestions: [...settings.foodSuggestions] }
  }
}
