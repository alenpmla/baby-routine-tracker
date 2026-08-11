import { FOOD_GROUP_DEFS } from '../model/FoodGroup'

/**
 * Deterministic food-name → icon-key mapping used in the food picker rows.
 * Resolution order: exact-name override → keyword token match → group keyword → generic.
 * The returned key selects a stroke SVG in the presentation FoodIcon component.
 */

export type FoodIconKey =
  | 'fish'
  | 'meat'
  | 'poultry'
  | 'egg'
  | 'root-veg'
  | 'leafy'
  | 'brassica'
  | 'squash'
  | 'gourd'
  | 'aubergine'
  | 'tomato'
  | 'pepper'
  | 'legume'
  | 'corn'
  | 'grain'
  | 'rice'
  | 'porridge'
  | 'pasta'
  | 'bread'
  | 'avocado'
  | 'banana'
  | 'apple'
  | 'pear'
  | 'stone-fruit'
  | 'mango'
  | 'melon'
  | 'watermelon'
  | 'berry'
  | 'cherry'
  | 'pineapple'
  | 'citrus'
  | 'grapes'
  | 'kiwi'
  | 'dairy'
  | 'cheese'
  | 'nut'
  | 'seed'
  | 'butter'
  | 'bottle'
  | 'generic'

export const GENERIC_ICON: FoodIconKey = 'generic'

/** Exact (lowercased) name overrides — beat keyword matching for ambiguous names. */
const EXACT_OVERRIDES: Record<string, FoodIconKey> = {
  'porridge (with apple)': 'apple',
  'porridge (with pears)': 'pear',
  'porridge (with banana)': 'banana',
  'porridge (with berries)': 'berry',
  'sweet potato': 'root-veg',
  'brussels sprouts': 'brassica',
  'cream cheese': 'cheese',
  'greek yoghurt': 'dairy',
  'kidney beans': 'legume',
  'black beans': 'legume',
  'white beans': 'legume',
  'green beans': 'legume',
  'red lentils': 'legume',
  'whole wheat': 'grain',
  'bell pepper': 'pepper',
  'peanut butter': 'butter',
  'almond butter': 'butter',
  'cashew butter': 'butter',
}

/** Lowercased keyword → icon key. Token must match exactly (after singularization). */
const KEYWORD_ICON: Record<string, FoodIconKey> = {
  banana: 'banana',
  apple: 'apple',
  pear: 'pear',
  peach: 'stone-fruit',
  peaches: 'stone-fruit',
  plum: 'stone-fruit',
  apricot: 'stone-fruit',
  nectarine: 'stone-fruit',
  mango: 'mango',
  papaya: 'melon',
  melon: 'melon',
  watermelon: 'watermelon',
  kiwi: 'kiwi',
  grape: 'grapes',
  grapes: 'grapes',
  strawberry: 'berry',
  raspberry: 'berry',
  blueberry: 'berry',
  blackberry: 'berry',
  berry: 'berry',
  cherry: 'cherry',
  pineapple: 'pineapple',
  orange: 'citrus',
  mandarin: 'citrus',
  clementine: 'citrus',
  lemon: 'citrus',
  prune: 'stone-fruit',
  tomato: 'tomato',
  avocado: 'avocado',
  broccoli: 'brassica',
  cauliflower: 'brassica',
  cabbage: 'leafy',
  kale: 'leafy',
  spinach: 'leafy',
  lettuce: 'leafy',
  celery: 'leafy',
  leek: 'leafy',
  corn: 'corn',
  sweetcorn: 'corn',
  carrot: 'root-veg',
  potato: 'root-veg',
  sweetpotato: 'root-veg',
  parsnip: 'root-veg',
  beetroot: 'root-veg',
  aubergine: 'aubergine',
  eggplant: 'aubergine',
  brinjal: 'aubergine',
  pumpkin: 'squash',
  squash: 'squash',
  zucchini: 'gourd',
  cucumber: 'gourd',
  pepper: 'pepper',
  pea: 'legume',
  peas: 'legume',
  bean: 'legume',
  beans: 'legume',
  lentil: 'legume',
  lentils: 'legume',
  chickpea: 'legume',
  chickpeas: 'legume',
  hummus: 'legume',
  mushroom: 'generic',
  onion: 'generic',
  garlic: 'generic',
  ginger: 'generic',
  milk: 'dairy',
  yogurt: 'dairy',
  yoghurt: 'dairy',
  cream: 'dairy',
  kefir: 'dairy',
  curd: 'dairy',
  cottage: 'cheese',
  cheese: 'cheese',
  quark: 'cheese',
  butter: 'butter',
  egg: 'egg',
  eggs: 'egg',
  chicken: 'poultry',
  turkey: 'poultry',
  beef: 'meat',
  lamb: 'meat',
  pork: 'meat',
  ham: 'meat',
  sausage: 'meat',
  fish: 'fish',
  salmon: 'fish',
  tuna: 'fish',
  cod: 'fish',
  haddock: 'fish',
  pollock: 'fish',
  trout: 'fish',
  herring: 'fish',
  sardine: 'fish',
  mackerel: 'fish',
  tofu: 'legume',
  soy: 'legume',
  rice: 'rice',
  oats: 'porridge',
  oatmeal: 'porridge',
  porridge: 'porridge',
  cereal: 'porridge',
  millet: 'grain',
  semolina: 'grain',
  spelt: 'grain',
  rye: 'grain',
  buckwheat: 'grain',
  bread: 'bread',
  toast: 'bread',
  pasta: 'pasta',
  noodle: 'pasta',
  noodles: 'pasta',
  quinoa: 'grain',
  barley: 'grain',
  couscous: 'grain',
  wheat: 'grain',
  peanut: 'nut',
  almond: 'nut',
  cashew: 'nut',
  hazelnut: 'nut',
  walnut: 'nut',
  sesame: 'seed',
  tahini: 'seed',
  chia: 'seed',
  flaxseed: 'seed',
  hip: 'bottle',
}

