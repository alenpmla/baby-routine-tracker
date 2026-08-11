import { describe, it, expect } from 'vitest'
import { foodEmoji, foodIconKey, GENERIC_ICON } from '../foodIcons'

describe('foodIconKey', () => {
  it('maps known single-word foods to their icon key', () => {
    expect(foodIconKey('banana')).toBe('banana')
    expect(foodIconKey('apple')).toBe('apple')
    expect(foodIconKey('salmon')).toBe('fish')
    expect(foodIconKey('carrot')).toBe('root-veg')
    expect(foodIconKey('cheese')).toBe('cheese')
    expect(foodIconKey('rice')).toBe('rice')
  })

  it('maps plurals to the same icon as the singular', () => {
    expect(foodIconKey('bananas')).toBe('banana')
    expect(foodIconKey('berries')).toBe('berry')
    expect(foodIconKey('peas')).toBe('legume')
  })

  it('resolves exact-name overrides before keyword matching', () => {
    expect(foodIconKey('porridge (with apple)')).toBe('apple')
    expect(foodIconKey('porridge (with pears)')).toBe('pear')
    expect(foodIconKey('sweet potato')).toBe('root-veg')
    expect(foodIconKey('cream cheese')).toBe('cheese')
  })

  it('falls back to the food-group icon for recognized group keywords', () => {
    expect(foodIconKey('chicken')).toBe('poultry')
    expect(foodIconKey('lentils')).toBe('legume')
    expect(foodIconKey('kale')).toBe('leafy')
  })

  it('is case-insensitive and trims whitespace', () => {
    expect(foodIconKey('  BANANA ')).toBe('banana')
    expect(foodIconKey('Apple')).toBe('apple')
  })

  it('returns the generic icon for unknown or empty names', () => {
    expect(foodIconKey('zzz qwerty')).toBe(GENERIC_ICON)
    expect(foodIconKey('   ')).toBe(GENERIC_ICON)
    expect(foodIconKey('')).toBe(GENERIC_ICON)
  })

  it('resolves every food in the user-exported suggestion list to a specific (non-generic) icon', () => {
    const foods = [
      'salmon', 'beef', 'Sweet potato', 'Zucchini', 'Carrot', 'Chicken', 'Corn porridge',
      'Oats porridge', 'Rice porridge', 'Rice', 'Peas', 'Spinach', 'Pumpkin', 'Peaches',
      'Egg', 'Pears', 'Hip', 'Apple', 'Potato', 'Peach', 'Pear', 'Banana', 'Corn', 'Fish',
      'Oats', 'Parsnip', 'Broccoli', 'Brinjal', 'Kiwi', 'Avocado', 'Porridge', 'Cauliflower',
      'Green beans', 'Cucumber', 'Tomato', 'Bell pepper', 'Beetroot', 'Aubergine', 'Celery',
      'Leek', 'Sweetcorn', 'Nectarine', 'Plum', 'Apricot', 'Mango', 'Papaya', 'Melon',
      'Watermelon', 'Strawberry', 'Blueberry', 'Raspberry', 'Blackberry', 'Cherry', 'Pineapple',
      'Orange', 'Mandarin', 'Clementine', 'Grapes', 'Millet', 'Millet porridge', 'Semolina',
      'Wheat', 'Whole wheat', 'Spelt', 'Barley', 'Rye', 'Quinoa', 'Buckwheat', 'Couscous',
      'Pasta', 'Bread', 'Turkey', 'Lamb', 'Pork', 'Cod', 'Haddock', 'Pollock', 'Trout',
      'Herring', 'Sardine', 'Mackerel', 'Yoghurt', 'Greek yoghurt', 'Cottage cheese',
      'Cream cheese', 'Cheese', 'Quark', 'Lentils', 'Red lentils', 'Chickpeas', 'Kidney beans',
      'Black beans', 'White beans', 'Tofu', 'Soy', 'Peanut', 'Peanut butter', 'Almond',
      'Almond butter', 'Cashew', 'Cashew butter', 'Hazelnut', 'Walnut', 'Sesame', 'Tahini',
      'Chia', 'Flaxseed',
    ]
    for (const food of foods) {
      expect(foodIconKey(food), food).not.toBe(GENERIC_ICON)
    }
  })
})

