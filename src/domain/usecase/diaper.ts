import type { DiaperChange, DiaperType } from '../model/DiaperChange'
import type { DiaperRepository } from '../repository/repositories'
import { newId } from '../util/id'

export function recordDiaperChange(repo: DiaperRepository, type: DiaperType, now: Date = new Date()): DiaperChange {
  if (now.getTime() > Date.now()) {
    throw new Error('Cannot record a diaper change in the future')
  }
  const change: DiaperChange = { id: newId(), time: now.toISOString(), type }
  repo.add(change)
  return change
}

export interface UpdateDiaperInput {
  type?: DiaperType
  time?: Date
}

export function updateDiaperChange(
  repo: DiaperRepository,
  changeId: string,
  input: UpdateDiaperInput,
): DiaperChange {
  const target = repo.getAll().find((c) => c.id === changeId)
  if (!target) {
    throw new Error('Diaper change not found')
  }
  const time = input.time ?? new Date(target.time)
  if (time.getTime() > Date.now()) {
    throw new Error('Cannot record a diaper change in the future')
  }
  const updated: DiaperChange = {
    id: target.id,
    time: time.toISOString(),
    type: input.type ?? target.type,
  }
  repo.update(updated)
  return updated
}

export function deleteDiaperChange(repo: DiaperRepository, changeId: string): void {
  repo.delete(changeId)
}

export function listDiaperChangesForDay(repo: DiaperRepository, dayStart: Date, dayEnd: Date): DiaperChange[] {
  const startMs = dayStart.getTime()
  const endMs = dayEnd.getTime()
  return repo
    .getAll()
    .filter((c) => {
      const t = new Date(c.time).getTime()
      return t >= startMs && t < endMs
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}
