import type { SleepSession } from '../../domain/model/SleepSession'
import type { SleepRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'sleeps'

export class SleepRepositoryImpl implements SleepRepository {
  constructor(private readonly storage: Storage) {}

  private load(): SleepSession[] {
    return this.storage.get<SleepSession[]>(KEY) ?? []
  }

  private saveAll(sessions: SleepSession[]): void {
    this.storage.set<SleepSession[]>(KEY, sessions)
  }

  add(session: SleepSession): void {
    const all = this.load()
    all.push(session)
    this.saveAll(all)
  }

  update(session: SleepSession): void {
    const all = this.load()
    const idx = all.findIndex((s) => s.id === session.id)
    if (idx >= 0) {
      all[idx] = session
    } else {
      all.push(session)
    }
    this.saveAll(all)
  }

  getAll(): SleepSession[] {
    return this.load()
  }

  getActive(): SleepSession | null {
    return this.load().find((s) => s.endTime === null) ?? null
  }

  delete(id: string): void {
    this.saveAll(this.load().filter((s) => s.id !== id))
  }
}