describe('foodEmoji', () => {
  it('resolves specific foods within a category to distinct emoji', () => {
    expect(foodEmoji('carrot')).toBe('🥕')
    expect(foodEmoji('potato')).toBe('🥔')
    expect(foodEmoji('parsnip')).toBe('🥕')
    expect(foodEmoji('beetroot')).toBe('🥕')
    expect(foodEmoji('sweet potato')).toBe('🍠')
    expect(foodEmoji('apple')).toBe('🍎')
    expect(foodEmoji('pear')).toBe('🍐')
    expect(foodEmoji('banana')).toBe('🍌')
    expect(foodEmoji('grapes')).toBe('🍇')
    expect(foodEmoji('corn')).toBe('🌽')
  })

  it('resolves per-food emoji for fish and dairy', () => {
    expect(foodEmoji('salmon')).toBe('🐟')
    expect(foodEmoji('cod')).toBe('🐟')
    expect(foodEmoji('cheese')).toBe('🧀')
    expect(foodEmoji('yoghurt')).toBe('🥛')
  })

  it('handles plurals and exact overrides', () => {
    expect(foodEmoji('carrots')).toBe('🥕')
    expect(foodEmoji('bananas')).toBe('🍌')
    expect(foodEmoji('berries')).toBe('🫐')
    expect(foodEmoji('porridge (with apple)')).toBe('🍎')
    expect(foodEmoji('sweet potato')).toBe('🍠')
  })

  it('is case-insensitive and trims whitespace', () => {
    expect(foodEmoji('  CARROT ')).toBe('🥕')
    expect(foodEmoji('Apple')).toBe('🍎')
  })

  it('falls back to generic for unknown or empty names', () => {
    expect(foodEmoji('zzz qwerty')).toBe('🍽️')
    expect(foodEmoji('   ')).toBe('🍽️')
    expect(foodEmoji('')).toBe('🍽️')
  })

  it('resolves every exported food to a non-generic emoji', () => {
    const foods = [
      'salmon', 'beef', 'Sweet potato', 'Zucchini', 'Carrot', 'Chicken', 'Corn porridge',
      'Oats porridge', 'Rice porridge', 'Rice', 'Peas', 'Spinach', 'Pumpkin', 'Peaches',
      'Egg', 'Pears', 'Hip', 'Apple', 'Potato', 'Peach', 'Pear', 'Banana', 'Corn', 'Fish',
      'Oats', 'Parsnip', 'Broccoli', 'Brinjal', 'Kiwi', 'Avocado', 'Porridge', 'Cauliflower',
      'Green beans', 'Cucumber', 'Tomato', 'Bell pepper', 'Beetroot', 'Aubergine', 'Celery',
      'Leek', 'Sweetcorn', 'Nectarine', 'Plum', 'Apricot', 'Mango', 'Papaya', 'Melon',
      'Watermelon', 'Strawberry', 'Blueberry', 'Raspberry', 'Blackberry', 'Cherry', 'Pineapple',
      'Orange', 'Mandarin', 'Clementine', 'Grapes', 'Millet', 'Millet porridge', 'Semolina',
      'Wheat', 'Whole wheat', 'Spelt', 'Barley', 'Rye', 'Quinoa', 'Buckwheat', 'Couscous',
      'Pasta', 'Bread', 'Turkey', 'Lamb', 'Pork', 'Cod', 'Haddock', 'Pollock', 'Trout',
      'Herring', 'Sardine', 'Mackerel', 'Yoghurt', 'Greek yoghurt', 'Cottage cheese',
      'Cream cheese', 'Cheese', 'Quark', 'Lentils', 'Red lentils', 'Chickpeas', 'Kidney beans',
      'Black beans', 'White beans', 'Tofu', 'Soy', 'Peanut', 'Peanut butter', 'Almond',
      'Almond butter', 'Cashew', 'Cashew butter', 'Hazelnut', 'Walnut', 'Sesame', 'Tahini',
      'Chia', 'Flaxseed',
    ]
    for (const food of foods) {
      expect(foodEmoji(food), food).not.toBe('🍽️')
    }
  })
})