/** Keywords are matched on lowercased alphanumeric tokens. */
function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
}

/** Best-effort singularization so plurals resolve to the same icon. */
function singular(token: string): string {
  if (token.endsWith('ies') && token.length > 3) {
    return `${token.slice(0, -3)}y`
  }
  if (token.endsWith('s') && token.length > 2) {
    return token.slice(0, -1)
  }
  return token
}

/** Map food-group ids to a group icon key as a final fallback layer. */
const GROUP_ICON: Record<string, FoodIconKey> = {
  iron: 'meat',
  protein: 'poultry',
  vegetables: 'leafy',
  fruit: 'apple',
  grains: 'grain',
  dairy: 'dairy',
  legumes: 'legume',
}

/** Every keyword known to the food groups (lowercased). */
const GROUP_KEYWORDS: Record<string, FoodIconKey> = {}
for (const def of FOOD_GROUP_DEFS) {
  for (const kw of def.keywords) {
    GROUP_KEYWORDS[kw] = GROUP_ICON[def.id]
  }
}

export function foodIconKey(name: string): FoodIconKey {
  const lower = name.trim().toLowerCase()
  if (EXACT_OVERRIDES[lower]) {
    return EXACT_OVERRIDES[lower]
  }

  const tokens = tokenize(lower)
  if (tokens.length === 0) {
    return GENERIC_ICON
  }

  // Exact keyword-token match first (trying the singular form too).
  for (const token of tokens) {
    const direct = KEYWORD_ICON[token] ?? KEYWORD_ICON[singular(token)]
    if (direct) {
      return direct
    }
  }

  // Then fall back to the food-group classification icon.
  for (const token of tokens) {
    const group = GROUP_KEYWORDS[token]
    if (group) {
      return group
    }
  }

  return GENERIC_ICON
}

/** Per-food emoji values, resolved by name (more specific than the category map). */
const GENERIC_EMOJI = '🍽️'

/** Exact (lowercased) name → emoji, beating keyword matching for ambiguous names. */
const EXACT_EMOJI: Record<string, string> = {
  'porridge (with apple)': '🍎',
  'porridge (with pears)': '🍐',
  'porridge (with banana)': '🍌',
  'porridge (with berries)': '🫐',
  'sweet potato': '🍠',
  'brussels sprouts': '🥦',
  'cream cheese': '🧀',
  'greek yoghurt': '🥛',
  'kidney beans': '🫛',
  'black beans': '🫛',
  'white beans': '🫛',
  'green beans': '🫛',
  'red lentils': '🫛',
  'whole wheat': '🌾',
  'bell pepper': '🫑',
  'peanut butter': '🥜',
  'almond butter': '🥜',
  'cashew butter': '🥜',
}

