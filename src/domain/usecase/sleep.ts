import type { SleepSession } from '../model/SleepSession'
import type { SleepRepository } from '../repository/repositories'
import { newId } from '../util/id'

export function startSleep(repo: SleepRepository, now: Date = new Date()): SleepSession {
  if (now.getTime() > Date.now()) {
    throw new Error('Cannot start a sleep in the future')
  }
  const existing = repo.getActive()
  if (existing) {
    throw new Error('A sleep timer is already running')
  }
  const session: SleepSession = { id: newId(), startTime: now.toISOString(), endTime: null }
  repo.add(session)
  return session
}

export function stopSleep(repo: SleepRepository, sessionId: string, now: Date = new Date()): SleepSession {
  const all = repo.getAll()
  const target = all.find((s) => s.id === sessionId)
  if (!target) {
    throw new Error('Sleep session not found')
  }
  if (target.endTime) {
    throw new Error('Sleep session is already stopped')
  }
  const stopped: SleepSession = { ...target, endTime: now.toISOString() }
  repo.delete(sessionId)
  repo.add(stopped)
  return stopped
}

export function deleteSleep(repo: SleepRepository, sessionId: string): void {
  repo.delete(sessionId)
}

export function logCompletedSleep(repo: SleepRepository, start: Date, end: Date): SleepSession {
  if (start.getTime() >= end.getTime()) {
    throw new Error('End time must be after start time')
  }
  if (end.getTime() > Date.now()) {
    throw new Error('Cannot log a sleep in the future')
  }
  const session: SleepSession = { id: newId(), startTime: start.toISOString(), endTime: end.toISOString() }
  repo.add(session)
  return session
}

export interface UpdateSleepInput {
  start?: Date
  end?: Date
}

export function updateSleep(repo: SleepRepository, sessionId: string, input: UpdateSleepInput): SleepSession {
  const target = repo.getAll().find((s) => s.id === sessionId)
  if (!target) {
    throw new Error('Sleep session not found')
  }
  if (target.endTime === null) {
    const start = input.start ?? new Date(target.startTime)
    if (start.getTime() > Date.now()) {
      throw new Error('Cannot start a sleep in the future')
    }
    const updated: SleepSession = {
      id: target.id,
      startTime: start.toISOString(),
      endTime: null,
    }
    repo.update(updated)
    return updated
  }
  const start = input.start ?? new Date(target.startTime)
  const end = input.end ?? new Date(target.endTime)
  if (start.getTime() >= end.getTime()) {
    throw new Error('End time must be after start time')
  }
  if (end.getTime() > Date.now()) {
    throw new Error('Cannot log a sleep in the future')
  }
  const updated: SleepSession = {
    id: target.id,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  }
  repo.update(updated)
  return updated
}

export function listSleepsForDay(repo: SleepRepository, dayStart: Date, dayEnd: Date): SleepSession[] {
  const startMs = dayStart.getTime()
  const endMs = dayEnd.getTime()
  return repo
    .getAll()
    .filter((s) => {
      if (s.endTime) {
        const end = toMs(s.endTime)
        return end >= startMs && end < endMs
      }
      const start = toMs(s.startTime)
      return start >= startMs && start < endMs
    })
    .sort((a, b) => {
      const anchorA = a.endTime ? toMs(a.endTime) : toMs(a.startTime)
      const anchorB = b.endTime ? toMs(b.endTime) : toMs(b.startTime)
      return anchorB - anchorA
    })
}

export function getActiveSleep(repo: SleepRepository): SleepSession | null {
  return repo.getActive()
}

function toMs(iso: string): number {
  return new Date(iso).getTime()
}
