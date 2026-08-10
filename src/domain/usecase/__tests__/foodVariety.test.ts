import { describe, it, expect } from 'vitest'
import { canonicalFoodName, classifyFood, getFoodVariety, tokenizeFood } from '../foodVariety'
import type { FeedingSession } from '../../model/FeedingSession'
import type { FeedingRepository } from '../../repository/repositories'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date(2026, 7, 9, 12)

function feedingRepo(items: FeedingSession[]): FeedingRepository {
  return { getAll: () => items } as FeedingRepository
}

function solids(id: string, foods: string[], offsetMs: number): FeedingSession {
  return { id, time: new Date(NOW.getTime() + offsetMs).toISOString(), type: 'solids', foods }
}

describe('canonicalFoodName', () => {
  it('lowercases and trims without changing a canonical name', () => {
    expect(canonicalFoodName('  Potato  ')).toBe('potato')
    expect(canonicalFoodName('Banana')).toBe('banana')
  })

  it('collapses simple plurals only when the singular is a recognised keyword', () => {
    expect(canonicalFoodName('Peaches')).toBe('peach')
    expect(canonicalFoodName('pears')).toBe('pear')
    expect(canonicalFoodName('Peas')).toBe('pea')
    expect(canonicalFoodName('carrots')).toBe('carrot')
    expect(canonicalFoodName('oats')).toBe('oats')
    expect(canonicalFoodName('grapes')).toBe('grape')
  })

  it('handles es and ies plural endings', () => {
    expect(canonicalFoodName('potatoes')).toBe('potato')
    expect(canonicalFoodName('tomatoes')).toBe('tomato')
    expect(canonicalFoodName('strawberries')).toBe('strawberry')
    expect(canonicalFoodName('raspberries')).toBe('raspberry')
  })

  it('maps real-data misspellings to their canonical food', () => {
    expect(canonicalFoodName('pototo')).toBe('potato')
    expect(canonicalFoodName('Parship')).toBe('parsnip')
    expect(canonicalFoodName('sakmon')).toBe('salmon')
    expect(canonicalFoodName('zuchini')).toBe('zucchini')
  })

  it('keeps compound names intact', () => {
    expect(canonicalFoodName('Corn porridge')).toBe('corn porridge')
    expect(canonicalFoodName('Oats porridge')).toBe('oats porridge')
    expect(canonicalFoodName('Sweet potato')).toBe('sweet potato')
  })
})

describe('tokenizeFood', () => {
  it('splits on punctuation and lowercases', () => {
    expect(tokenizeFood('Porridge (with pears)')).toEqual(['porridge', 'with', 'pears'])
  })
})

describe('classifyFood', () => {
  it('maps beef to iron-rich and protein', () => {
    expect(classifyFood('beef')).toEqual(expect.arrayContaining(['iron', 'protein']))
    expect(classifyFood('beef')).not.toContain('vegetables')
  })

  it('maps banana to fruit only', () => {
    expect(classifyFood('banana')).toEqual(['fruit'])
  })

  it('does not confuse pear with pea (exact-token matching)', () => {
    expect(classifyFood('pear')).toEqual(['fruit'])
    expect(classifyFood('pear')).not.toContain('legumes')
    expect(classifyFood('peas')).toContain('legumes')
  })

  it('classifies a compound food into multiple groups', () => {
    const groups = classifyFood('Oats porridge')
    expect(groups).toEqual(expect.arrayContaining(['grains', 'iron']))
  })

  it('matches real-world misspellings from logged data', () => {
    expect(classifyFood('sakmon')).toContain('protein')
    expect(classifyFood('cattot')).toContain('vegetables')
    expect(classifyFood('catty')).toContain('vegetables')
    expect(classifyFood('portage')).toEqual(expect.arrayContaining(['grains', 'iron']))
    expect(classifyFood('qorg')).toContain('grains')
    expect(classifyFood('Avacado')).toContain('vegetables')
    expect(classifyFood('banna')).toContain('fruit')
    expect(classifyFood('baanan')).toContain('fruit')
    expect(classifyFood('prars')).toContain('fruit')
    expect(classifyFood('brinjal')).toContain('vegetables')
    expect(classifyFood('zuchini')).toContain('vegetables')
    expect(classifyFood('Parship')).toContain('vegetables')
    expect(classifyFood('pototo')).toContain('vegetables')
    expect(classifyFood('Corn porridge')).toEqual(expect.arrayContaining(['grains', 'iron', 'vegetables']))
  })
})

