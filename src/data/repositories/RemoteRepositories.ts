import type { AppSettings } from '../../domain/model/AppSettings'
import type { Baby } from '../../domain/model/Baby'
import type { DiaperChange } from '../../domain/model/DiaperChange'
import type { FeedingSession } from '../../domain/model/FeedingSession'
import { normalizeFeeding } from '../../domain/model/FeedingSession'
import type { HeadCircumferenceEntry } from '../../domain/model/HeadCircumferenceEntry'
import type { MedicationEntry } from '../../domain/model/MedicationEntry'
import type { MilestoneEntry } from '../../domain/model/MilestoneEntry'
import type { SleepSession } from '../../domain/model/SleepSession'
import type { TeethingDay } from '../../domain/model/TeethingDay'
import type { TemperatureEntry } from '../../domain/model/TemperatureEntry'
import type { ToothEntry } from '../../domain/model/ToothEntry'
import type { WeightEntry } from '../../domain/model/WeightEntry'
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
} from '../../domain/repository/repositories'
import { HttpError, type Http } from '../http'
import type { Storage } from '../storage'

const PENDING_KEY = 'pending'
const BABY_KEY = 'baby'
const SLEEPS_KEY = 'sleeps'
const FEEDINGS_KEY = 'feedings'
const DIAPERS_KEY = 'diapers'
const SETTINGS_KEY = 'settings'
const WEIGHTS_KEY = 'weights'
const HEAD_CIRCUMFERENCES_KEY = 'headCircumferences'
const MEDICATIONS_KEY = 'medications'
const TEMPERATURES_KEY = 'temperatures'
const MILESTONES_KEY = 'milestones'
const TEETH_KEY = 'teeth'
const TEETHING_DAYS_KEY = 'teethingDays'

export type CollectionKey =
  | 'sleeps'
  | 'feedings'
  | 'diapers'
  | 'weights'
  | 'headCircumferences'
  | 'medications'
  | 'temperatures'
  | 'milestones'
  | 'teeth'
  | 'teethingDays'

export interface BackupData {
  version: 1
  exportedAt: string
  baby: Baby | null
  sleeps: SleepSession[]
  feedings: FeedingSession[]
  diapers: DiaperChange[]
  weights?: WeightEntry[]
  headCircumferences?: HeadCircumferenceEntry[]
  medications?: MedicationEntry[]
  temperatures?: TemperatureEntry[]
  milestones?: MilestoneEntry[]
  teeth?: ToothEntry[]
  teethingDays?: TeethingDay[]
  settings: AppSettings
}

export function isValidBackup(value: unknown): value is BackupData {
  if (!value || typeof value !== 'object') {
    return false
  }
  const d = value as Partial<BackupData>
  return (
    d.version === 1 &&
    (d.baby === null || (typeof d.baby === 'object' && d.baby !== null)) &&
    Array.isArray(d.sleeps) &&
    Array.isArray(d.feedings) &&
    Array.isArray(d.diapers) &&
    (d.weights === undefined || Array.isArray(d.weights)) &&
    (d.headCircumferences === undefined || Array.isArray(d.headCircumferences)) &&
    (d.medications === undefined || Array.isArray(d.medications)) &&
    (d.temperatures === undefined || Array.isArray(d.temperatures)) &&
    (d.milestones === undefined || Array.isArray(d.milestones)) &&
    (d.teeth === undefined || Array.isArray(d.teeth)) &&
    (d.teethingDays === undefined || Array.isArray(d.teethingDays)) &&
    typeof d.settings === 'object' &&
    d.settings !== null
  )
}

export type PendingOp =
  | { kind: 'setBaby'; baby: Baby }
  | { kind: 'setSettings'; settings: AppSettings }
  | { kind: 'add'; collection: CollectionKey; item: { id: string } }
  | { kind: 'delete'; collection: CollectionKey; id: string }

interface Cache {
  baby: Baby | null
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
  settings: AppSettings
}

export interface Repositories {
  baby: BabyRepository
  sleep: SleepRepository
  feeding: FeedingRepository
  diaper: DiaperRepository
  weight: WeightRepository
  headCircumference: HeadCircumferenceRepository
  medication: MedicationRepository
  temperature: TemperatureRepository
  milestone: MilestoneRepository
  tooth: ToothRepository
  teethingDay: TeethingDayRepository
  settings: SettingsRepository
}

