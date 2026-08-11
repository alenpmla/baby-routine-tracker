# Food picker: leading emoji icon per food row

## Goal

Make the food picker rows faster to scan by showing a leading food emoji icon next to
each food name (e.g. 🍌 banana, 🍎 apple, 🐟 salmon, 🥕 carrot). No image assets —
emoji only, so it stays offline-capable, tiny, and zero-maintenance for a user-editable
suggestion list. Photos are out of scope.

## Requirements

- Every row in the picker list (most-used items and the regular suggestion list, and
  search matches) shows a leading food emoji before the checkbox row content.
- Icon resolution: an **exact-name override map** wins; otherwise match against food
  keywords (reusing the `FOOD_GROUP_DEFS` tokenization approach) to pick a food emoji;
  otherwise fall back to a generic food emoji (🍽️).
- The emoji is decorative (aria-hidden); the accessible name of the row stays the food
  name.
- Behaviour unchanged: single flat list (most-used top + divider + rest), clear-search
  suffix, pre-check, Done-close, nested Escape, no free text, full-screen sheet.

## Acceptance criteria

- Each visible food row shows a leading emoji; known foods resolve to a sensible food
  emoji (e.g. banana → 🍌, apple → 🍎, salmon → 🐟), unknown foods show the generic 🍽️.
- Exact-name overrides beat keyword matching (e.g. "porridge (with apple)" vs
  "(with pears)" map distinctly where overridden).
- The emoji is `aria-hidden` and does not change the row's accessible name.
- `npm run build` and `npm test` pass.

## Constraints

- New domain helper (e.g. `src/domain/usecase/foodIcons.ts` or extend `foodVariety`-adjacent
  utils) exposing `foodEmoji(name: string): string`. Deterministic, pure, no assets.
- Keep the existing classification keywords as the keyword source (import from
  `FoodGroup.ts` or reuse `tokenizeFood`/`classifyFood` from `foodVariety.ts`).
- CSS in `src/index.css` for the leading emoji span in `.food-suggest-item`.
- No new runtime dependencies.

## Context

- `foodVariety.ts` exports `tokenizeFood` and `classifyFood`, and `FOOD_GROUP_DEFS`
  (with per-group keywords) lives in `FoodGroup.ts`. Reuse these for keyword matching.
- Rows render via `renderItem(food)` in `FoodMultiSelect.tsx` (single shared renderer
  for most-used and regular items) — the emoji goes there so all rows get it for free.
