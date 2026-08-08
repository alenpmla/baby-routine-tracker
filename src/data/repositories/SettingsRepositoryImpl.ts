import type { AppSettings } from '../../domain/model/AppSettings'
import type { SettingsRepository } from '../../domain/repository/repositories'
import type { Storage } from '../storage'

const KEY = 'settings'

export class SettingsRepositoryImpl implements SettingsRepository {
  constructor(private readonly storage: Storage) {}

  get(): AppSettings {
    const stored = this.storage.get<AppSettings>(KEY)
    return { foodSuggestions: Array.isArray(stored?.foodSuggestions) ? stored.foodSuggestions : [] }
  }

  save(settings: AppSettings): void {
    this.storage.set<AppSettings>(KEY, settings)
  }
}
