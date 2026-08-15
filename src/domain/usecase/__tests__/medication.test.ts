import { describe, it, expect } from 'vitest'
import { deleteMedication, listMedicationsForDay, recordMedication, updateMedication } from '../medication'
import { MemoryMedicationRepo } from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

describe('medication use cases', () => {
  it('records a medication with optional amount', () => {
    const repo = new MemoryMedicationRepo()
    const entry = recordMedication(repo, 'Paracetamol', new Date(Date.now() - 60000), 120, 'mg')
    expect(entry.name).toBe('Paracetamol')
    expect(entry.amount).toBe(120)
    expect(entry.unit).toBe('mg')
    expect(repo.getAll()).toHaveLength(1)

    const drops = recordMedication(repo, 'Vitamin D drops')
    expect(drops.amount).toBeUndefined()
    expect(drops.unit).toBe('')
  })

  it('rejects an empty name, negative amount, and unit/amount mismatch', () => {
    const repo = new MemoryMedicationRepo()
    expect(() => recordMedication(repo, '  ')).toThrow(/name/i)
    expect(() => recordMedication(repo, 'Paracetamol', new Date(), -1, 'mg')).toThrow(/negative/i)
    expect(() => recordMedication(repo, 'Paracetamol', new Date(), 120, '')).toThrow(/unit/i)
    expect(() => recordMedication(repo, 'Paracetamol', new Date(), undefined, 'mg')).toThrow(/amount/i)
  })

  it('rejects future timestamps', () => {
    const repo = new MemoryMedicationRepo()
    expect(() => recordMedication(repo, 'Paracetamol', new Date(Date.now() + HOUR), 120, 'mg')).toThrow(/future/i)
  })

  it('lists medications for the day, newest first', () => {
    const repo = new MemoryMedicationRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)
    const older = recordMedication(repo, 'A', new Date(Date.now() - 2 * HOUR))
    const newer = recordMedication(repo, 'B', new Date(Date.now() - HOUR))
    recordMedication(repo, 'C', new Date(Date.now() - 30 * HOUR))

    const listed = listMedicationsForDay(repo, dayStart, dayEnd)
    expect(listed.map((m) => m.id)).toEqual([newer.id, older.id])
  })

  it('updates and deletes a medication', () => {
    const repo = new MemoryMedicationRepo()
    const entry = recordMedication(repo, 'Paracetamol', new Date(), 120, 'mg')
    const updated = updateMedication(repo, entry.id, { name: 'Ibuprofen', amount: 200, unit: 'mg' })
    expect(updated.name).toBe('Ibuprofen')
    expect(updated.amount).toBe(200)
    expect(updated.id).toBe(entry.id)
    deleteMedication(repo, entry.id)
    expect(repo.getAll()).toHaveLength(0)
  })

  it('update throws for an unknown id', () => {
    const repo = new MemoryMedicationRepo()
    expect(() => updateMedication(repo, 'missing', {})).toThrow(/not found/i)
  })
})
