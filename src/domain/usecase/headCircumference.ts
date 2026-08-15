import type { HeadCircumferenceEntry, HeadCircumferenceUnit } from '../model/HeadCircumferenceEntry'
import type { HeadCircumferenceRepository } from '../repository/repositories'
import { newId } from '../util/id'

export function recordHeadCircumference(
  repo: HeadCircumferenceRepository,
  value: number,
  unit: HeadCircumferenceUnit,
  at: Date = new Date(),
): HeadCircumferenceEntry {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Head circumference must be a positive number')
  }
  if (unit !== 'cm' && unit !== 'in') {
    throw new Error('Choose cm or in')
  }
  if (at.getTime() > Date.now()) {
    throw new Error('Cannot log a head circumference in the future')
  }
  const entry: HeadCircumferenceEntry = { id: newId(), time: at.toISOString(), value, unit }
  repo.add(entry)
  return entry
}

export interface UpdateHeadCircumferenceInput {
  time?: Date
  value?: number
  unit?: HeadCircumferenceUnit
}

export function updateHeadCircumference(
  repo: HeadCircumferenceRepository,
  entryId: string,
  input: UpdateHeadCircumferenceInput,
): HeadCircumferenceEntry {
  const target = repo.getAll().find((h) => h.id === entryId)
  if (!target) {
    throw new Error('Head circumference entry not found')
  }
  const time = input.time ?? new Date(target.time)
  if (time.getTime() > Date.now()) {
    throw new Error('Cannot log a head circumference in the future')
  }
  const value = input.value ?? target.value
  const unit = input.unit ?? target.unit
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Head circumference must be a positive number')
  }
  if (unit !== 'cm' && unit !== 'in') {
    throw new Error('Choose cm or in')
  }
  const updated: HeadCircumferenceEntry = { id: target.id, time: time.toISOString(), value, unit }
  repo.update(updated)
  return updated
}

export function deleteHeadCircumference(repo: HeadCircumferenceRepository, entryId: string): void {
  repo.delete(entryId)
}

export function listHeadCircumferencesForDay(
  repo: HeadCircumferenceRepository,
  dayStart: Date,
  dayEnd: Date,
): HeadCircumferenceEntry[] {
  const startMs = dayStart.getTime()
  const endMs = dayEnd.getTime()
  return repo
    .getAll()
    .filter((h) => {
      const t = new Date(h.time).getTime()
      return t >= startMs && t < endMs
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}

/** The most recent head circumference entry across all records. */
export function latestHeadCircumference(repo: HeadCircumferenceRepository): HeadCircumferenceEntry | null {
  const all = repo.getAll()
  if (all.length === 0) {
    return null
  }
  return all.reduce((a, b) => (new Date(b.time).getTime() > new Date(a.time).getTime() ? b : a))
}
