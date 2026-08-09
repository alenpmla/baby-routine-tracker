export type ThemePreference = 'system' | 'light' | 'dark'
export type BottleUnit = 'ml' | 'oz'
export type SolidsUnit = 'g' | 'oz'
export interface SnapshotUnits {
  bottle: BottleUnit
  solids: SolidsUnit
}
export type AveragesDays = 7 | 15 | 30 | 60

export interface AppSettings {
  foodSuggestions: string[]
  theme?: ThemePreference
  snapshotUnits?: SnapshotUnits
  reportUnits?: SnapshotUnits
  averagesDays?: AveragesDays
  wakeWindowEnabled?: boolean
  wakeWindowMinutes?: number
}

export const DEFAULT_SNAPSHOT_UNITS: SnapshotUnits = { bottle: 'ml', solids: 'g' }
export const DEFAULT_AVERAGES_DAYS: AveragesDays = 30
export const DEFAULT_WAKE_WINDOW_MINUTES = 180
export const DEFAULT_WAKE_WINDOW_ENABLED = true
