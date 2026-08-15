import { describe, it, expect } from 'vitest'
import {
  deleteHeadCircumference,
  latestHeadCircumference,
  listHeadCircumferencesForDay,
  recordHeadCircumference,
  updateHeadCircumference,
} from '../headCircumference'
import { MemoryHeadCircumferenceRepo } from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

describe('head circumference use cases', () => {
  it('records a head circumference with its unit', () => {
    const repo = new MemoryHeadCircumferenceRepo()
    const entry = recordHeadCircumference(repo, 42.5, 'cm', new Date(Date.now() - 60000))
    expect(entry.value).toBe(42.5)
    expect(entry.unit).toBe('cm')
    expect(repo.getAll()).toHaveLength(1)
  })

  it('records a head circumference in inches', () => {
    const repo = new MemoryHeadCircumferenceRepo()
    const entry = recordHeadCircumference(repo, 16.5, 'in', new Date(Date.now() - 60000))
    expect(entry.value).toBe(16.5)
    expect(entry.unit).toBe('in')
    expect(repo.getAll()).toHaveLength(1)
  })

  it('rejects a non-positive value', () => {
    const repo = new MemoryHeadCircumferenceRepo()
    expect(() => recordHeadCircumference(repo, 0, 'cm')).toThrow(/positive/i)
    expect(() => recordHeadCircumference(repo, -1, 'cm')).toThrow(/positive/i)
    expect(() => recordHeadCircumference(repo, NaN, 'cm')).toThrow(/positive/i)
  })

  it('rejects an invalid unit and future times', () => {
    const repo = new MemoryHeadCircumferenceRepo()
    expect(() => recordHeadCircumference(repo, 42, 'ft' as never)).toThrow(/cm or in/i)
    expect(() =>
      recordHeadCircumference(repo, 42, 'cm', new Date(Date.now() + HOUR)),
    ).toThrow(/future/i)
  })

  it('lists head circumferences for the day, newest first', () => {
    const repo = new MemoryHeadCircumferenceRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)
    const older = recordHeadCircumference(repo, 42, 'cm', new Date(Date.now() - 2 * HOUR))
    const newer = recordHeadCircumference(repo, 42.5, 'cm', new Date(Date.now() - HOUR))
    recordHeadCircumference(repo, 40, 'cm', new Date(Date.now() - 30 * HOUR))

    const listed = listHeadCircumferencesForDay(repo, dayStart, dayEnd)
    expect(listed.map((h) => h.id)).toEqual([newer.id, older.id])
  })

  it('latest returns the most recent entry (or null)', () => {
    const repo = new MemoryHeadCircumferenceRepo()
    expect(latestHeadCircumference(repo)).toBeNull()
    recordHeadCircumference(repo, 42, 'cm', new Date(Date.now() - 2 * HOUR))
    const newest = recordHeadCircumference(repo, 42.5, 'cm', new Date(Date.now() - HOUR))
    expect(latestHeadCircumference(repo)?.id).toBe(newest.id)
  })

  it('updates and deletes a head circumference', () => {
    const repo = new MemoryHeadCircumferenceRepo()
    const entry = recordHeadCircumference(repo, 42, 'cm')
    const updated = updateHeadCircumference(repo, entry.id, { value: 42.5, unit: 'in' })
    expect(updated.value).toBe(42.5)
    expect(updated.unit).toBe('in')
    deleteHeadCircumference(repo, entry.id)
    expect(repo.getAll()).toHaveLength(0)
  })

  it('update preserves the id and re-validates', () => {
    const repo = new MemoryHeadCircumferenceRepo()
    const entry = recordHeadCircumference(repo, 42, 'cm')
    const updated = updateHeadCircumference(repo, entry.id, { time: new Date(entry.time) })
    expect(updated.id).toBe(entry.id)
    expect(() => updateHeadCircumference(repo, entry.id, { value: 0 })).toThrow(/positive/i)
    expect(() => updateHeadCircumference(repo, entry.id, { unit: 'mm' as never })).toThrow(
      /cm or in/i,
    )
    expect(() =>
      updateHeadCircumference(repo, entry.id, { time: new Date(Date.now() + HOUR) }),
    ).toThrow(/future/i)
  })

  it('update merges partial input, preserving untouched fields', () => {
    const repo = new MemoryHeadCircumferenceRepo()
    const entry = recordHeadCircumference(repo, 42, 'cm', new Date(Date.now() - 60000))

    const unitOnly = updateHeadCircumference(repo, entry.id, { unit: 'in' })
    expect(unitOnly.value).toBe(42)
    expect(unitOnly.unit).toBe('in')

    const valueOnly = updateHeadCircumference(repo, entry.id, { value: 42.5 })
    expect(valueOnly.value).toBe(42.5)
    expect(valueOnly.unit).toBe('in')
    expect(valueOnly.id).toBe(entry.id)
  })

  it('update throws when the entry does not exist', () => {
    const repo = new MemoryHeadCircumferenceRepo()
    expect(() => updateHeadCircumference(repo, 'missing', { value: 42 })).toThrow(/not found/i)
  })
})
