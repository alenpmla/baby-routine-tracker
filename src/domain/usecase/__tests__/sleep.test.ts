import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  startSleep,
  stopSleep,
  deleteSleep,
  listSleepsForDay,
  getActiveSleep,
  logCompletedSleep,
  updateSleep,
} from '../sleep'
import { MemorySleepRepo } from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

afterEach(() => {
  vi.useRealTimers()
})

describe('sleep use cases', () => {
  it('starts an open session', () => {
    const repo = new MemorySleepRepo()
    const start = new Date(Date.now() - HOUR)
    const session = startSleep(repo, start)
    expect(session.endTime).toBeNull()
    expect(getActiveSleep(repo)?.id).toBe(session.id)
  })

  it('refuses to start a second timer while one is running', () => {
    const repo = new MemorySleepRepo()
    startSleep(repo, new Date(Date.now() - 2 * HOUR))
    expect(() => startSleep(repo, new Date(Date.now() - HOUR))).toThrow(/already running/i)
  })

  it('rejects a future start time', () => {
    const repo = new MemorySleepRepo()
    expect(() => startSleep(repo, new Date(Date.now() + HOUR))).toThrow(/future/i)
  })

  it('stops a session with an end time', () => {
    const repo = new MemorySleepRepo()
    const start = new Date(Date.now() - 2 * HOUR)
    const end = new Date(Date.now() - HOUR)
    const session = startSleep(repo, start)
    const stopped = stopSleep(repo, session.id, end)
    expect(stopped.endTime).toBe(end.toISOString())
    expect(getActiveSleep(repo)).toBeNull()
  })

  it('throws when stopping a session that is already stopped', () => {
    const repo = new MemorySleepRepo()
    const session = startSleep(repo, new Date(Date.now() - 2 * HOUR))
    stopSleep(repo, session.id, new Date(Date.now() - HOUR))
    expect(() => stopSleep(repo, session.id, new Date(Date.now() - HOUR / 2))).toThrow(/already stopped/i)
  })

  it('lists only completed sleeps inside the day window, newest first', () => {
    const repo = new MemorySleepRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)

    const morning = startSleep(repo, new Date(Date.now() - 6 * HOUR))
    stopSleep(repo, morning.id, new Date(Date.now() - 5 * HOUR))
    const nap = startSleep(repo, new Date(Date.now() - 3 * HOUR))
    stopSleep(repo, nap.id, new Date(Date.now() - 2 * HOUR))
    const old = startSleep(repo, new Date(Date.now() - 30 * HOUR))
    stopSleep(repo, old.id, new Date(Date.now() - 28 * HOUR))

    const listed = listSleepsForDay(repo, dayStart, dayEnd)
    expect(listed.map((s) => s.id)).toEqual([nap.id, morning.id])
  })

  it('deletes a session', () => {
    const repo = new MemorySleepRepo()
    const session = startSleep(repo)
    deleteSleep(repo, session.id)
    expect(repo.getAll()).toHaveLength(0)
  })

  it('logCompletedSleep requires end after start', () => {
    const repo = new MemorySleepRepo()
    expect(() =>
      logCompletedSleep(repo, new Date(Date.now() - HOUR), new Date(Date.now() - 2 * HOUR)),
    ).toThrow(/end time must be after/i)
  })

  it('logCompletedSleep rejects a future end', () => {
    const repo = new MemorySleepRepo()
    expect(() =>
      logCompletedSleep(repo, new Date(Date.now() - HOUR), new Date(Date.now() + HOUR)),
    ).toThrow(/future/i)
  })

  it('logCompletedSleep creates a completed session', () => {
    const repo = new MemorySleepRepo()
    const start = new Date(Date.now() - 2 * HOUR)
    const end = new Date(Date.now() - HOUR)
    const session = logCompletedSleep(repo, start, end)
    expect(session.startTime).toBe(start.toISOString())
    expect(session.endTime).toBe(end.toISOString())
    expect(getActiveSleep(repo)).toBeNull()
  })

  it('updateSleep updates start and end in place', () => {
    const repo = new MemorySleepRepo()
    const s = startSleep(repo, new Date(Date.now() - 3 * HOUR))
    stopSleep(repo, s.id, new Date(Date.now() - 2 * HOUR))
    const newStart = new Date(Date.now() - 5 * HOUR)
    const newEnd = new Date(Date.now() - 4 * HOUR)
    const updated = updateSleep(repo, s.id, { start: newStart, end: newEnd })
    expect(updated.startTime).toBe(newStart.toISOString())
    expect(updated.endTime).toBe(newEnd.toISOString())
    expect(repo.getAll()).toHaveLength(1)
  })

  it('updateSleep rejects an end before start', () => {
    const repo = new MemorySleepRepo()
    const s = startSleep(repo, new Date(Date.now() - 3 * HOUR))
    stopSleep(repo, s.id, new Date(Date.now() - 2 * HOUR))
    expect(() =>
      updateSleep(repo, s.id, {
        start: new Date(Date.now() - HOUR),
        end: new Date(Date.now() - 2 * HOUR),
      }),
    ).toThrow(/after start/i)
  })

  it('updateSleep edits the start of a running sleep and keeps it running', () => {
    const repo = new MemorySleepRepo()
    const s = startSleep(repo, new Date(Date.now() - HOUR))
    const newStart = new Date(Date.now() - 2 * HOUR)
    const updated = updateSleep(repo, s.id, { start: newStart })
    expect(updated.startTime).toBe(newStart.toISOString())
    expect(updated.endTime).toBeNull()
    expect(getActiveSleep(repo)?.id).toBe(s.id)
  })

  it('updateSleep rejects a future start for a running sleep', () => {
    const repo = new MemorySleepRepo()
    const s = startSleep(repo)
    expect(() => updateSleep(repo, s.id, { start: new Date(Date.now() + HOUR) })).toThrow(/future/i)
  })
})
