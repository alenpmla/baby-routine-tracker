import type { AppSettings } from '../domain/model/AppSettings'
import type { Baby } from '../domain/model/Baby'
import type { DiaperChange } from '../domain/model/DiaperChange'
import type { FeedingSession } from '../domain/model/FeedingSession'
import type { SleepSession } from '../domain/model/SleepSession'
import type { WeightEntry } from '../domain/model/WeightEntry'
import type {
  BabyRepository,
  DiaperRepository,
  FeedingRepository,
  SettingsRepository,
  SleepRepository,
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

export class MemorySettingsRepo implements SettingsRepository {
  settings: AppSettings = { foodSuggestions: [] }

  get(): AppSettings {
    return { foodSuggestions: [...this.settings.foodSuggestions] }
  }

  save(settings: AppSettings): void {
    this.settings = { foodSuggestions: [...settings.foodSuggestions] }
  }
}
