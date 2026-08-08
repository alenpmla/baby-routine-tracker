import type { DiaperChange } from '../../domain/model/DiaperChange'
import type { DiaperRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'diapers'

export class DiaperRepositoryImpl implements DiaperRepository {
  constructor(private readonly storage: Storage) {}

  private load(): DiaperChange[] {
    return this.storage.get<DiaperChange[]>(KEY) ?? []
  }

  private saveAll(changes: DiaperChange[]): void {
    this.storage.set<DiaperChange[]>(KEY, changes)
  }

  add(change: DiaperChange): void {
    const all = this.load()
    all.push(change)
    this.saveAll(all)
  }

  update(change: DiaperChange): void {
    const all = this.load()
    const idx = all.findIndex((c) => c.id === change.id)
    if (idx >= 0) {
      all[idx] = change
    } else {
      all.push(change)
    }
    this.saveAll(all)
  }

  getAll(): DiaperChange[] {
    return this.load()
  }

  delete(id: string): void {
    this.saveAll(this.load().filter((c) => c.id !== id))
  }
}
