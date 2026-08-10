# Food variety: capitalise displayed food names

## Goal

Make every food name shown in the Food variety card start with a capital letter
(e.g. `beef` → `Beef`, `corn` → `Corn`, `peach` → `Peach`), matching names like
`Chicken` and `Banana` that are already capitalised in the recorded data.

## Requirements

- In the expanded per-group detail lists, each food name starts with an uppercase
  letter. Multi-word names keep the rest of the name as recorded
  (`sweet potato` → `Sweet potato`, `Corn porridge` stays `Corn porridge`).
- The uncovered "try …" suggestions follow the same rule
  (`none yet — try lentils · chickpeas · hummus` → `none yet — try Lentils · Chickpeas · Hummus`).
- Capitalisation is a **display-only** concern: the canonicalisation and group
  classification from WP057 are unchanged; domain output keeps its casing.

## Acceptance criteria

- On the Feeding screen, expanded Food variety rows show food names with a leading
  capital letter (covered foods and try-suggestion foods alike).
- Multi-word names capitalise only the first letter of the food name, not each word.
- `npm run build` passes.
- `npm test` passes (existing food-variety tests updated to the new display casing).

## Constraints

- Presentation-layer change only (`FoodVarietyCard.tsx`); no domain, store, or schema
  changes; no new runtime dependencies.
- Single task, no cross-WP dependencies.

## Context

- `FoodVarietyCard.tsx` renders `group.foods.join(' · ')` and
  `none yet — try ${group.trySuggestion}`.
- Foods may be lowercased after WP057 canonicalisation (e.g. `beef`, `pear`, `corn`);
  capitalisation should apply at render time via a small helper.
