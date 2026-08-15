import type { MedicationEntry } from '../../domain/model/MedicationEntry'
import type { MedicationRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'medications'

export class MedicationRepositoryImpl implements MedicationRepository {
  constructor(private readonly storage: Storage) {}

  private load(): MedicationEntry[] {
    return this.storage.get<MedicationEntry[]>(KEY) ?? []
  }

  private saveAll(entries: MedicationEntry[]): void {
    this.storage.set<MedicationEntry[]>(KEY, entries)
  }

  add(entry: MedicationEntry): void {
    const all = this.load()
    all.push(entry)
    this.saveAll(all)
  }

  update(entry: MedicationEntry): void {
    const all = this.load()
    const idx = all.findIndex((m) => m.id === entry.id)
    if (idx >= 0) {
      all[idx] = entry
    } else {
      all.push(entry)
    }
    this.saveAll(all)
  }

  getAll(): MedicationEntry[] {
    return this.load()
  }

  delete(id: string): void {
    this.saveAll(this.load().filter((m) => m.id !== id))
  }
}
