import type { TemperatureEntry, TemperatureLocation, TemperatureUnit } from '../model/TemperatureEntry'
import type { TemperatureRepository } from '../repository/repositories'
import { newId } from '../util/id'

export const MIN_C = 30
export const MAX_C = 45
export const MIN_F = 86
export const MAX_F = 113

function inRange(temp: number, unit: TemperatureUnit): boolean {
  if (unit === 'c') {
    return temp >= MIN_C && temp <= MAX_C
  }
  return temp >= MIN_F && temp <= MAX_F
}

function validateTemperature(temp: number, unit: TemperatureUnit, location: TemperatureLocation | undefined): void {
  if (!Number.isFinite(temp)) {
    throw new Error('Temperature must be a number')
  }
  if (unit !== 'c' && unit !== 'f') {
    throw new Error('Choose °C or °F')
  }
  if (!inRange(temp, unit)) {
    throw new Error(`Temperature must be between ${MIN_C}–${MAX_C}°C / ${MIN_F}–${MAX_F}°F`)
  }
  if (
    location !== undefined &&
    location !== 'rectal' &&
    location !== 'axillary' &&
    location !== 'ear' &&
    location !== 'oral'
  ) {
    throw new Error('Choose a valid measurement location')
  }
}

export function recordTemperature(
  repo: TemperatureRepository,
  temp: number,
  unit: TemperatureUnit,
  at: Date = new Date(),
  location?: TemperatureLocation,
  notes?: string,
): TemperatureEntry {
  validateTemperature(temp, unit, location)
  if (at.getTime() > Date.now()) {
    throw new Error('Cannot log a temperature in the future')
  }
  const entry: TemperatureEntry = {
    id: newId(),
    time: at.toISOString(),
    temp,
    unit,
    ...(location ? { location } : {}),
    ...(notes && notes.trim() ? { notes: notes.trim() } : {}),
  }
  repo.add(entry)
  return entry
}

export interface UpdateTemperatureInput {
  time?: Date
  temp?: number
  unit?: TemperatureUnit
  location?: TemperatureLocation
  notes?: string
}

export function updateTemperature(
  repo: TemperatureRepository,
  entryId: string,
  input: UpdateTemperatureInput,
): TemperatureEntry {
  const target = repo.getAll().find((t) => t.id === entryId)
  if (!target) {
    throw new Error('Temperature entry not found')
  }
  const time = input.time ?? new Date(target.time)
  if (time.getTime() > Date.now()) {
    throw new Error('Cannot log a temperature in the future')
  }
  const temp = input.temp ?? target.temp
  const unit = input.unit ?? target.unit
  const location = input.location !== undefined ? input.location : target.location
  validateTemperature(temp, unit, location)
  const updated: TemperatureEntry = {
    id: target.id,
    time: time.toISOString(),
    temp,
    unit,
    ...(location ? { location } : {}),
    ...(input.notes !== undefined && input.notes.trim() ? { notes: input.notes.trim() } : {}),
  }
  repo.update(updated)
  return updated
}

export function deleteTemperature(repo: TemperatureRepository, entryId: string): void {
  repo.delete(entryId)
}

export function listTemperaturesForDay(
  repo: TemperatureRepository,
  dayStart: Date,
  dayEnd: Date,
): TemperatureEntry[] {
  const startMs = dayStart.getTime()
  const endMs = dayEnd.getTime()
  return repo
    .getAll()
    .filter((t) => {
      const ms = new Date(t.time).getTime()
      return ms >= startMs && ms < endMs
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}

/** The most recent temperature reading across all records. */
export function latestTemperature(repo: TemperatureRepository): TemperatureEntry | null {
  const all = repo.getAll()
  if (all.length === 0) {
    return null
  }
  return all.reduce((a, b) => (new Date(b.time).getTime() > new Date(a.time).getTime() ? b : a))
}

/** Normalize a temperature reading to Celsius. */
export function tempInC(temp: number, unit: TemperatureUnit): number {
  return unit === 'c' ? temp : (temp - 32) * (5 / 9)
}

/** Fever threshold in °C (used for the Home temperature chart). */
export const FEVER_THRESHOLD_C = 37.5

/**
 * Whether any temperature in the last `days` days (from `nowMs` back `days * 24h`) is at or
 * above the fever threshold (normalized to °C).
 */
export function hasFeverInWindow(
  entries: TemperatureEntry[],
  days: number,
  nowMs: number,
): boolean {
  const cutoff = nowMs - days * 24 * 60 * 60 * 1000
  return entries.some((t) => {
    const ms = new Date(t.time).getTime()
    return ms >= cutoff && ms <= nowMs && tempInC(t.temp, t.unit) >= FEVER_THRESHOLD_C
  })
}
