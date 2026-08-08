import type { Storage } from '../storage'
import { LocalStorage } from '../storage'
import { BabyRepositoryImpl } from './BabyRepositoryImpl'
import { DiaperRepositoryImpl } from './DiaperRepositoryImpl'
import { FeedingRepositoryImpl } from './FeedingRepositoryImpl'
import { SettingsRepositoryImpl } from './SettingsRepositoryImpl'
import { SleepRepositoryImpl } from './SleepRepositoryImpl'
import { WeightRepositoryImpl } from './WeightRepositoryImpl'
import { FetchHttp } from '../http'
import {
  RemoteRepositories,
  type Repositories,
  type SyncRepositories,
} from './RemoteRepositories'

export type { Repositories, SyncRepositories }

export function createRepositories(storage: Storage): Repositories {
  return {
    baby: new BabyRepositoryImpl(storage),
    sleep: new SleepRepositoryImpl(storage),
    feeding: new FeedingRepositoryImpl(storage),
    diaper: new DiaperRepositoryImpl(storage),
    weight: new WeightRepositoryImpl(storage),
    settings: new SettingsRepositoryImpl(storage),
  }
}

export function createSyncRepositories(): SyncRepositories {
  return new RemoteRepositories(new FetchHttp(), new LocalStorage())
}
