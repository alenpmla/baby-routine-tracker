import type { WeightEntry, WeightUnit } from '../model/WeightEntry'
import type { WeightRepository } from '../repository/repositories'
import { newId } from '../util/id'

export function recordWeight(
  repo: WeightRepository,
  weight: number,
  unit: WeightUnit,
  at: Date = new Date(),
): WeightEntry {
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error('Weight must be a positive number')
  }
  if (unit !== 'kg' && unit !== 'lb') {
    throw new Error('Choose kg or lb')
  }
  if (at.getTime() > Date.now()) {
    throw new Error('Cannot log a weight in the future')
  }
  const entry: WeightEntry = { id: newId(), time: at.toISOString(), weight, unit }
  repo.add(entry)
  return entry
}

export interface UpdateWeightInput {
  time?: Date
  weight?: number
  unit?: WeightUnit
}

export function updateWeight(
  repo: WeightRepository,
  entryId: string,
  input: UpdateWeightInput,
): WeightEntry {
  const target = repo.getAll().find((w) => w.id === entryId)
  if (!target) {
    throw new Error('Weight entry not found')
  }
  const time = input.time ?? new Date(target.time)
  if (time.getTime() > Date.now()) {
    throw new Error('Cannot log a weight in the future')
  }
  const weight = input.weight ?? target.weight
  const unit = input.unit ?? target.unit
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error('Weight must be a positive number')
  }
  if (unit !== 'kg' && unit !== 'lb') {
    throw new Error('Choose kg or lb')
  }
  const updated: WeightEntry = { id: target.id, time: time.toISOString(), weight, unit }
  repo.update(updated)
  return updated
}

export function deleteWeight(repo: WeightRepository, entryId: string): void {
  repo.delete(entryId)
}

export function listWeightsForDay(repo: WeightRepository, dayStart: Date, dayEnd: Date): WeightEntry[] {
  const startMs = dayStart.getTime()
  const endMs = dayEnd.getTime()
  return repo
    .getAll()
    .filter((w) => {
      const t = new Date(w.time).getTime()
      return t >= startMs && t < endMs
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}

/** The most recent weight entry across all records. */
export function latestWeight(repo: WeightRepository): WeightEntry | null {
  const all = repo.getAll()
  if (all.length === 0) {
    return null
  }
  return all.reduce((a, b) => (new Date(b.time).getTime() > new Date(a.time).getTime() ? b : a))
}
