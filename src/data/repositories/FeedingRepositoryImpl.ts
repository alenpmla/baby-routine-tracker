import type { FeedingSession } from '../../domain/model/FeedingSession'
import { normalizeFeeding } from '../../domain/model/FeedingSession'
import type { FeedingRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'feedings'

export class FeedingRepositoryImpl implements FeedingRepository {
  constructor(private readonly storage: Storage) {}

  private load(): FeedingSession[] {
    return (this.storage.get<FeedingSession[]>(KEY) ?? []).map(normalizeFeeding)
  }

  private saveAll(sessions: FeedingSession[]): void {
    this.storage.set<FeedingSession[]>(KEY, sessions)
  }

  add(session: FeedingSession): void {
    const all = this.load()
    all.push(session)
    this.saveAll(all)
  }

  update(session: FeedingSession): void {
    const all = this.load()
    const idx = all.findIndex((s) => s.id === session.id)
    if (idx >= 0) {
      all[idx] = session
    } else {
      all.push(session)
    }
    this.saveAll(all)
  }

  getAll(): FeedingSession[] {
    return this.load()
  }

  delete(id: string): void {
    this.saveAll(this.load().filter((s) => s.id !== id))
  }
}
