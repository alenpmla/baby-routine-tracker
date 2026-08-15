export type TemperatureUnit = 'c' | 'f'

export type TemperatureLocation = 'rectal' | 'axillary' | 'ear' | 'oral'

export function isTemperatureUnit(value: string): value is TemperatureUnit {
  return value === 'c' || value === 'f'
}

export function isTemperatureLocation(value: string): value is TemperatureLocation {
  return value === 'rectal' || value === 'axillary' || value === 'ear' || value === 'oral'
}

export interface TemperatureEntry {
  id: string
  /** ISO-8601 UTC */
  time: string
  temp: number
  unit: TemperatureUnit
  location?: TemperatureLocation
  notes?: string
}
