export type FoodGroupId =
  | 'iron'
  | 'protein'
  | 'vegetables'
  | 'fruit'
  | 'grains'
  | 'dairy'
  | 'legumes'

export interface FoodGroupDef {
  id: FoodGroupId
  label: string
  /** Static "none yet — try …" hint shown when the group is uncovered. */
  trySuggestion: string
  /** Exact token matches (lowercased) that classify a food into this group. */
  keywords: string[]
}

export const FOOD_GROUP_DEFS: FoodGroupDef[] = [
  {
    id: 'iron',
    label: 'Iron-rich',
    trySuggestion: 'beef · lentils · fortified cereal',
    keywords: [
      'beef', 'chicken', 'chicke', 'turkey', 'liver', 'lentils', 'lentil', 'beans', 'bean',
      'chickpeas', 'chickpea', 'spinach', 'kale', 'broccoli', 'oats', 'oatmeal',
      'porridge', 'portage', 'qorg', 'cereal', 'fortified', 'tofu', 'prunes', 'prune',
      'apricots', 'apricot', 'eggs', 'egg',
    ],
  },
  {
    id: 'protein',
    label: 'Protein',
    trySuggestion: 'chicken · fish · eggs · yogurt',
    keywords: [
      'beef', 'chicken', 'chicke', 'turkey', 'fish', 'salmon', 'sakmon', 'tuna', 'eggs',
      'egg', 'tofu', 'yogurt', 'cheese', 'lentils', 'lentil', 'beans', 'bean', 'chickpeas',
      'chickpea', 'pork', 'lamb', 'ham', 'sausage',
    ],
  },
  {
    id: 'vegetables',
    label: 'Vegetables',
    trySuggestion: 'broccoli · sweet potato · peas',
    keywords: [
      'broccoli', 'carrots', 'carrot', 'cattot', 'catty', 'potato', 'potatoes', 'pototo',
      'peas', 'pea', 'spinach', 'kale', 'pumpkin', 'squash', 'zucchini', 'zuchini',
      'cauliflower', 'beans', 'bean', 'avocado', 'avacado', 'acvado', 'acavado', 'avado',
      'brinjal', 'parsnip', 'parship', 'cabbage', 'tomato', 'tomatoes', 'corn',
    ],
  },
  {
    id: 'fruit',
    label: 'Fruit',
    trySuggestion: 'banana · apple · pear',
    keywords: [
      'banana', 'bananas', 'banna', 'baanan', 'apple', 'apples', 'pear', 'pears', 'prars',
      'mango', 'peaches', 'peach', 'plums', 'plum', 'blueberry', 'blueberries',
      'strawberry', 'strawberries', 'raspberry', 'raspberries', 'apricot', 'apricots',
      'prune', 'prunes', 'orange', 'oranges', 'melon', 'kiwi', 'papaya', 'grape', 'grapes',
    ],
  },
  {
    id: 'grains',
    label: 'Grains',
    trySuggestion: 'porridge · rice · pasta',
    keywords: [
      'rice', 'oats', 'oatmeal', 'porridge', 'portage', 'qorg', 'cereal', 'bread',
      'toast', 'pasta', 'quinoa', 'barley', 'couscous', 'wheat', 'noodles', 'noodle',
    ],
  },
  {
    id: 'dairy',
    label: 'Dairy',
    trySuggestion: 'yogurt · cheese',
    keywords: ['yogurt', 'cheese', 'milk', 'cottage', 'butter', 'cream', 'kefir', 'curd'],
  },
  {
    id: 'legumes',
    label: 'Legumes',
    trySuggestion: 'lentils · chickpeas · hummus',
    keywords: [
      'lentils', 'lentil', 'beans', 'bean', 'chickpeas', 'chickpea', 'peas', 'pea',
      'hummus', 'soy', 'tofu', 'edamame',
    ],
  },
]
