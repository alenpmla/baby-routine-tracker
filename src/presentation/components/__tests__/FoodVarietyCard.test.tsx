import { describe, it, expect } from 'vitest'
import { headline } from '../FoodVarietyCard'

describe('FoodVarietyCard headline', () => {
  it('reports an excellent week when all groups are covered', () => {
    expect(headline(7, 7)).toMatch(/Excellent — all 7 food groups covered this week/)
  })

  it('reports a great mix when only a couple of groups are missing', () => {
    expect(headline(6, 7)).toMatch(/Great mix — 6 of 7 food groups covered/)
    expect(headline(5, 7)).toMatch(/Great mix — 5 of 7 food groups covered/)
  })

  it('reports a good start for a half-covered week', () => {
    expect(headline(4, 7)).toMatch(/Good start — 4 of 7 food groups covered/)
  })

  it('reports a few groups yet when coverage is low', () => {
    expect(headline(2, 7)).toMatch(/A few groups yet — 2 of 7 food groups covered/)
    expect(headline(0, 7)).toMatch(/A few groups yet — 0 of 7 food groups covered/)
  })
})