/** Lowercased keyword → emoji. Token must match exactly (after singularization). */
const KEYWORD_EMOJI: Record<string, string> = {
  banana: '🍌',
  apple: '🍎',
  pear: '🍐',
  peach: '🍑',
  peaches: '🍑',
  plum: '🍑',
  apricot: '🍑',
  nectarine: '🍑',
  mango: '🥭',
  papaya: '🍈',
  melon: '🍈',
  watermelon: '🍉',
  kiwi: '🥝',
  grape: '🍇',
  grapes: '🍇',
  strawberry: '🍓',
  raspberry: '🍓',
  blueberry: '🫐',
  blackberry: '🫐',
  berry: '🫐',
  cherry: '🍒',
  pineapple: '🍍',
  orange: '🍊',
  mandarin: '🍊',
  clementine: '🍊',
  lemon: '🍋',
  prune: '🍑',
  tomato: '🍅',
  avocado: '🥑',
  broccoli: '🥦',
  cauliflower: '🥦',
  cabbage: '🥬',
  kale: '🥬',
  spinach: '🥬',
  lettuce: '🥬',
  celery: '🥬',
  leek: '🥬',
  corn: '🌽',
  sweetcorn: '🌽',
  carrot: '🥕',
  potato: '🥔',
  sweetpotato: '🍠',
  parsnip: '🥕',
  beetroot: '🥕',
  aubergine: '🍆',
  eggplant: '🍆',
  brinjal: '🍆',
  pumpkin: '🎃',
  squash: '🎃',
  zucchini: '🥒',
  cucumber: '🥒',
  pepper: '🫑',
  pea: '🫛',
  peas: '🫛',
  bean: '🫛',
  beans: '🫛',
  lentil: '🫛',
  lentils: '🫛',
  chickpea: '🫛',
  chickpeas: '🫛',
  hummus: '🫛',
  mushroom: '🍄',
  onion: '🧅',
  garlic: '🧄',
  ginger: '🫚',
  milk: '🥛',
  yogurt: '🥛',
  yoghurt: '🥛',
  cream: '🥛',
  kefir: '🥛',
  curd: '🥛',
  cottage: '🧀',
  cheese: '🧀',
  quark: '🧀',
  butter: '🧈',
  egg: '🥚',
  eggs: '🥚',
  chicken: '🍗',
  turkey: '🍗',
  beef: '🥩',
  lamb: '🥩',
  pork: '🥩',
  ham: '🍖',
  sausage: '🌭',
  fish: '🐟',
  salmon: '🐟',
  tuna: '🐟',
  cod: '🐟',
  haddock: '🐟',
  pollock: '🐟',
  trout: '🐟',
  herring: '🐟',
  sardine: '🐟',
  mackerel: '🐟',
  tofu: '🥡',
  soy: '🥡',
  rice: '🍚',
  oats: '🥣',
  oatmeal: '🥣',
  porridge: '🥣',
  cereal: '🥣',
  millet: '🌾',
  semolina: '🌾',
  spelt: '🌾',
  rye: '🌾',
  buckwheat: '🌾',
  bread: '🍞',
  toast: '🍞',
  pasta: '🍝',
  noodle: '🍜',
  noodles: '🍜',
  quinoa: '🌾',
  barley: '🌾',
  couscous: '🌾',
  wheat: '🌾',
  peanut: '🥜',
  almond: '🥜',
  cashew: '🥜',
  hazelnut: '🌰',
  walnut: '🌰',
  sesame: '🫘',
  tahini: '🫘',
  chia: '🌱',
  flaxseed: '🌱',
  hip: '🍼',
}

/** Map food-group ids to a group emoji as the final fallback layer. */
const GROUP_EMOJI: Record<string, string> = {
  iron: '🥩',
  protein: '🍗',
  vegetables: '🥦',
  fruit: '🍎',
  grains: '🥣',
  dairy: '🥛',
  legumes: '🫛',
}

/** Every keyword known to the food groups (lowercased). */
const GROUP_EMOJI_LOOKUP: Record<string, string> = {}
for (const def of FOOD_GROUP_DEFS) {
  for (const kw of def.keywords) {
    GROUP_EMOJI_LOOKUP[kw] = GROUP_EMOJI[def.id]
  }
}

/** Resolves the emoji for a specific food name (carrot → 🥕, not the category glyph). */
export function foodEmoji(name: string): string {
  const lower = name.trim().toLowerCase()
  if (EXACT_EMOJI[lower]) {
    return EXACT_EMOJI[lower]
  }

  const tokens = tokenize(lower)
  if (tokens.length === 0) {
    return GENERIC_EMOJI
  }

  for (const token of tokens) {
    const direct = KEYWORD_EMOJI[token] ?? KEYWORD_EMOJI[singular(token)]
    if (direct) {
      return direct
    }
  }

  for (const token of tokens) {
    const group = GROUP_EMOJI_LOOKUP[token]
    if (group) {
      return group
    }
  }

  return GENERIC_EMOJI
}
