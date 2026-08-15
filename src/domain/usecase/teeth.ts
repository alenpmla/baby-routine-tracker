import type { ToothEntry, ToothName } from '../model/ToothEntry'
import { isToothName, TOOTH_NAMES } from '../model/ToothEntry'
import type { ToothRepository } from '../repository/repositories'
import { newId } from '../util/id'

export function recordTooth(
  repo: ToothRepository,
  tooth: ToothName,
  at: Date = new Date(),
  notes?: string,
): ToothEntry {
  if (!isToothName(tooth)) {
    throw new Error(`Choose a tooth from the list (e.g. ${TOOTH_NAMES[0]})`)
  }
  if (at.getTime() > Date.now()) {
    throw new Error('Cannot log a tooth eruption in the future')
  }
  if (notes !== undefined && typeof notes !== 'string') {
    throw new Error('Notes must be a string')
  }
  const entry: ToothEntry = {
    id: newId(),
    time: at.toISOString(),
    tooth,
    ...(notes !== undefined ? { notes } : {}),
  }
  repo.add(entry)
  return entry
}

export interface UpdateToothInput {
  time?: Date
  tooth?: ToothName
  notes?: string
}

export function updateTooth(
  repo: ToothRepository,
  entryId: string,
  input: UpdateToothInput,
): ToothEntry {
  const target = repo.getAll().find((t) => t.id === entryId)
  if (!target) {
    throw new Error('Tooth entry not found')
  }
  const time = input.time ?? new Date(target.time)
  if (time.getTime() > Date.now()) {
    throw new Error('Cannot log a tooth eruption in the future')
  }
  const tooth = input.tooth ?? target.tooth
  if (!isToothName(tooth)) {
    throw new Error(`Choose a tooth from the list (e.g. ${TOOTH_NAMES[0]})`)
  }
  let notes = target.notes
  if (input.notes !== undefined) {
    if (typeof input.notes !== 'string') {
      throw new Error('Notes must be a string')
    }
    notes = input.notes
  }
  const updated: ToothEntry = {
    id: target.id,
    time: time.toISOString(),
    tooth,
    ...(notes !== undefined ? { notes } : {}),
  }
  repo.update(updated)
  return updated
}

export function deleteTooth(repo: ToothRepository, entryId: string): void {
  repo.delete(entryId)
}

/** Tooth entries erupted within the given day window, newest first. */
export function listTeethForDay(
  repo: ToothRepository,
  dayStart: Date,
  dayEnd: Date,
): ToothEntry[] {
  const startMs = dayStart.getTime()
  const endMs = dayEnd.getTime()
  return repo
    .getAll()
    .filter((t) => {
      const time = new Date(t.time).getTime()
      return time >= startMs && time < endMs
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}

/** Unique teeth that have erupted, in the canonical tooth order (for the mouth chart). */
export function eruptedTeeth(repo: ToothRepository): ToothName[] {
  const erupted = new Set(repo.getAll().map((t) => t.tooth))
  return TOOTH_NAMES.filter((name) => erupted.has(name))
}
