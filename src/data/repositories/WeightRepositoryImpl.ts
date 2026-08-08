import type { WeightEntry } from '../../domain/model/WeightEntry'
import type { WeightRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'weights'

export class WeightRepositoryImpl implements WeightRepository {
  constructor(private readonly storage: Storage) {}

  private load(): WeightEntry[] {
    return this.storage.get<WeightEntry[]>(KEY) ?? []
  }

  private saveAll(entries: WeightEntry[]): void {
    this.storage.set<WeightEntry[]>(KEY, entries)
  }

  add(entry: WeightEntry): void {
    const all = this.load()
    all.push(entry)
    this.saveAll(all)
  }

  update(entry: WeightEntry): void {
    const all = this.load()
    const idx = all.findIndex((w) => w.id === entry.id)
    if (idx >= 0) {
      all[idx] = entry
    } else {
      all.push(entry)
    }
    this.saveAll(all)
  }

  getAll(): WeightEntry[] {
    return this.load()
  }

  delete(id: string): void {
    this.saveAll(this.load().filter((w) => w.id !== id))
  }
}
