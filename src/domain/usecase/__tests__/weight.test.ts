import { describe, it, expect } from 'vitest'
import { deleteWeight, latestWeight, listWeightsForDay, recordWeight, updateWeight } from '../weight'
import { MemoryWeightRepo } from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

describe('weight use cases', () => {
  it('records a weight with its unit', () => {
    const repo = new MemoryWeightRepo()
    const entry = recordWeight(repo, 7.5, 'kg', new Date(Date.now() - 60000))
    expect(entry.weight).toBe(7.5)
    expect(entry.unit).toBe('kg')
    expect(repo.getAll()).toHaveLength(1)
  })

  it('rejects a non-positive weight', () => {
    const repo = new MemoryWeightRepo()
    expect(() => recordWeight(repo, 0, 'kg')).toThrow(/positive/i)
    expect(() => recordWeight(repo, -1, 'kg')).toThrow(/positive/i)
  })

  it('rejects an invalid unit and future times', () => {
    const repo = new MemoryWeightRepo()
    expect(() => recordWeight(repo, 7, 'g' as never)).toThrow(/kg or lb/i)
    expect(() => recordWeight(repo, 7, 'kg', new Date(Date.now() + HOUR))).toThrow(/future/i)
  })

  it('lists weights for the day, newest first', () => {
    const repo = new MemoryWeightRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)
    const older = recordWeight(repo, 7, 'kg', new Date(Date.now() - 2 * HOUR))
    const newer = recordWeight(repo, 7.2, 'kg', new Date(Date.now() - HOUR))
    recordWeight(repo, 6, 'kg', new Date(Date.now() - 30 * HOUR))

    const listed = listWeightsForDay(repo, dayStart, dayEnd)
    expect(listed.map((w) => w.id)).toEqual([newer.id, older.id])
  })

  it('latest returns the most recent entry (or null)', () => {
    const repo = new MemoryWeightRepo()
    expect(latestWeight(repo)).toBeNull()
    recordWeight(repo, 7, 'kg', new Date(Date.now() - 2 * HOUR))
    const newest = recordWeight(repo, 7.4, 'kg', new Date(Date.now() - HOUR))
    expect(latestWeight(repo)?.id).toBe(newest.id)
  })

  it('updates and deletes a weight', () => {
    const repo = new MemoryWeightRepo()
    const entry = recordWeight(repo, 7, 'kg')
    const updated = updateWeight(repo, entry.id, { weight: 7.5, unit: 'lb' })
    expect(updated.weight).toBe(7.5)
    expect(updated.unit).toBe('lb')
    deleteWeight(repo, entry.id)
    expect(repo.getAll()).toHaveLength(0)
  })
})
