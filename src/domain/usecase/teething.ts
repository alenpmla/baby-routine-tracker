import type { TeethingDay, TeethingSymptom } from '../model/TeethingDay'
import { isTeethingSymptom, TEETHING_SYMPTOMS } from '../model/TeethingDay'
import type { TeethingDayRepository } from '../repository/repositories'
import { newId } from '../util/id'

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** True when `day` is a real calendar date written as yyyy-mm-dd (e.g. rejects 2026-02-31). */
export function isValidDayString(day: string): boolean {
  if (!DAY_PATTERN.test(day)) {
    return false
  }
  const [year, month, date] = day.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, date))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === date
  )
}

/** The local calendar day as yyyy-mm-dd (the field is a local date-only string). */
function localDayString(at: Date = new Date()): string {
  const year = at.getFullYear()
  const month = String(at.getMonth() + 1).padStart(2, '0')
  const date = String(at.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

function assertValidDay(day: string): void {
  if (!isValidDayString(day)) {
    throw new Error('Day must be a valid yyyy-mm-dd date')
  }
  if (day > localDayString()) {
    throw new Error('Cannot log a teething day in the future')
  }
}

function assertSymptoms(symptoms: TeethingSymptom[]): void {
  if (!Array.isArray(symptoms) || symptoms.length === 0) {
    throw new Error('Choose at least one symptom')
  }
  if (symptoms.some((s) => !isTeethingSymptom(s))) {
    throw new Error(`Choose symptoms from the list (e.g. ${TEETHING_SYMPTOMS[0]})`)
  }
}

export function recordTeethingDay(
  repo: TeethingDayRepository,
  day: string,
  symptoms: TeethingSymptom[],
  notes?: string,
): TeethingDay {
  assertValidDay(day)
  assertSymptoms(symptoms)
  if (notes !== undefined && typeof notes !== 'string') {
    throw new Error('Notes must be a string')
  }
  if (repo.getAll().some((d) => d.day === day)) {
    throw new Error('A teething day already exists for this date')
  }
  const entry: TeethingDay = {
    id: newId(),
    day,
    symptoms: [...symptoms],
    ...(notes !== undefined ? { notes } : {}),
  }
  repo.add(entry)
  return entry
}

export interface UpdateTeethingDayInput {
  day?: string
  symptoms?: TeethingSymptom[]
  notes?: string
}

export function updateTeethingDay(
  repo: TeethingDayRepository,
  entryId: string,
  input: UpdateTeethingDayInput,
): TeethingDay {
  const target = repo.getAll().find((d) => d.id === entryId)
  if (!target) {
    throw new Error('Teething day not found')
  }
  const day = input.day ?? target.day
  assertValidDay(day)
  const symptoms = input.symptoms ?? target.symptoms
  assertSymptoms(symptoms)
  let notes = target.notes
  if (input.notes !== undefined) {
    if (typeof input.notes !== 'string') {
      throw new Error('Notes must be a string')
    }
    notes = input.notes
  }
  if (repo.getAll().some((d) => d.id !== entryId && d.day === day)) {
    throw new Error('A teething day already exists for this date')
  }
  const updated: TeethingDay = {
    id: target.id,
    day,
    symptoms: [...symptoms],
    ...(notes !== undefined ? { notes } : {}),
  }
  repo.update(updated)
  return updated
}

export function deleteTeethingDay(repo: TeethingDayRepository, entryId: string): void {
  repo.delete(entryId)
}

/** Teething days sorted newest first (most recent day first). */
export function listTeethingDays(repo: TeethingDayRepository): TeethingDay[] {
  return repo.getAll().sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
}

/** Teething days whose date-only `day` matches the given local calendar day. */
export function listTeethingDaysForDay(repo: TeethingDayRepository, dayStart: Date): TeethingDay[] {
  const day = localDayString(dayStart)
  return repo.getAll().filter((d) => d.day === day)
}
