import type { TeethingDay } from '../../domain/model/TeethingDay'
import type { TeethingDayRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'teethingDays'

export class TeethingDayRepositoryImpl implements TeethingDayRepository {
  constructor(private readonly storage: Storage) {}

  private load(): TeethingDay[] {
    return this.storage.get<TeethingDay[]>(KEY) ?? []
  }

  private saveAll(days: TeethingDay[]): void {
    this.storage.set<TeethingDay[]>(KEY, days)
  }

  add(day: TeethingDay): void {
    const all = this.load()
    all.push(day)
    this.saveAll(all)
  }

  update(day: TeethingDay): void {
    const all = this.load()
    const idx = all.findIndex((d) => d.id === day.id)
    if (idx >= 0) {
      all[idx] = day
    } else {
      all.push(day)
    }
    this.saveAll(all)
  }

  getAll(): TeethingDay[] {
    return this.load()
  }

  delete(id: string): void {
    this.saveAll(this.load().filter((d) => d.id !== id))
  }
}
