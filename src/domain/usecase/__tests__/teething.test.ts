import { describe, it, expect } from 'vitest'
import {
  deleteTeethingDay,
  isValidDayString,
  listTeethingDays,
  recordTeethingDay,
  updateTeethingDay,
} from '../teething'
import { TEETHING_SYMPTOMS } from '../../model/TeethingDay'
import type { TeethingSymptom } from '../../model/TeethingDay'
import { MemoryTeethingDayRepo } from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

function localDayString(at: Date): string {
  const year = at.getFullYear()
  const month = String(at.getMonth() + 1).padStart(2, '0')
  const date = String(at.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

const today = localDayString(new Date())
const yesterday = localDayString(new Date(Date.now() - 24 * HOUR))
const futureDay = localDayString(new Date(Date.now() + 48 * HOUR))

describe('teething day use cases', () => {
  it('isValidDayString accepts real yyyy-mm-dd dates', () => {
    expect(isValidDayString('2026-08-14')).toBe(true)
    expect(isValidDayString('2026-02-28')).toBe(true)
    expect(isValidDayString('2024-02-29')).toBe(true)
  })

  it('isValidDayString rejects malformed or impossible dates', () => {
    expect(isValidDayString('2026-8-14')).toBe(false)
    expect(isValidDayString('14-08-2026')).toBe(false)
    expect(isValidDayString('2026-02-31')).toBe(false)
    expect(isValidDayString('2026-13-01')).toBe(false)
    expect(isValidDayString('2026-00-10')).toBe(false)
    expect(isValidDayString('')).toBe(false)
    expect(isValidDayString('2026-08-14T00:00:00Z')).toBe(false)
  })

  it('records a teething day with symptoms', () => {
    const repo = new MemoryTeethingDayRepo()
    const entry = recordTeethingDay(repo, yesterday, ['Drooling', 'Poor sleep'])
    expect(entry.day).toBe(yesterday)
    expect(entry.symptoms).toEqual(['Drooling', 'Poor sleep'])
    expect(entry.notes).toBeUndefined()
    expect(repo.getAll()).toHaveLength(1)
  })

  it('accepts today but not a future day', () => {
    const repo = new MemoryTeethingDayRepo()
    const entry = recordTeethingDay(repo, today, ['Fussy'])
    expect(entry.day).toBe(today)
    expect(() => recordTeethingDay(repo, futureDay, ['Fever'])).toThrow(/future/i)
  })

  it('rejects a malformed day string', () => {
    const repo = new MemoryTeethingDayRepo()
    expect(() => recordTeethingDay(repo, '2026-13-01', ['Fussy'])).toThrow(/yyyy-mm-dd/i)
    expect(() => recordTeethingDay(repo, 'not-a-date', ['Fussy'])).toThrow(/yyyy-mm-dd/i)
  })

  it('rejects symptoms outside the curated set and empty symptoms', () => {
    const repo = new MemoryTeethingDayRepo()
    expect(() => recordTeethingDay(repo, yesterday, ['Cranky'] as never)).toThrow(
      /from the list/i,
    )
    expect(() => recordTeethingDay(repo, yesterday, [])).toThrow(/at least one symptom/i)
  })

  it('accepts every curated symptom', () => {
    const repo = new MemoryTeethingDayRepo()
    const entry = recordTeethingDay(repo, yesterday, [...TEETHING_SYMPTOMS])
    expect(entry.symptoms).toEqual([...TEETHING_SYMPTOMS])
  })

  it('records optional notes', () => {
    const repo = new MemoryTeethingDayRepo()
    const entry = recordTeethingDay(repo, yesterday, ['Chewing'], 'biting everything')
    expect(entry.notes).toBe('biting everything')
    expect(() => recordTeethingDay(repo, today, ['Fussy'], 42 as never)).toThrow(/string/i)
  })

  it('allows only one entry per day', () => {
    const repo = new MemoryTeethingDayRepo()
    recordTeethingDay(repo, yesterday, ['Fussy'])
    expect(() => recordTeethingDay(repo, yesterday, ['Fever'])).toThrow(/already exists/i)
  })

  it('lists teething days newest first', () => {
    const repo = new MemoryTeethingDayRepo()
    const older = recordTeethingDay(repo, '2026-08-01', ['Drooling'])
    const middle = recordTeethingDay(repo, '2026-08-10', ['Fussy'])
    const newest = recordTeethingDay(repo, '2026-08-12', ['Poor sleep'])
    expect(listTeethingDays(repo).map((d) => d.id)).toEqual([newest.id, middle.id, older.id])
  })

  it('updates and deletes a teething day', () => {
    const repo = new MemoryTeethingDayRepo()
    const entry = recordTeethingDay(repo, yesterday, ['Drooling'])
    const updated = updateTeethingDay(repo, entry.id, {
      symptoms: ['Drooling', 'Fever'],
      notes: 'mild fever',
    })
    expect(updated.symptoms).toEqual(['Drooling', 'Fever'])
    expect(updated.notes).toBe('mild fever')
    expect(updated.day).toBe(yesterday)
    deleteTeethingDay(repo, entry.id)
    expect(repo.getAll()).toHaveLength(0)
  })

  it('update preserves the id and re-validates', () => {
    const repo = new MemoryTeethingDayRepo()
    const entry = recordTeethingDay(repo, yesterday, ['Drooling'])
    const updated = updateTeethingDay(repo, entry.id, { day: yesterday })
    expect(updated.id).toBe(entry.id)
    expect(() => updateTeethingDay(repo, entry.id, { day: '2026-02-31' })).toThrow(/yyyy-mm-dd/i)
    expect(() => updateTeethingDay(repo, entry.id, { day: futureDay })).toThrow(/future/i)
    expect(() => updateTeethingDay(repo, entry.id, { symptoms: [] })).toThrow(
      /at least one symptom/i,
    )
    expect(() => updateTeethingDay(repo, entry.id, { symptoms: ['Odd'] as never })).toThrow(
      /from the list/i,
    )
  })

  it('update changes the day to another valid past date', () => {
    const repo = new MemoryTeethingDayRepo()
    const entry = recordTeethingDay(repo, yesterday, ['Drooling'])
    const newDay = localDayString(new Date(Date.now() - 48 * HOUR))
    const updated = updateTeethingDay(repo, entry.id, { day: newDay })
    expect(updated.id).toBe(entry.id)
    expect(updated.day).toBe(newDay)
    expect(updated.symptoms).toEqual(['Drooling'])
    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].day).toBe(newDay)
  })

  it('update rejects moving onto an existing day', () => {
    const repo = new MemoryTeethingDayRepo()
    const a = recordTeethingDay(repo, '2026-08-01', ['Fussy'])
    recordTeethingDay(repo, '2026-08-02', ['Fever'])
    expect(() => updateTeethingDay(repo, a.id, { day: '2026-08-02' })).toThrow(/already exists/i)
  })

  it('update merges partial input, preserving untouched fields', () => {
    const repo = new MemoryTeethingDayRepo()
    const entry = recordTeethingDay(repo, yesterday, ['Drooling'], 'note')

    const symptomsOnly = updateTeethingDay(repo, entry.id, { symptoms: ['Chewing'] })
    expect(symptomsOnly.symptoms).toEqual(['Chewing'])
    expect(symptomsOnly.notes).toBe('note')

    const notesOnly = updateTeethingDay(repo, entry.id, { notes: 'updated' })
    expect(notesOnly.symptoms).toEqual(['Chewing'])
    expect(notesOnly.notes).toBe('updated')
    expect(notesOnly.id).toBe(entry.id)
  })

  it('update throws when the entry does not exist', () => {
    const repo = new MemoryTeethingDayRepo()
    expect(() => updateTeethingDay(repo, 'missing', { symptoms: ['Fussy'] })).toThrow(/not found/i)
  })

  it('does not share symptom arrays with the caller (defensive copy)', () => {
    const repo = new MemoryTeethingDayRepo()
    const symptoms: TeethingSymptom[] = ['Drooling']
    const entry = recordTeethingDay(repo, yesterday, symptoms)
    symptoms.push('Fever')
    expect(entry.symptoms).toEqual(['Drooling'])
    const stored = repo.getAll()[0]
    stored.symptoms.push('Chewing')
    expect(repo.getAll()[0].symptoms).toEqual(['Drooling'])
  })
})
