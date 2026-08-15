import type { MilestoneEntry } from '../model/MilestoneEntry'
import { MILESTONES, type MilestoneName } from '../model/MilestoneEntry'
import type { MilestoneRepository } from '../repository/repositories'
import { newId } from '../util/id'

export function recordMilestone(
  repo: MilestoneRepository,
  milestone: string,
  at: Date = new Date(),
  notes?: string,
): MilestoneEntry {
  if (typeof milestone !== 'string' || milestone.trim().length === 0) {
    throw new Error('Milestone name is required')
  }
  if (at.getTime() > Date.now()) {
    throw new Error('Cannot log a milestone in the future')
  }
  const entry: MilestoneEntry = {
    id: newId(),
    time: at.toISOString(),
    milestone: milestone.trim(),
    ...(notes && notes.trim() ? { notes: notes.trim() } : {}),
  }
  repo.add(entry)
  return entry
}

export interface UpdateMilestoneInput {
  time?: Date
  milestone?: string
  notes?: string
}

export function updateMilestone(
  repo: MilestoneRepository,
  entryId: string,
  input: UpdateMilestoneInput,
): MilestoneEntry {
  const target = repo.getAll().find((m) => m.id === entryId)
  if (!target) {
    throw new Error('Milestone entry not found')
  }
  const time = input.time ?? new Date(target.time)
  if (time.getTime() > Date.now()) {
    throw new Error('Cannot log a milestone in the future')
  }
  const milestone = input.milestone ?? target.milestone
  if (milestone.trim().length === 0) {
    throw new Error('Milestone name is required')
  }
  const updated: MilestoneEntry = {
    id: target.id,
    time: time.toISOString(),
    milestone: milestone.trim(),
    ...(input.notes !== undefined && input.notes.trim() ? { notes: input.notes.trim() } : {}),
  }
  repo.update(updated)
  return updated
}

export function deleteMilestone(repo: MilestoneRepository, entryId: string): void {
  repo.delete(entryId)
}

export function listMilestonesForDay(
  repo: MilestoneRepository,
  dayStart: Date,
  dayEnd: Date,
): MilestoneEntry[] {
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

/** Age at a given instant, expressed in whole months (floor of days / 30.44). */
export function ageInMonthsAt(dob: string, at: Date): number {
  const dobTime = new Date(`${dob}T00:00:00`).getTime()
  const ms = at.getTime() - dobTime
  if (Number.isNaN(dobTime) || ms < 0) {
    return 0
  }
  return Math.floor(ms / (30.44 * 24 * 60 * 60 * 1000))
}

export interface MilestoneFirst {
  milestone: MilestoneName
  achieved: boolean
  /** ISO-8601 UTC of the earliest record for this milestone, when achieved. */
  time?: string
  /** Age in months at achievement, when achieved. */
  ageMonths?: number
}

/**
 * Earliest recorded date per curated milestone, with the baby's age then.
 * Unachieved milestones return `achieved: false`. Reads all records once and
 * keeps the earliest `time` per milestone name (case-insensitive match on the
 * curated list so custom labels don't overwrite curated firsts).
 */
export function firstMilestones(
  repo: MilestoneRepository,
  dob: string,
): MilestoneFirst[] {
  const all = repo.getAll()
  const earliest = new Map<string, MilestoneEntry>()
  for (const entry of all) {
    const key = entry.milestone.trim().toLowerCase()
    if (!(MILESTONES as readonly string[]).some((m) => m.toLowerCase() === key)) {
      continue
    }
    const existing = earliest.get(key)
    if (!existing || new Date(entry.time).getTime() < new Date(existing.time).getTime()) {
      earliest.set(key, entry)
    }
  }
  return MILESTONES.map((milestone) => {
    const entry = earliest.get(milestone.toLowerCase())
    if (!entry) {
      return { milestone, achieved: false }
    }
    const at = new Date(entry.time)
    return { milestone, achieved: true, time: entry.time, ageMonths: ageInMonthsAt(dob, at) }
  })
}
