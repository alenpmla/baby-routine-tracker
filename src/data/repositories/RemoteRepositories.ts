import type { AppSettings } from '../../domain/model/AppSettings'
import type { Baby } from '../../domain/model/Baby'
import type { DiaperChange } from '../../domain/model/DiaperChange'
import type { FeedingSession } from '../../domain/model/FeedingSession'
import { normalizeFeeding } from '../../domain/model/FeedingSession'
import type { SleepSession } from '../../domain/model/SleepSession'
import type { WeightEntry } from '../../domain/model/WeightEntry'
import type {
  BabyRepository,
  DiaperRepository,
  FeedingRepository,
  SettingsRepository,
  SleepRepository,
  WeightRepository,
} from '../../domain/repository/repositories'
import type { Http } from '../http'
import type { Storage } from '../storage'

const PENDING_KEY = 'pending'
const BABY_KEY = 'baby'
const SLEEPS_KEY = 'sleeps'
const FEEDINGS_KEY = 'feedings'
const DIAPERS_KEY = 'diapers'
const SETTINGS_KEY = 'settings'
const WEIGHTS_KEY = 'weights'

export type CollectionKey = 'sleeps' | 'feedings' | 'diapers' | 'weights'

export interface BackupData {
  version: 1
  exportedAt: string
  baby: Baby | null
  sleeps: SleepSession[]
  feedings: FeedingSession[]
  diapers: DiaperChange[]
  weights?: WeightEntry[]
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
  settings: AppSettings
}

export interface Repositories {
  baby: BabyRepository
  sleep: SleepRepository
  feeding: FeedingRepository
  diaper: DiaperRepository
  weight: WeightRepository
  settings: SettingsRepository
}

export interface SyncRepositories extends Repositories {
  loadAll(): Promise<void>
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
    settings: { foodSuggestions: [] },
  }
  private offline = false

  readonly baby: BabyRepository
  readonly sleep: SleepRepository
  readonly feeding: FeedingRepository
  readonly diaper: DiaperRepository
  readonly weight: WeightRepository
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
    this.storage.set<AppSettings>(SETTINGS_KEY, this.cache.settings)
  }

  async loadAll(): Promise<void> {
    try {
      const [baby, sleeps, feedings, diapers, weights, settings] = await Promise.all([
        this.http.get<{ baby: Baby | null }>('/api/baby'),
        this.http.get<{ sleeps: SleepSession[] }>('/api/sleeps'),
        this.http.get<{ feedings: FeedingSession[] }>('/api/feedings'),
        this.http.get<{ diapers: DiaperChange[] }>('/api/diapers'),
        this.http.get<{ weights: WeightEntry[] }>('/api/weights'),
        this.http.get<{ settings: AppSettings }>('/api/settings'),
      ])
      this.cache = {
        baby: baby.baby,
        sleeps: sleeps.sleeps,
        feedings: feedings.feedings.map(normalizeFeeding),
        diapers: diapers.diapers,
        weights: weights.weights,
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
      } else if (op.kind === 'add') {
        await this.http.post(`/api/${op.collection}`, op.item)
      } else {
        await this.http.del(`/api/${op.collection}/${op.id}`)
      }
    }
    this.writePending([])
    this.offline = false
  }

  private async push(op: PendingOp, applyLocal: () => void): Promise<void> {
    applyLocal()
    try {
      if (op.kind === 'setBaby') {
        await this.http.put('/api/baby', op.baby)
      } else if (op.kind === 'setSettings') {
        await this.http.put('/api/settings', op.settings)
      } else if (op.kind === 'add') {
        await this.http.post(`/api/${op.collection}`, op.item)
      } else {
        await this.http.del(`/api/${op.collection}/${op.id}`)
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
      await this.replayPending()
      return true
    } catch {
      this.offline = true
      return false
    }
  }

  async exportData(): Promise<BackupData> {
    try {
      const [baby, sleeps, feedings, diapers, weights, settings] = await Promise.all([
        this.http.get<{ baby: Baby | null }>('/api/baby'),
        this.http.get<{ sleeps: SleepSession[] }>('/api/sleeps'),
        this.http.get<{ feedings: FeedingSession[] }>('/api/feedings'),
        this.http.get<{ diapers: DiaperChange[] }>('/api/diapers'),
        this.http.get<{ weights: WeightEntry[] }>('/api/weights'),
        this.http.get<{ settings: AppSettings }>('/api/settings'),
      ])
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        baby: baby.baby,
        sleeps: sleeps.sleeps,
        feedings: feedings.feedings,
        diapers: diapers.diapers,
        weights: weights.weights,
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
        settings: this.cache.settings,
      }
    }
  }

  async importData(data: BackupData): Promise<void> {
    await this.http.post('/api/import', data)
    await this.loadAll()
  }
}
