import type { Baby } from '../../domain/model/Baby'
import type { BabyRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'baby'

export class BabyRepositoryImpl implements BabyRepository {
  constructor(private readonly storage: Storage) {}

  get(): Baby | null {
    return this.storage.get<Baby>(KEY)
  }

  save(baby: Baby): void {
    this.storage.set<Baby>(KEY, baby)
  }
}
