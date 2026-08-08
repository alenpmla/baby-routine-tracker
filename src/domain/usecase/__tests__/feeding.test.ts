import { describe, it, expect } from 'vitest'
import { recordFeeding, deleteFeeding, listFeedingsForDay, updateFeeding } from '../feeding'
import { MemoryFeedingRepo } from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

const BOTTLE = { amount: 120, unit: 'ml' as const }

describe('feeding use cases', () => {
  it('records a feed at the given time', () => {
    const repo = new MemoryFeedingRepo()
    const at = new Date(Date.now() - 60000)
    const session = recordFeeding(repo, 'bottle', at, BOTTLE)
    expect(session.type).toBe('bottle')
    expect(session.time).toBe(at.toISOString())
  })

  it('rejects a feed in the future', () => {
    const repo = new MemoryFeedingRepo()
    expect(() => recordFeeding(repo, 'bottle', new Date(Date.now() + HOUR))).toThrow(/future/i)
  })

  it('lists feeds inside the day window newest first', () => {
    const repo = new MemoryFeedingRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)

    const older = recordFeeding(repo, 'bottle', new Date(Date.now() - 20 * HOUR), BOTTLE)
    const newer = recordFeeding(repo, 'solids', new Date(Date.now() - HOUR), {
      foods: ['Banana'],
      amount: 2,
      unit: 'oz',
    })
    recordFeeding(repo, 'bottle', new Date(Date.now() - 30 * HOUR), BOTTLE)

    const listed = listFeedingsForDay(repo, dayStart, dayEnd)
    expect(listed.map((f) => f.id)).toEqual([newer.id, older.id])
  })

  it('deletes a feed', () => {
    const repo = new MemoryFeedingRepo()
    const session = recordFeeding(repo, 'bottle', undefined, BOTTLE)
    deleteFeeding(repo, session.id)
    expect(repo.getAll()).toHaveLength(0)
  })

  it('requires an amount and unit for bottle', () => {
    const repo = new MemoryFeedingRepo()
    expect(() => recordFeeding(repo, 'bottle', new Date(Date.now() - 60000))).toThrow(/amount/i)
    expect(() =>
      recordFeeding(repo, 'bottle', new Date(Date.now() - 60000), { amount: 120 }),
    ).toThrow(/unit/i)
    expect(() =>
      recordFeeding(repo, 'bottle', new Date(Date.now() - 60000), { amount: 120, unit: 'gram' }),
    ).toThrow(/ml or oz/i)
  })

  it('requires at least one food for solids', () => {
    const repo = new MemoryFeedingRepo()
    expect(() => recordFeeding(repo, 'solids')).toThrow(/at least one food/i)
  })

  it('rejects an amount without a unit', () => {
    const repo = new MemoryFeedingRepo()
    expect(() =>
      recordFeeding(repo, 'solids', new Date(Date.now() - 60000), { foods: ['Banana'], amount: 2 }),
    ).toThrow(/unit/i)
  })

  it('rejects a unit without an amount', () => {
    const repo = new MemoryFeedingRepo()
    expect(() =>
      recordFeeding(repo, 'solids', new Date(Date.now() - 60000), { foods: ['Banana'], unit: 'oz' }),
    ).toThrow(/amount/i)
  })

  it('requires an amount for solids', () => {
    const repo = new MemoryFeedingRepo()
    expect(() =>
      recordFeeding(repo, 'solids', new Date(Date.now() - 60000), { foods: ['Banana'] }),
    ).toThrow(/amount/i)
  })

  it('rejects a non-positive amount', () => {
    const repo = new MemoryFeedingRepo()
    expect(() =>
      recordFeeding(repo, 'solids', new Date(Date.now() - 60000), { foods: ['Banana'], amount: 0, unit: 'oz' }),
    ).toThrow(/positive/i)
  })

  it('records solids with multiple foods, amount and unit', () => {
    const repo = new MemoryFeedingRepo()
    const at = new Date(Date.now() - 60000)
    const session = recordFeeding(repo, 'solids', at, {
      foods: [' Avocado ', 'salmon', 'SALMON '],
      amount: 2,
      unit: 'oz',
    })
    expect(session.foods).toEqual(['Avocado', 'salmon'])
    expect(session.food).toBeUndefined()
    expect(session.amount).toBe(2)
    expect(session.unit).toBe('oz')
  })

  it('bottle feeds ignore solids details', () => {
    const repo = new MemoryFeedingRepo()
    const session = recordFeeding(repo, 'bottle', new Date(Date.now() - 60000), {
      foods: ['Banana'],
      amount: 120,
      unit: 'ml',
    })
    expect(session.foods).toBeUndefined()
    expect(session.amount).toBe(120)
  })

  it('updateFeeding changes type and time', () => {
    const repo = new MemoryFeedingRepo()
    const at = new Date(Date.now() - 60000)
    const f = recordFeeding(repo, 'bottle', at, BOTTLE)
    const newTime = new Date(Date.now() - 120000)
    const updated = updateFeeding(repo, f.id, { type: 'bottle', time: newTime })
    expect(updated.type).toBe('bottle')
    expect(updated.time).toBe(newTime.toISOString())
    expect(repo.getAll()).toHaveLength(1)
  })

  it('records a breast feed with start and end', () => {
    const repo = new MemoryFeedingRepo()
    const start = new Date(Date.now() - 30 * 60000)
    const end = new Date(Date.now() - 5 * 60000)
    const session = recordFeeding(repo, 'breast', start, { startTime: start, endTime: end })
    expect(session.startTime).toBe(start.toISOString())
    expect(session.endTime).toBe(end.toISOString())
    expect(session.time).toBe(start.toISOString())
  })

  it('requires start and end for breast', () => {
    const repo = new MemoryFeedingRepo()
    const start = new Date(Date.now() - 60000)
    expect(() => recordFeeding(repo, 'breast', start)).toThrow(/start and end/i)
    expect(() =>
      recordFeeding(repo, 'breast', start, { startTime: start }),
    ).toThrow(/start and end/i)
  })

  it('rejects a breast end before start', () => {
    const repo = new MemoryFeedingRepo()
    const start = new Date(Date.now() - 30 * 60000)
    const end = new Date(Date.now() - 40 * 60000)
    expect(() => recordFeeding(repo, 'breast', start, { startTime: start, endTime: end })).toThrow(
      /after start/i,
    )
  })

  it('updateFeeding keeps breast start/end and clears them on type change', () => {
    const repo = new MemoryFeedingRepo()
    const start = new Date(Date.now() - 30 * 60000)
    const end = new Date(Date.now() - 5 * 60000)
    const f = recordFeeding(repo, 'breast', start, { startTime: start, endTime: end })

    const kept = updateFeeding(repo, f.id, { type: 'breast' })
    expect(kept.startTime).toBe(start.toISOString())
    expect(kept.endTime).toBe(end.toISOString())

    const changed = updateFeeding(repo, f.id, { type: 'bottle', details: { amount: 120, unit: 'ml' } })
    expect(changed.type).toBe('bottle')
    expect(changed.startTime).toBeUndefined()
    expect(changed.endTime).toBeUndefined()
    expect(changed.amount).toBe(120)
  })

  it('updateFeeding requires times when switching to breast', () => {
    const repo = new MemoryFeedingRepo()
    const f = recordFeeding(repo, 'bottle', new Date(Date.now() - 60000), BOTTLE)
    expect(() => updateFeeding(repo, f.id, { type: 'breast' })).toThrow(/start and end/i)
  })

  it('updateFeeding changes solids details', () => {
    const repo = new MemoryFeedingRepo()
    const f = recordFeeding(repo, 'solids', new Date(Date.now() - 60000), {
      foods: ['Banana'],
      amount: 2,
      unit: 'oz',
    })
    const updated = updateFeeding(repo, f.id, {
      details: { foods: ['Carrot', 'peas'], amount: 30, unit: 'gram' },
    })
    expect(updated.foods).toEqual(['Carrot', 'peas'])
    expect(updated.amount).toBe(30)
    expect(updated.unit).toBe('gram')
  })

  it('updateFeeding clears solids foods when switching to bottle (keeps quantity)', () => {
    const repo = new MemoryFeedingRepo()
    const f = recordFeeding(repo, 'solids', new Date(Date.now() - 60000), {
      foods: ['Banana'],
      amount: 2,
      unit: 'oz',
    })
    const updated = updateFeeding(repo, f.id, { type: 'bottle' })
    expect(updated.type).toBe('bottle')
    expect(updated.foods).toBeUndefined()
    expect(updated.amount).toBe(2)
    expect(updated.unit).toBe('oz')
  })

  it('updateFeeding requires solids details when switching to solids', () => {
    const repo = new MemoryFeedingRepo()
    const f = recordFeeding(repo, 'bottle', new Date(Date.now() - 60000), BOTTLE)
    expect(() => updateFeeding(repo, f.id, { type: 'solids', details: { foods: ['X'] } })).toThrow(/amount/i)
  })

  it('updateFeeding keeps foods when only time changes', () => {
    const repo = new MemoryFeedingRepo()
    const f = recordFeeding(repo, 'solids', new Date(Date.now() - 60000), {
      foods: ['Avocado', 'salmon'],
      amount: 2,
      unit: 'oz',
    })
    const updated = updateFeeding(repo, f.id, { time: new Date(Date.now() - 120000) })
    expect(updated.foods).toEqual(['Avocado', 'salmon'])
  })
})