export interface SyncRepositories extends Repositories {
  loadAll(): Promise<void>
  refreshFromServer(): Promise<boolean>
  syncNow(): Promise<boolean>
  isOffline(): boolean
  exportData(): Promise<BackupData>
  importData(data: BackupData): Promise<void>
}

export class RemoteRepositories implements SyncRepositories {
  private cache: Cache = {
    baby: null,
    sleeps: [],
    feedings: [],
    diapers: [],
    weights: [],
    headCircumferences: [],
    medications: [],
    temperatures: [],
    milestones: [],
    teeth: [],
    teethingDays: [],
    settings: { foodSuggestions: [] },
  }
  private offline = false

  readonly baby: BabyRepository
  readonly sleep: SleepRepository
  readonly feeding: FeedingRepository
  readonly diaper: DiaperRepository
  readonly weight: WeightRepository
  readonly headCircumference: HeadCircumferenceRepository
  readonly medication: MedicationRepository
  readonly temperature: TemperatureRepository
  readonly milestone: MilestoneRepository
  readonly tooth: ToothRepository
  readonly teethingDay: TeethingDayRepository
  readonly settings: SettingsRepository

  constructor(
    private readonly http: Http,
    private readonly storage: Storage,
  ) {
    this.baby = {
      get: () => this.cache.baby,
      save: (baby) => {
        void this.push({ kind: 'setBaby', baby }, () => {
          this.cache.baby = baby
        })
      },
    }
    this.sleep = {
      getAll: () => this.cache.sleeps,
      getActive: () => this.cache.sleeps.find((s) => s.endTime === null) ?? null,
      add: (session) => {
        void this.push({ kind: 'add', collection: 'sleeps', item: session }, () => {
          this.cache.sleeps.push(session)
        })
      },
      update: (session) => {
        void this.push({ kind: 'add', collection: 'sleeps', item: session }, () => {
          this.cache.sleeps = this.upsert(this.cache.sleeps, session) as SleepSession[]
        })
      },
      delete: (id) => {
        void this.push({ kind: 'delete', collection: 'sleeps', id }, () => {
          this.cache.sleeps = this.cache.sleeps.filter((s) => s.id !== id)
        })
      },
    }
    this.feeding = {
      getAll: () => this.cache.feedings,
      add: (session) => {
        void this.push({ kind: 'add', collection: 'feedings', item: session }, () => {
          this.cache.feedings.push(session)
        })
      },
      update: (session) => {
        void this.push({ kind: 'add', collection: 'feedings', item: session }, () => {
          this.cache.feedings = this.upsert(this.cache.feedings, session) as FeedingSession[]
        })
      },
      delete: (id) => {
        void this.push({ kind: 'delete', collection: 'feedings', id }, () => {
          this.cache.feedings = this.cache.feedings.filter((s) => s.id !== id)
        })
      },
    }
    this.diaper = {
      getAll: () => this.cache.diapers,
      add: (change) => {
        void this.push({ kind: 'add', collection: 'diapers', item: change }, () => {
          this.cache.diapers.push(change)
        })
      },
      update: (change) => {
        void this.push({ kind: 'add', collection: 'diapers', item: change }, () => {
          this.cache.diapers = this.upsert(this.cache.diapers, change) as DiaperChange[]
        })
      },
      delete: (id) => {
        void this.push({ kind: 'delete', collection: 'diapers', id }, () => {
          this.cache.diapers = this.cache.diapers.filter((c) => c.id !== id)
        })
      },
    }
    this.weight = {
      getAll: () => this.cache.weights,
      add: (entry) => {
        void this.push({ kind: 'add', collection: 'weights', item: entry }, () => {
          this.cache.weights.push(entry)
        })
      },
      update: (entry) => {
        void this.push({ kind: 'add', collection: 'weights', item: entry }, () => {
          this.cache.weights = this.upsert(this.cache.weights, entry) as WeightEntry[]
        })
      },
      delete: (id) => {
        void this.push({ kind: 'delete', collection: 'weights', id }, () => {
          this.cache.weights = this.cache.weights.filter((w) => w.id !== id)
        })
      },
    }
    this.headCircumference = {
      getAll: () => this.cache.headCircumferences,
      add: (entry) => {
        void this.push({ kind: 'add', collection: 'headCircumferences', item: entry }, () => {
          this.cache.headCircumferences.push(entry)
        })
      },
      update: (entry) => {
        void this.push({ kind: 'add', collection: 'headCircumferences', item: entry }, () => {
          this.cache.headCircumferences = this.upsert(this.cache.headCircumferences, entry) as HeadCircumferenceEntry[]
        })
      },
      delete: (id) => {
        void this.push({ kind: 'delete', collection: 'headCircumferences', id }, () => {
          this.cache.headCircumferences = this.cache.headCircumferences.filter((h) => h.id !== id)
        })
      },
    }
    this.medication = {
      getAll: () => this.cache.medications,
      add: (entry) => {
        void this.push({ kind: 'add', collection: 'medications', item: entry }, () => {
          this.cache.medications.push(entry)
        })
      },
      update: (entry) => {
        void this.push({ kind: 'add', collection: 'medications', item: entry }, () => {
          this.cache.medications = this.upsert(this.cache.medications, entry) as MedicationEntry[]
        })
      },
      delete: (id) => {
        void this.push({ kind: 'delete', collection: 'medications', id }, () => {
          this.cache.medications = this.cache.medications.filter((m) => m.id !== id)
        })
      },
    }
    this.temperature = {
      getAll: () => this.cache.temperatures,
      add: (entry) => {
        void this.push({ kind: 'add', collection: 'temperatures', item: entry }, () => {
          this.cache.temperatures.push(entry)
        })
      },
      update: (entry) => {
        void this.push({ kind: 'add', collection: 'temperatures', item: entry }, () => {
          this.cache.temperatures = this.upsert(this.cache.temperatures, entry) as TemperatureEntry[]
        })
      },
      delete: (id) => {
        void this.push({ kind: 'delete', collection: 'temperatures', id }, () => {
          this.cache.temperatures = this.cache.temperatures.filter((t) => t.id !== id)
        })
      },
    }
    this.milestone = {
      getAll: () => this.cache.milestones,
      add: (entry) => {
        void this.push({ kind: 'add', collection: 'milestones', item: entry }, () => {
          this.cache.milestones.push(entry)
        })
      },
      update: (entry) => {
        void this.push({ kind: 'add', collection: 'milestones', item: entry }, () => {
          this.cache.milestones = this.upsert(this.cache.milestones, entry) as MilestoneEntry[]
        })
      },
      delete: (id) => {
        void this.push({ kind: 'delete', collection: 'milestones', id }, () => {
          this.cache.milestones = this.cache.milestones.filter((m) => m.id !== id)
        })
      },
    }
    this.tooth = {
      getAll: () => this.cache.teeth,
      add: (entry) => {
        void this.push({ kind: 'add', collection: 'teeth', item: entry }, () => {
          this.cache.teeth.push(entry)
        })
      },
      update: (entry) => {
        void this.push({ kind: 'add', collection: 'teeth', item: entry }, () => {
          this.cache.teeth = this.upsert(this.cache.teeth, entry) as ToothEntry[]
        })
      },
      delete: (id) => {
        void this.push({ kind: 'delete', collection: 'teeth', id }, () => {
          this.cache.teeth = this.cache.teeth.filter((t) => t.id !== id)
        })
      },
    }
    this.teethingDay = {
      getAll: () => this.cache.teethingDays,
      add: (day) => {
        void this.push({ kind: 'add', collection: 'teethingDays', item: day }, () => {
          this.cache.teethingDays.push(day)
        })
      },
      update: (day) => {
        void this.push({ kind: 'add', collection: 'teethingDays', item: day }, () => {
          this.cache.teethingDays = this.upsert(this.cache.teethingDays, day) as TeethingDay[]
        })
      },
      delete: (id) => {
        void this.push({ kind: 'delete', collection: 'teethingDays', id }, () => {
          this.cache.teethingDays = this.cache.teethingDays.filter((d) => d.id !== id)
        })
      },
    }
    this.settings = {
      get: () => this.cache.settings,
      save: (settings) => {
        void this.push({ kind: 'setSettings', settings }, () => {
          this.cache.settings = settings
        })
      },
    }
  }