describe('getFoodVariety', () => {
  it('returns null when there are no solids feeds', () => {
    expect(getFoodVariety(feedingRepo([]), NOW)).toBeNull()
    expect(getFoodVariety(feedingRepo([{ id: 'b', time: new Date(NOW.getTime() - 1000).toISOString(), type: 'bottle' }]), NOW)).toBeNull()
  })

  it('covers groups from solids feeds and lists the foods eaten', () => {
    const feeds = [
      solids('f1', ['beef', 'broccoli'], -DAY),
      solids('f2', ['banana', 'rice'], -2 * DAY),
      solids('f3', ['yogurt'], -DAY),
    ]
    const variety = getFoodVariety(feedingRepo(feeds), NOW)
    expect(variety).not.toBeNull()
    if (!variety) return

    const iron = variety.groups.find((g) => g.id === 'iron')
    expect(iron?.covered).toBe(true)
    expect(iron?.foods).toEqual(['beef', 'broccoli'])

    const legumes = variety.groups.find((g) => g.id === 'legumes')
    expect(legumes?.covered).toBe(false)
    expect(legumes?.trySuggestion).toBe('lentils · chickpeas · hummus')

    expect(variety.coveredCount).toBe(6)
    expect(variety.totalGroups).toBe(7)
  })

  it('ignores feeds older than the window and non-solids', () => {
    const feeds = [
      solids('old', ['beef'], -10 * DAY),
      solids('b', ['beef'], -DAY),
      { id: 'milk', time: new Date(NOW.getTime() - DAY).toISOString(), type: 'bottle' } as FeedingSession,
    ]
    const variety = getFoodVariety(feedingRepo(feeds), NOW)
    if (!variety) return
    const iron = variety.groups.find((g) => g.id === 'iron')
    expect(iron?.covered).toBe(true)
  })

  it('returns null when only old solids exist', () => {
    expect(getFoodVariety(feedingRepo([solids('old', ['beef'], -10 * DAY)]), NOW)).toBeNull()
  })

  it('dedupes foods case-insensitively, preserving original casing', () => {
    const feeds = [
      solids('f1', ['Banana'], -DAY),
      solids('f2', ['banana'], -DAY),
    ]
    const variety = getFoodVariety(feedingRepo(feeds), NOW)
    if (!variety) return
    const fruit = variety.groups.find((g) => g.id === 'fruit')
    expect(fruit?.foods).toEqual(['Banana'])
  })

  it('honours a custom window size', () => {
    const feeds = [
      solids('oldish', ['beef'], -5 * DAY),
      solids('ancient', ['chicken'], -10 * DAY),
    ]
    const v7 = getFoodVariety(feedingRepo(feeds), NOW, 7)
    const v14 = getFoodVariety(feedingRepo(feeds), NOW, 14)
    expect(v7?.groups.find((g) => g.id === 'iron')?.foods).toEqual(['beef'])
    expect(v14?.groups.find((g) => g.id === 'protein')?.foods).toEqual(['beef', 'chicken'])
  })

  it('dedupes near-duplicate foods within a group (case, plural, misspelling)', () => {
    const feeds = [
      solids('f1', ['pototo', 'Parship', 'peach'], -DAY),
      solids('f2', ['Potato', 'Parsnip', 'Peaches', 'pears', 'Pears'], -DAY),
    ]
    const variety = getFoodVariety(feedingRepo(feeds), NOW)
    if (!variety) throw new Error('expected variety')

    const veg = variety.groups.find((g) => g.id === 'vegetables')
    expect(veg?.foods).toEqual(['Parsnip', 'Potato'])

    const fruit = variety.groups.find((g) => g.id === 'fruit')
    expect(fruit?.foods).toEqual(['peach', 'pear'])
  })

  it('keeps compound names distinct from their single-word components', () => {
    const feeds = [
      solids('f1', ['corn', 'Corn porridge', 'potato', 'sweet potato'], -DAY),
    ]
    const variety = getFoodVariety(feedingRepo(feeds), NOW)
    if (!variety) throw new Error('expected variety')

    const veg = variety.groups.find((g) => g.id === 'vegetables')
    expect(veg?.foods).toEqual(['corn', 'Corn porridge', 'potato', 'sweet potato'])

    const grains = variety.groups.find((g) => g.id === 'grains')
    expect(grains?.foods).toEqual(['Corn porridge'])
  })
})
