import type { MedicationEntry, MedicationUnit } from '../model/MedicationEntry'
import type { MedicationRepository } from '../repository/repositories'
import { newId } from '../util/id'

function validateMedication(name: string, amount: number | undefined, unit: MedicationUnit): void {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Medication name is required')
  }
  if (amount !== undefined && !Number.isFinite(amount)) {
    throw new Error('Amount must be a number')
  }
  if (amount !== undefined && amount < 0) {
    throw new Error('Amount cannot be negative')
  }
  if (amount !== undefined && unit === '') {
    throw new Error('Choose a unit for the amount')
  }
  if (amount === undefined && unit !== '') {
    throw new Error('Amount is required when a unit is chosen')
  }
}

export function recordMedication(
  repo: MedicationRepository,
  name: string,
  at: Date = new Date(),
  amount?: number,
  unit: MedicationUnit = '',
  notes?: string,
): MedicationEntry {
  validateMedication(name, amount, unit)
  if (at.getTime() > Date.now()) {
    throw new Error('Cannot log a medication in the future')
  }
  const entry: MedicationEntry = {
    id: newId(),
    time: at.toISOString(),
    name: name.trim(),
    ...(amount !== undefined ? { amount } : {}),
    unit,
    ...(notes && notes.trim() ? { notes: notes.trim() } : {}),
  }
  repo.add(entry)
  return entry
}

export interface UpdateMedicationInput {
  time?: Date
  name?: string
  amount?: number
  unit?: MedicationUnit
  notes?: string
}

export function updateMedication(
  repo: MedicationRepository,
  entryId: string,
  input: UpdateMedicationInput,
): MedicationEntry {
  const target = repo.getAll().find((m) => m.id === entryId)
  if (!target) {
    throw new Error('Medication entry not found')
  }
  const time = input.time ?? new Date(target.time)
  if (time.getTime() > Date.now()) {
    throw new Error('Cannot log a medication in the future')
  }
  const name = input.name ?? target.name
  const amount = input.amount !== undefined ? input.amount : target.amount
  const unit = input.unit ?? target.unit
  validateMedication(name, amount, unit)
  const updated: MedicationEntry = {
    id: target.id,
    time: time.toISOString(),
    name: name.trim(),
    ...(amount !== undefined ? { amount } : {}),
    unit,
    ...(input.notes !== undefined && input.notes.trim() ? { notes: input.notes.trim() } : {}),
  }
  repo.update(updated)
  return updated
}

export function deleteMedication(repo: MedicationRepository, entryId: string): void {
  repo.delete(entryId)
}

export function listMedicationsForDay(
  repo: MedicationRepository,
  dayStart: Date,
  dayEnd: Date,
): MedicationEntry[] {
  const startMs = dayStart.getTime()
  const endMs = dayEnd.getTime()
  return repo
    .getAll()
    .filter((m) => {
      const t = new Date(m.time).getTime()
      return t >= startMs && t < endMs
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}
