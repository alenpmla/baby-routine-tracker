import { describe, it, expect } from 'vitest'
import {
  recordDiaperChange,
  deleteDiaperChange,
  listDiaperChangesForDay,
  updateDiaperChange,
} from '../diaper'
import { MemoryDiaperRepo } from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

describe('diaper use cases', () => {
  it('records a change at the given time', () => {
    const repo = new MemoryDiaperRepo()
    const at = new Date(Date.now() - 60000)
    const change = recordDiaperChange(repo, 'both', at)
    expect(change.type).toBe('both')
    expect(change.time).toBe(at.toISOString())
  })

  it('rejects a change in the future', () => {
    const repo = new MemoryDiaperRepo()
    expect(() => recordDiaperChange(repo, 'wet', new Date(Date.now() + HOUR))).toThrow(/future/i)
  })

  it('lists changes inside the day window newest first', () => {
    const repo = new MemoryDiaperRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)

    const older = recordDiaperChange(repo, 'wet', new Date(Date.now() - 20 * HOUR))
    const newer = recordDiaperChange(repo, 'dirty', new Date(Date.now() - HOUR))
    recordDiaperChange(repo, 'wet', new Date(Date.now() - 30 * HOUR))

    const listed = listDiaperChangesForDay(repo, dayStart, dayEnd)
    expect(listed.map((c) => c.id)).toEqual([newer.id, older.id])
  })

  it('deletes a change', () => {
    const repo = new MemoryDiaperRepo()
    const change = recordDiaperChange(repo, 'wet')
    deleteDiaperChange(repo, change.id)
    expect(repo.getAll()).toHaveLength(0)
  })

  it('updateDiaperChange changes type and time', () => {
    const repo = new MemoryDiaperRepo()
    const at = new Date(Date.now() - 60000)
    const c = recordDiaperChange(repo, 'wet', at)
    const newTime = new Date(Date.now() - 120000)
    const updated = updateDiaperChange(repo, c.id, { type: 'both', time: newTime })
    expect(updated.type).toBe('both')
    expect(updated.time).toBe(newTime.toISOString())
    expect(repo.getAll()).toHaveLength(1)
  })
})
