import type { HeadCircumferenceEntry } from '../../domain/model/HeadCircumferenceEntry'
import type { HeadCircumferenceRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'headCircumferences'

export class HeadCircumferenceRepositoryImpl implements HeadCircumferenceRepository {
  constructor(private readonly storage: Storage) {}

  private load(): HeadCircumferenceEntry[] {
    return this.storage.get<HeadCircumferenceEntry[]>(KEY) ?? []
  }

  private saveAll(entries: HeadCircumferenceEntry[]): void {
    this.storage.set<HeadCircumferenceEntry[]>(KEY, entries)
  }

  add(entry: HeadCircumferenceEntry): void {
    const all = this.load()
    all.push(entry)
    this.saveAll(all)
  }

  update(entry: HeadCircumferenceEntry): void {
    const all = this.load()
    const idx = all.findIndex((h) => h.id === entry.id)
    if (idx >= 0) {
      all[idx] = entry
    } else {
      all.push(entry)
    }
    this.saveAll(all)
  }

  getAll(): HeadCircumferenceEntry[] {
    return this.load()
  }

  delete(id: string): void {
    this.saveAll(this.load().filter((h) => h.id !== id))
  }
}
