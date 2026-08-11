# Food picker: replace emoji with custom inline SVG icons

## Goal

The food picker rows currently show a leading emoji. Emoji render inconsistently
across devices and read as "emoji" rather than UI icons. Replace them with **custom
inline SVG food icons** drawn in the app's existing stroke-based icon style
(monochrome, `currentColor`, matching `icons.tsx`). Icons are category-mapped over the
food list with a generic fallback icon.

## Requirements

- Replace the emoji span in `FoodMultiSelect.renderItem` with an inline SVG icon
  component (`<FoodIcon name="salmon" />` or similar), rendered at a consistent size
  and color (inherits `currentColor`).
- A set of ~35–45 hand-drawn stroke SVG icons covering the categories present in the
  food list: fish/seafood, meat/poultry, egg, dairy, nuts/seeds, legumes, grains,
  porridge, rice, bread/pasta, leafy greens, root veg, squash, brassica, fruit,
  berries, citrus, melon, tropical, baby bottle, generic food.
- Mapping reuses the existing emoji resolution order (exact-name override → keyword →
  group) but returns an icon **key** instead of an emoji. Every food in the user's
  exported 107-item list must map to a specific icon (no generic fallback for them).
- The icon is decorative (`aria-hidden`); the row accessible name stays the food name.
- No new runtime dependencies; SVG defined inline in a `FoodIcons.tsx` module.

## Acceptance criteria

- Every food row shows an inline SVG icon (not an emoji); all 107 exported foods map
  to a specific icon.
- Icons share a consistent stroke style (24px viewBox, stroke `currentColor`, rounded
  caps) and render at a uniform size.
- Unknown foods show a generic food icon (🍽️-equivalent SVG).
- The icon is `aria-hidden`; row accessible name unchanged.
- `npm run build` and `npm test` pass.

## Constraints

- Follow the app's existing icon conventions in `src/presentation/components/icons.tsx`
  (stroke-based, `aria-hidden`, `size` prop). Add food icons to that file or a sibling
  `foodIcons.tsx`.
- Replace the domain emoji helper usage with the icon mapping; keep the domain
  `foodIcons.ts`? Decision: the SVG icon *set* is presentation; the food→icon **key**
  resolution can live in presentation (`foodIconKey(name)`) or stay in domain. Prefer a
  presentation module (`foodIconKey`) that mirrors the existing emoji map, and delete
  or stop using the emoji helper in the picker.
- No new runtime dependencies.

## Context

- `FoodMultiSelect.tsx` renders `<span className="food-item-emoji" aria-hidden="true">{foodEmoji(food)}</span>`.
- `src/domain/usecase/foodIcons.ts` currently maps food names → emoji; its exact-override
  and keyword resolution is still valuable, so refactor to return a stable icon key.
- `icons.tsx` defines the project's SVG icon style (e.g. `BowlIcon`, `ChevronDownIcon`).
- The user's exported food list (107 entries) is the coverage target.