  private upsert(list: { id: string }[], item: { id: string }): { id: string }[] {
    const idx = list.findIndex((x) => x.id === item.id)
    if (idx >= 0) {
      list[idx] = item
    } else {
      list.push(item)
    }
    return list
  }

  isOffline(): boolean {
    return this.offline
  }

  private readPending(): PendingOp[] {
    return this.storage.get<PendingOp[]>(PENDING_KEY) ?? []
  }

  private writePending(ops: PendingOp[]): void {
    this.storage.set<PendingOp[]>(PENDING_KEY, ops)
  }

  private persistCache(): void {
    this.storage.set<Baby | null>(BABY_KEY, this.cache.baby)
    this.storage.set<SleepSession[]>(SLEEPS_KEY, this.cache.sleeps)
    this.storage.set<FeedingSession[]>(FEEDINGS_KEY, this.cache.feedings)
    this.storage.set<DiaperChange[]>(DIAPERS_KEY, this.cache.diapers)
    this.storage.set<WeightEntry[]>(WEIGHTS_KEY, this.cache.weights)
    this.storage.set<HeadCircumferenceEntry[]>(HEAD_CIRCUMFERENCES_KEY, this.cache.headCircumferences)
    this.storage.set<MedicationEntry[]>(MEDICATIONS_KEY, this.cache.medications)
    this.storage.set<TemperatureEntry[]>(TEMPERATURES_KEY, this.cache.temperatures)
    this.storage.set<MilestoneEntry[]>(MILESTONES_KEY, this.cache.milestones)
    this.storage.set<ToothEntry[]>(TEETH_KEY, this.cache.teeth)
    this.storage.set<TeethingDay[]>(TEETHING_DAYS_KEY, this.cache.teethingDays)
    this.storage.set<AppSettings>(SETTINGS_KEY, this.cache.settings)
  }

