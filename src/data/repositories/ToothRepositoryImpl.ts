import type { ToothEntry } from '../../domain/model/ToothEntry'
import type { ToothRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'teeth'

export class ToothRepositoryImpl implements ToothRepository {
  constructor(private readonly storage: Storage) {}

  private load(): ToothEntry[] {
    return this.storage.get<ToothEntry[]>(KEY) ?? []
  }

  private saveAll(entries: ToothEntry[]): void {
    this.storage.set<ToothEntry[]>(KEY, entries)
  }

  add(entry: ToothEntry): void {
    const all = this.load()
    all.push(entry)
    this.saveAll(all)
  }

  update(entry: ToothEntry): void {
    const all = this.load()
    const idx = all.findIndex((t) => t.id === entry.id)
    if (idx >= 0) {
      all[idx] = entry
    } else {
      all.push(entry)
    }
    this.saveAll(all)
  }

  getAll(): ToothEntry[] {
    return this.load()
  }

  delete(id: string): void {
    this.saveAll(this.load().filter((t) => t.id !== id))
  }
}
