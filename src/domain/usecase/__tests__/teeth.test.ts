import { describe, it, expect } from 'vitest'
import {
  deleteTooth,
  eruptedTeeth,
  recordTooth,
  updateTooth,
} from '../teeth'
import { TOOTH_NAMES } from '../../model/ToothEntry'
import { MemoryToothRepo } from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

describe('tooth use cases', () => {
  it('records a tooth eruption', () => {
    const repo = new MemoryToothRepo()
    const entry = recordTooth(repo, 'Lower central incisor', new Date(Date.now() - 60000))
    expect(entry.tooth).toBe('Lower central incisor')
    expect(entry.notes).toBeUndefined()
    expect(repo.getAll()).toHaveLength(1)
  })

  it('records optional notes', () => {
    const repo = new MemoryToothRepo()
    const entry = recordTooth(
      repo,
      'Upper central incisor',
      new Date(Date.now() - 60000),
      'came in together',
    )
    expect(entry.notes).toBe('came in together')
  })

  it('rejects a tooth outside the curated list', () => {
    const repo = new MemoryToothRepo()
    expect(() => recordTooth(repo, 'Molar' as never)).toThrow(/from the list/i)
    expect(() => recordTooth(repo, '' as never)).toThrow(/from the list/i)
  })

  it('accepts every curated tooth name', () => {
    const repo = new MemoryToothRepo()
    for (const tooth of TOOTH_NAMES) {
      const entry = recordTooth(repo, tooth, new Date(Date.now() - 60000))
      expect(entry.tooth).toBe(tooth)
    }
    expect(repo.getAll()).toHaveLength(TOOTH_NAMES.length)
  })

  it('rejects future timestamps and non-string notes', () => {
    const repo = new MemoryToothRepo()
    expect(() => recordTooth(repo, 'Lower canine', new Date(Date.now() + HOUR))).toThrow(/future/i)
    expect(() => recordTooth(repo, 'Lower canine', new Date(), 42 as never)).toThrow(/string/i)
  })

  it('eruptedTeeth returns unique teeth in canonical order', () => {
    const repo = new MemoryToothRepo()
    recordTooth(repo, 'Upper central incisor', new Date(Date.now() - 3 * HOUR))
    recordTooth(repo, 'Lower central incisor', new Date(Date.now() - 2 * HOUR))
    recordTooth(repo, 'Upper central incisor', new Date(Date.now() - HOUR))
    expect(eruptedTeeth(repo)).toEqual(['Lower central incisor', 'Upper central incisor'])
  })

  it('eruptedTeeth returns empty when nothing has erupted', () => {
    const repo = new MemoryToothRepo()
    expect(eruptedTeeth(repo)).toEqual([])
  })

  it('eruptedTeeth ignores deleted entries', () => {
    const repo = new MemoryToothRepo()
    const entry = recordTooth(repo, 'Lower central incisor', new Date(Date.now() - HOUR))
    deleteTooth(repo, entry.id)
    expect(eruptedTeeth(repo)).toEqual([])
  })

  it('updates and deletes a tooth entry', () => {
    const repo = new MemoryToothRepo()
    const entry = recordTooth(repo, 'Lower central incisor')
    const updated = updateTooth(repo, entry.id, { tooth: 'Lower lateral incisor', notes: 'so fast' })
    expect(updated.tooth).toBe('Lower lateral incisor')
    expect(updated.notes).toBe('so fast')
    deleteTooth(repo, entry.id)
    expect(repo.getAll()).toHaveLength(0)
  })

  it('update preserves the id and re-validates', () => {
    const repo = new MemoryToothRepo()
    const entry = recordTooth(repo, 'Lower central incisor')
    const updated = updateTooth(repo, entry.id, { time: new Date(entry.time) })
    expect(updated.id).toBe(entry.id)
    expect(() => updateTooth(repo, entry.id, { tooth: 'Bicuspid' as never })).toThrow(/from the list/i)
    expect(() => updateTooth(repo, entry.id, { time: new Date(Date.now() + HOUR) })).toThrow(
      /future/i,
    )
    expect(() => updateTooth(repo, entry.id, { notes: 5 as never })).toThrow(/string/i)
  })

  it('update changes the eruption time', () => {
    const repo = new MemoryToothRepo()
    const entry = recordTooth(repo, 'Lower central incisor', new Date(Date.now() - 60000))
    const newTime = new Date(Date.now() - 2 * HOUR)
    const updated = updateTooth(repo, entry.id, { time: newTime })
    expect(updated.id).toBe(entry.id)
    expect(updated.time).toBe(newTime.toISOString())
    expect(repo.getAll()[0].time).toBe(newTime.toISOString())
  })

  it('update merges partial input, preserving untouched fields', () => {
    const repo = new MemoryToothRepo()
    const entry = recordTooth(repo, 'Lower central incisor', new Date(Date.now() - 60000), 'note')

    const toothOnly = updateTooth(repo, entry.id, { tooth: 'Upper central incisor' })
    expect(toothOnly.tooth).toBe('Upper central incisor')
    expect(toothOnly.notes).toBe('note')

    const notesOnly = updateTooth(repo, entry.id, { notes: 'changed mind' })
    expect(notesOnly.tooth).toBe('Upper central incisor')
    expect(notesOnly.notes).toBe('changed mind')
    expect(notesOnly.id).toBe(entry.id)
  })

  it('update throws when the entry does not exist', () => {
    const repo = new MemoryToothRepo()
    expect(() => updateTooth(repo, 'missing', { tooth: 'Lower canine' })).toThrow(/not found/i)
  })
})
