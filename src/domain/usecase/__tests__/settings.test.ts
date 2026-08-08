import { describe, it, expect } from 'vitest'
import { addFoodSuggestion, removeFoodSuggestion, getFoodSuggestions } from '../settings'
import { MemorySettingsRepo } from '../../../test/memoryRepos'

describe('settings use cases', () => {
  it('adds and reads back a suggestion (trimmed)', () => {
    const repo = new MemorySettingsRepo()
    addFoodSuggestion(repo, '  carrot  ')
    expect(getFoodSuggestions(repo)).toEqual(['carrot'])
  })

  it('rejects an empty suggestion', () => {
    const repo = new MemorySettingsRepo()
    expect(() => addFoodSuggestion(repo, '   ')).toThrow(/empty/i)
  })

  it('ignores duplicates case-insensitively', () => {
    const repo = new MemorySettingsRepo()
    addFoodSuggestion(repo, 'Carrot')
    const next = addFoodSuggestion(repo, 'carrot')
    expect(next).toEqual(['Carrot'])
  })

  it('removes a suggestion', () => {
    const repo = new MemorySettingsRepo()
    addFoodSuggestion(repo, 'carrot')
    addFoodSuggestion(repo, 'pear')
    const next = removeFoodSuggestion(repo, 'carrot')
    expect(next).toEqual(['pear'])
  })
})
