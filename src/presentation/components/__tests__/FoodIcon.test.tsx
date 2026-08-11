import { describe, it, expect } from 'vitest'
import { FOOD_ICON_COLORS } from '../FoodIcon'
import { GENERIC_ICON } from '../../../domain/usecase/foodIcons'

describe('FOOD_ICON_COLORS', () => {
  it('provides an accent color for every icon key, including generic', () => {
    expect(FOOD_ICON_COLORS[GENERIC_ICON]).toBe('#9E9E9E')
    expect(Object.keys(FOOD_ICON_COLORS).length).toBeGreaterThan(30)
    for (const [key, color] of Object.entries(FOOD_ICON_COLORS)) {
      expect(color, key).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })

  it('assigns distinct meaningful hues to distinct categories', () => {
    // fish is blue-ish, apple/tomato red-ish, leafy/legume green-ish
    expect(FOOD_ICON_COLORS.fish.toLowerCase()).toBe('#1e88e5')
    expect(FOOD_ICON_COLORS.apple.toLowerCase()).toBe('#e53935')
    expect(FOOD_ICON_COLORS.leafy.toLowerCase()).toBe('#43a047')
  })
})
