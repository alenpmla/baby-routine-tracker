import { describe, it, expect } from 'vitest'
import { getMostUsedFoods } from '../foodFrequency'
import type { FeedingRepository } from '../../repository/repositories'
import type { FeedingSession } from '../../model/FeedingSession'

function makeRepo(feedings: FeedingSession[]): FeedingRepository {
  return {
    getAll: () => feedings,
    add: () => {},
    update: () => {},
    delete: () => {},
  }
}

function solids(id: string, foods: string[]): FeedingSession {
  return { id, time: '2026-01-01T00:00:00Z', type: 'solids', foods }
}

describe('getMostUsedFoods', () => {
  it('orders suggestions by frequency desc and breaks ties by name asc', () => {
    const repo = makeRepo([
      solids('f1', ['banana']),
      solids('f2', ['banana']),
      solids('f3', ['banana']),
      solids('f4', ['apple']),
      solids('f5', ['apple']),
      solids('f6', ['carrot']),
    ])
    const result = getMostUsedFoods(repo, ['apple', 'banana', 'carrot'])
    expect(result).toEqual(['banana', 'apple', 'carrot'])
  })

  it('counts each food once per feed (duplicates inside one feed do not inflate)', () => {
    const repo = makeRepo([solids('f1', ['banana', 'banana', 'apple'])])
    expect(getMostUsedFoods(repo, ['banana', 'apple'])).toEqual(['apple', 'banana'])
  })

  it('is case-insensitive for frequency and preserves suggestion casing', () => {
    const repo = makeRepo([
      solids('f1', ['Banana']),
      solids('f2', ['BANANA']),
    ])
    expect(getMostUsedFoods(repo, ['Banana'])).toEqual(['Banana'])
  })

  it('only returns foods present in the suggestion list', () => {
    const repo = makeRepo([
      solids('f1', ['banana']),
      solids('f2', ['unknown']),
    ])
    expect(getMostUsedFoods(repo, ['banana'])).toEqual(['banana'])
  })

  it('respects the limit', () => {
    const repo = makeRepo([solids('f1', ['a', 'b', 'c', 'd'])])
    expect(getMostUsedFoods(repo, ['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b'])
  })

  it('returns [] for an empty repo or empty suggestions', () => {
    expect(getMostUsedFoods(makeRepo([]), ['banana'])).toEqual([])
    expect(getMostUsedFoods(makeRepo([solids('f1', ['banana'])]), [])).toEqual([])
  })

  it('ignores non-solids feeds', () => {
    const repo = makeRepo([
      { id: 'b1', time: '2026-01-01T00:00:00Z', type: 'bottle', foods: ['banana'] } as FeedingSession,
    ])
    expect(getMostUsedFoods(repo, ['banana'])).toEqual([])
  })
})
