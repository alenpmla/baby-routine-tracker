import type { Storage } from '../storage'
import { LocalStorage } from '../storage'
import { BabyRepositoryImpl } from './BabyRepositoryImpl'
import { DiaperRepositoryImpl } from './DiaperRepositoryImpl'
import { FeedingRepositoryImpl } from './FeedingRepositoryImpl'
import { HeadCircumferenceRepositoryImpl } from './HeadCircumferenceRepositoryImpl'
import { MedicationRepositoryImpl } from './MedicationRepositoryImpl'
import { MilestoneRepositoryImpl } from './MilestoneRepositoryImpl'
import { SettingsRepositoryImpl } from './SettingsRepositoryImpl'
import { SleepRepositoryImpl } from './SleepRepositoryImpl'
import { TeethingDayRepositoryImpl } from './TeethingDayRepositoryImpl'
import { TemperatureRepositoryImpl } from './TemperatureRepositoryImpl'
import { ToothRepositoryImpl } from './ToothRepositoryImpl'
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
    headCircumference: new HeadCircumferenceRepositoryImpl(storage),
    medication: new MedicationRepositoryImpl(storage),
    temperature: new TemperatureRepositoryImpl(storage),
    milestone: new MilestoneRepositoryImpl(storage),
    tooth: new ToothRepositoryImpl(storage),
    teethingDay: new TeethingDayRepositoryImpl(storage),
    settings: new SettingsRepositoryImpl(storage),
  }
}

export function createSyncRepositories(): SyncRepositories {
  return new RemoteRepositories(new FetchHttp(), new LocalStorage())
}
