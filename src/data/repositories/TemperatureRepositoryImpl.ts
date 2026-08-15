import type { TemperatureEntry } from '../../domain/model/TemperatureEntry'
import type { TemperatureRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'temperatures'

export class TemperatureRepositoryImpl implements TemperatureRepository {
  constructor(private readonly storage: Storage) {}

  private load(): TemperatureEntry[] {
    return this.storage.get<TemperatureEntry[]>(KEY) ?? []
  }

  private saveAll(entries: TemperatureEntry[]): void {
    this.storage.set<TemperatureEntry[]>(KEY, entries)
  }

  add(entry: TemperatureEntry): void {
    const all = this.load()
    all.push(entry)
    this.saveAll(all)
  }

  update(entry: TemperatureEntry): void {
    const all = this.load()
    const idx = all.findIndex((t) => t.id === entry.id)
    if (idx >= 0) {
      all[idx] = entry
    } else {
      all.push(entry)
    }
    this.saveAll(all)
  }

  getAll(): TemperatureEntry[] {
    return this.load()
  }

  delete(id: string): void {
    this.saveAll(this.load().filter((t) => t.id !== id))
  }
}