  /**
   * Fetches one collection. Returns `null` when the collection is not deployed
   * server-side (HTTP 404) so callers can preserve local data instead of
   * replacing it with an empty array. Any other error — including a hard
   * network failure (HttpError with no `status`) — is rethrown so offline
   * detection and the localStorage fallback still work.
   */
  private async fetchCollection<T>(key: CollectionKey): Promise<T[] | null> {
    const path = `/api/${key}`
    try {
      const res = await this.http.get<{ [k: string]: T[] }>(path)
      return res[key] ?? []
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        return null
      }
      throw err
    }
  }

  async loadAll(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('offline')
      }
      const [baby, sleeps, feedings, diapers, weights, headCircumferences, medications, temperatures, milestones, teeth, teethingDays, settings] = await Promise.all([
        this.http.get<{ baby: Baby | null }>('/api/baby'),
        this.fetchCollection<SleepSession>('sleeps'),
        this.fetchCollection<FeedingSession>('feedings'),
        this.fetchCollection<DiaperChange>('diapers'),
        this.fetchCollection<WeightEntry>('weights'),
        this.fetchCollection<HeadCircumferenceEntry>('headCircumferences'),
        this.fetchCollection<MedicationEntry>('medications'),
        this.fetchCollection<TemperatureEntry>('temperatures'),
        this.fetchCollection<MilestoneEntry>('milestones'),
        this.fetchCollection<ToothEntry>('teeth'),
        this.fetchCollection<TeethingDay>('teethingDays'),
        this.http.get<{ settings: AppSettings }>('/api/settings'),
      ])
      this.cache = {
        baby: baby.baby,
        sleeps: sleeps ?? this.storage.get<SleepSession[]>(SLEEPS_KEY) ?? [],
        feedings: (feedings ?? this.storage.get<FeedingSession[]>(FEEDINGS_KEY) ?? []).map(normalizeFeeding),
        diapers: diapers ?? this.storage.get<DiaperChange[]>(DIAPERS_KEY) ?? [],
        weights: weights ?? this.storage.get<WeightEntry[]>(WEIGHTS_KEY) ?? [],
        headCircumferences: headCircumferences ?? this.storage.get<HeadCircumferenceEntry[]>(HEAD_CIRCUMFERENCES_KEY) ?? [],
        medications: medications ?? this.storage.get<MedicationEntry[]>(MEDICATIONS_KEY) ?? [],
        temperatures: temperatures ?? this.storage.get<TemperatureEntry[]>(TEMPERATURES_KEY) ?? [],
        milestones: milestones ?? this.storage.get<MilestoneEntry[]>(MILESTONES_KEY) ?? [],
        teeth: teeth ?? this.storage.get<ToothEntry[]>(TEETH_KEY) ?? [],
        teethingDays: teethingDays ?? this.storage.get<TeethingDay[]>(TEETHING_DAYS_KEY) ?? [],
        settings: settings.settings,
      }
      this.offline = false
      await this.replayPending()
      this.persistCache()
    } catch {
      this.cache = {
        baby: this.storage.get<Baby | null>(BABY_KEY),
        sleeps: this.storage.get<SleepSession[]>(SLEEPS_KEY) ?? [],
        feedings: (this.storage.get<FeedingSession[]>(FEEDINGS_KEY) ?? []).map(normalizeFeeding),
        diapers: this.storage.get<DiaperChange[]>(DIAPERS_KEY) ?? [],
        weights: this.storage.get<WeightEntry[]>(WEIGHTS_KEY) ?? [],
        headCircumferences: this.storage.get<HeadCircumferenceEntry[]>(HEAD_CIRCUMFERENCES_KEY) ?? [],
        medications: this.storage.get<MedicationEntry[]>(MEDICATIONS_KEY) ?? [],
        temperatures: this.storage.get<TemperatureEntry[]>(TEMPERATURES_KEY) ?? [],
        milestones: this.storage.get<MilestoneEntry[]>(MILESTONES_KEY) ?? [],
        teeth: this.storage.get<ToothEntry[]>(TEETH_KEY) ?? [],
        teethingDays: this.storage.get<TeethingDay[]>(TEETHING_DAYS_KEY) ?? [],
        settings: this.storage.get<AppSettings>(SETTINGS_KEY) ?? { foodSuggestions: [] },
      }
      this.offline = true
    }
  }

  private async replayPending(): Promise<void> {
    const ops = this.readPending()
    if (ops.length === 0) {
      return
    }
    for (const op of ops) {
      if (op.kind === 'setBaby') {
        await this.http.put('/api/baby', op.baby)
      } else if (op.kind === 'setSettings') {
        await this.http.put('/api/settings', op.settings)
      } else if (op.kind === 'add' || op.kind === 'delete') {
        // A 404 means the collection isn't deployed server-side: skip the op
        // (dropped from the queue once replay completes) and keep going. Any
        // other failure aborts replay so the caller keeps the queue and flips
        // offline as today.
        await this.sendCollectionOp(op)
      }
    }
    this.writePending([])
    this.offline = false
  }

  /**
   * Sends a queued collection add/delete op to the server. Returns false when
   * the server answers HTTP 404 — the collection is not deployed server-side —
   * so callers can skip that op. Any other error, including a hard network
   * failure (HttpError with no `status`), is rethrown so offline handling is
   * preserved.
   */
  private async sendCollectionOp(
    op:
      | { kind: 'add'; collection: CollectionKey; item: { id: string } }
      | { kind: 'delete'; collection: CollectionKey; id: string },
  ): Promise<boolean> {
    try {
      if (op.kind === 'add') {
        await this.http.post(`/api/${op.collection}`, op.item)
      } else {
        await this.http.del(`/api/${op.collection}/${op.id}`)
      }
      return true
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        return false
      }
      throw err
    }
  }

  private async push(op: PendingOp, applyLocal: () => void): Promise<void> {
    applyLocal()
    try {
      if (op.kind === 'setBaby') {
        await this.http.put('/api/baby', op.baby)
      } else if (op.kind === 'setSettings') {
        await this.http.put('/api/settings', op.settings)
      } else {
        // A 404 on a collection write means the collection isn't deployed
        // server-side: the local cache already applied the op, so treat it as
        // accepted — don't queue it and don't flip offline. Real failures
        // (status undefined) still queue + go offline.
        await this.sendCollectionOp(op)
      }
      this.offline = false
      this.writePending(this.readPending().filter((p) => p !== op))
    } catch {
      const pending = this.readPending()
      pending.push(op)
      this.writePending(pending)
      this.offline = true
    }
    this.persistCache()
  }

  async syncNow(): Promise<boolean> {
    try {
      // Verify the server is actually reachable, even when there are no pending
      // ops to replay — otherwise an offline Retry would report success.
      await this.http.get('/api/health')
      await this.replayPending()
      this.offline = false
      return true
    } catch {
      this.offline = true
      return false
    }
  }

  /**
   * Re-fetches all data from the server without the offline fallback.
   * Used for live sync (SSE) where connectivity is already implied. Returns
   * true on success and clears the offline flag; returns false on failure
   * without altering cached data.
   */
  async refreshFromServer(): Promise<boolean> {
    try {
      const [baby, sleeps, feedings, diapers, weights, headCircumferences, medications, temperatures, milestones, teeth, teethingDays, settings] = await Promise.all([
        this.http.get<{ baby: Baby | null }>('/api/baby'),
        this.fetchCollection<SleepSession>('sleeps'),
        this.fetchCollection<FeedingSession>('feedings'),
        this.fetchCollection<DiaperChange>('diapers'),
        this.fetchCollection<WeightEntry>('weights'),
        this.fetchCollection<HeadCircumferenceEntry>('headCircumferences'),
        this.fetchCollection<MedicationEntry>('medications'),
        this.fetchCollection<TemperatureEntry>('temperatures'),
        this.fetchCollection<MilestoneEntry>('milestones'),
        this.fetchCollection<ToothEntry>('teeth'),
        this.fetchCollection<TeethingDay>('teethingDays'),
        this.http.get<{ settings: AppSettings }>('/api/settings'),
      ])
      this.cache = {
        baby: baby.baby,
        sleeps: sleeps ?? this.cache.sleeps,
        feedings: (feedings ?? this.cache.feedings).map(normalizeFeeding),
        diapers: diapers ?? this.cache.diapers,
        weights: weights ?? this.cache.weights,
        headCircumferences: headCircumferences ?? this.cache.headCircumferences,
        medications: medications ?? this.cache.medications,
        temperatures: temperatures ?? this.cache.temperatures,
        milestones: milestones ?? this.cache.milestones,
        teeth: teeth ?? this.cache.teeth,
        teethingDays: teethingDays ?? this.cache.teethingDays,
        settings: settings.settings,
      }
      this.offline = false
      await this.replayPending()
      this.persistCache()
      return true
    } catch {
      return false
    }
  }

  async exportData(): Promise<BackupData> {
    try {
      const [baby, sleeps, feedings, diapers, weights, headCircumferences, medications, temperatures, milestones, teeth, teethingDays, settings] = await Promise.all([
        this.http.get<{ baby: Baby | null }>('/api/baby'),
        this.fetchCollection<SleepSession>('sleeps'),
        this.fetchCollection<FeedingSession>('feedings'),
        this.fetchCollection<DiaperChange>('diapers'),
        this.fetchCollection<WeightEntry>('weights'),
        this.fetchCollection<HeadCircumferenceEntry>('headCircumferences'),
        this.fetchCollection<MedicationEntry>('medications'),
        this.fetchCollection<TemperatureEntry>('temperatures'),
        this.fetchCollection<MilestoneEntry>('milestones'),
        this.fetchCollection<ToothEntry>('teeth'),
        this.fetchCollection<TeethingDay>('teethingDays'),
        this.http.get<{ settings: AppSettings }>('/api/settings'),
      ])
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        baby: baby.baby,
        sleeps: sleeps ?? this.cache.sleeps,
        feedings: feedings ?? this.cache.feedings,
        diapers: diapers ?? this.cache.diapers,
        weights: weights ?? this.cache.weights,
        headCircumferences: headCircumferences ?? this.cache.headCircumferences,
        medications: medications ?? this.cache.medications,
        temperatures: temperatures ?? this.cache.temperatures,
        milestones: milestones ?? this.cache.milestones,
        teeth: teeth ?? this.cache.teeth,
        teethingDays: teethingDays ?? this.cache.teethingDays,
        settings: settings.settings,
      }
    } catch {
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        baby: this.cache.baby,
        sleeps: this.cache.sleeps,
        feedings: this.cache.feedings,
        diapers: this.cache.diapers,
        weights: this.cache.weights,
        headCircumferences: this.cache.headCircumferences,
        medications: this.cache.medications,
        temperatures: this.cache.temperatures,
        milestones: this.cache.milestones,
        teeth: this.cache.teeth,
        teethingDays: this.cache.teethingDays,
        settings: this.cache.settings,
      }
    }
  }

  async importData(data: BackupData): Promise<void> {
    await this.http.post('/api/import', data)
    await this.loadAll()
  }
}
