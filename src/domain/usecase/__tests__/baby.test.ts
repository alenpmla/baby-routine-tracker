import { describe, it, expect } from 'vitest'
import { getBabyProfile, saveBabyProfile } from '../baby'
import { MemoryBabyRepo } from '../../../test/memoryRepos'

describe('baby use cases', () => {
  it('requires a name', () => {
    const repo = new MemoryBabyRepo()
    expect(() => saveBabyProfile(repo, { name: '  ', dob: '2026-01-01' })).toThrow(/name/i)
  })

  it('requires a date of birth', () => {
    const repo = new MemoryBabyRepo()
    expect(() => saveBabyProfile(repo, { name: 'Avery', dob: '' })).toThrow(/date of birth/i)
  })

  it('saves and reads back a profile', () => {
    const repo = new MemoryBabyRepo()
    const baby = saveBabyProfile(repo, { name: ' Avery ', dob: '2026-01-15', notes: 'loves naps' })
    expect(baby.name).toBe('Avery')
    expect(getBabyProfile(repo)?.notes).toBe('loves naps')
  })

  it('preserves the id when updating an existing profile', () => {
    const repo = new MemoryBabyRepo()
    const first = saveBabyProfile(repo, { name: 'Avery', dob: '2026-01-15' })
    const updated = saveBabyProfile(repo, { name: 'Avery J.', dob: '2026-01-15' }, first)
    expect(updated.id).toBe(first.id)
    expect(getBabyProfile(repo)?.name).toBe('Avery J.')
  })
})
