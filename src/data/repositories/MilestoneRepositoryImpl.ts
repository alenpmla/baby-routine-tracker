import type { MilestoneEntry } from '../../domain/model/MilestoneEntry'
import type { MilestoneRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'milestones'

export class MilestoneRepositoryImpl implements MilestoneRepository {
  constructor(private readonly storage: Storage) {}

  private load(): MilestoneEntry[] {
    return this.storage.get<MilestoneEntry[]>(KEY) ?? []
  }

  private saveAll(entries: MilestoneEntry[]): void {
    this.storage.set<MilestoneEntry[]>(KEY, entries)
  }

  add(entry: MilestoneEntry): void {
    const all = this.load()
    all.push(entry)
    this.saveAll(all)
  }

  update(entry: MilestoneEntry): void {
    const all = this.load()
    const idx = all.findIndex((m) => m.id === entry.id)
    if (idx >= 0) {
      all[idx] = entry
    } else {
      all.push(entry)
    }
    this.saveAll(all)
  }

  getAll(): MilestoneEntry[] {
    return this.load()
  }

  delete(id: string): void {
    this.saveAll(this.load().filter((m) => m.id !== id))
  }
}
