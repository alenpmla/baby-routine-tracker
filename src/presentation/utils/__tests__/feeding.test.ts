import { describe, it, expect } from 'vitest'
import {
  describeAmount,
  describeBottleTotal,
  describeFeedingMeta,
  describeFeedingTitle,
  describeSolidsTotal,
} from '../feeding'
import type { FeedingSession } from '../../../domain/model/FeedingSession'

describe('feeding display helpers', () => {
  it('describes solids with foods and amount', () => {
    const f = {
      id: 'x',
      time: 't',
      type: 'solids' as const,
      foods: ['Avocado', 'salmon'],
      amount: 2,
      unit: 'oz' as const,
    }
    expect(describeFeedingTitle(f)).toBe('Solids · Avocado, salmon')
    expect(describeFeedingMeta(f)).toBe('2 oz')
  })

  it('describes legacy solids with a single food', () => {
    const f = {
      id: 'x',
      time: 't',
      type: 'solids' as const,
      food: 'Banana',
      amount: 2,
      unit: 'oz' as const,
    }
    expect(describeFeedingTitle(f)).toBe('Solids · Banana')
  })

  it('describes breast duration', () => {
    const f = {
      id: 'x',
      time: '2026-08-08T10:00:00.000Z',
      type: 'breast' as const,
      startTime: '2026-08-08T10:00:00.000Z',
      endTime: '2026-08-08T10:25:00.000Z',
    }
    expect(describeFeedingTitle(f)).toBe('Breast')
    expect(describeFeedingMeta(f)).toBe('25m')
  })
})

describe('snapshot totals', () => {
  const solids = (amount: number, unit: 'gram' | 'oz'): FeedingSession => ({
    id: 's',
    time: 't',
    type: 'solids',
    foods: ['x'],
    amount,
    unit,
  })
  const bottle = (amount: number, unit: 'ml' | 'oz'): FeedingSession => ({
    id: 'b',
    time: 't',
    type: 'bottle',
    amount,
    unit,
  })

  it('sums solids in grams and converts oz', () => {
    expect(describeSolidsTotal([solids(100, 'gram'), solids(2, 'oz')], 'g')).toBe('157g')
    expect(describeSolidsTotal([solids(150, 'gram')], 'oz')).toBe('5.3oz')
  })

  it('sums solids in oz and converts grams', () => {
    expect(describeSolidsTotal([solids(2, 'oz'), solids(28.35, 'gram')], 'g')).toBe('85g')
    expect(describeSolidsTotal([solids(1.5, 'oz'), solids(1, 'oz')], 'oz')).toBe('2.5oz')
  })

  it('ignores non-solids feeds', () => {
    expect(describeSolidsTotal([bottle(240, 'ml')], 'g')).toBe('')
    expect(describeBottleTotal([solids(50, 'gram')], 'ml')).toBe('')
  })

  it('sums bottles in ml and converts oz', () => {
    expect(describeBottleTotal([bottle(200, 'ml'), bottle(2, 'oz')], 'ml')).toBe('259ml')
    expect(describeBottleTotal([bottle(4, 'oz')], 'ml')).toBe('118ml')
  })

  it('sums bottles in oz and converts ml', () => {
    expect(describeBottleTotal([bottle(240, 'ml')], 'oz')).toBe('8.1oz')
    expect(describeBottleTotal([bottle(6, 'oz'), bottle(120, 'ml')], 'oz')).toBe('10.1oz')
  })
})

describe('describeAmount (per-record conversion)', () => {
  it('converts oz to grams', () => {
    expect(describeAmount(2, 'oz', 'g')).toBe('57g')
    expect(describeAmount(0.5, 'oz', 'g')).toBe('14g')
  })

  it('converts grams to oz', () => {
    expect(describeAmount(150, 'gram', 'oz')).toBe('5.3oz')
    expect(describeAmount(30, 'gram', 'g')).toBe('30g')
  })

  it('converts oz to ml and ml to oz', () => {
    expect(describeAmount(4, 'oz', 'ml')).toBe('118ml')
    expect(describeAmount(240, 'ml', 'oz')).toBe('8.1oz')
    expect(describeAmount(120, 'ml', 'ml')).toBe('120ml')
  })
})
