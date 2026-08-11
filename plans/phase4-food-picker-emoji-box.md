# Food picker: emoji icons inside the existing tinted box

## Goal

Replace the hand-drawn SVG food icons with emoji, keeping the current per-category
accent-tinted box (`.food-item-icon`) exactly as it is. The emoji gives a friendly,
instantly recognizable glyph; the colored box stays.

## Requirements

- Each food row shows the food's **emoji** (from `FOOD_ICON_EMOJI[foodIconKey(food)]`)
  inside the existing `.food-item-icon` tinted box.
- The box keeps its current look: 34px rounded, background `color-mix(in srgb,
  var(--food-icon-accent) 14%, transparent)`, accent set per category from
  `FOOD_ICON_COLORS`.
- Remove the now-unused SVG `FoodIcon` component and `ICON_PATHS` (dead code).
- Emoji is decorative (`aria-hidden`); row accessible name stays the food name.
- Behaviour unchanged: single flat list (most-used top + divider + rest), clear-search
  suffix, pre-check, Done-close, nested Escape, no free text, full-screen sheet.

## Acceptance criteria

- Each row renders an emoji glyph (not an SVG) inside the tinted box.
- The box still carries the per-category accent (`--food-icon-accent`), e.g. salmon →
  fish `#1E88E5`; apple → apple `#E53935`.
- Every `FoodIconKey` maps to a non-empty emoji; generic → 🍽️.
- All 107 foods in the user-exported list resolve to a non-generic emoji.
- The emoji is aria-hidden; accessible name unchanged.
- `npm run build` and `npm test` pass.

## Constraints

- Keep `foodIconKey` (domain) and `FOOD_ICON_COLORS` (presentation) untouched.
- Add `FOOD_ICON_EMOJI: Record<FoodIconKey, string>` in `src/presentation/components/FoodIcon.tsx`.
- Minor `.food-item-icon` CSS tweak for emoji centering only (size/tint/radius unchanged).
- No new runtime dependencies.

## Context

- `FoodMultiSelect.renderItem` currently renders `<FoodIcon name={foodIconKey(food)} />`
  inside the `.food-item-icon` span that sets `--food-icon-accent`.
- `FoodIcon.tsx` holds both the SVG `ICON_PATHS` and `FOOD_ICON_COLORS`.
- Prior WP073 established the emoji choices (fish 🐟, apple 🍎, etc.); reuse those values.
