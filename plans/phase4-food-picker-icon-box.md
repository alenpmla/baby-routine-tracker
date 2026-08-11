# Food picker: colored icon inside a tinted box

## Goal

Make the food icons look polished: each food icon should be **colored** based on the
food category, rendered inside a small **rounded box** whose background is the lightest
tint of that same color (matching M3 surface/container conventions). This replaces the
current monochrome on-surface-variant icon with a colored-icon-on-tinted-chip look.

## Requirements

- Each food row shows its SVG icon **colored** by category (a per-icon-key accent color).
- The icon sits inside a small rounded **box** (squircle/square) whose background is a
  light tint (e.g. `color-mix(in srgb, <accent> 12-14%, transparent)` or an M3
  surface-container variant) of the same accent color.
- Colors are assigned per `FoodIconKey` in one place (a presentation-level map), so all
  foods sharing an icon key share the color; the generic icon uses a neutral accent.
- Dark theme must still look correct: the tint box stays subtle against dark surfaces
  and the accent color remains legible.
- Icon stays `aria-hidden`; row accessible name unchanged; box is decorative.
- Behaviour unchanged: single flat list, most-used top + divider, clear suffix,
  pre-check, Done-close, nested Escape, no free text, full-screen sheet.

## Acceptance criteria

- Each row renders an icon with a per-category accent color inside a rounded tinted box.
- The box background is a light tint of the icon's own accent color (same hue family),
  not a fixed gray.
- Generic/unknown foods get a neutral accent + matching tint.
- Dark theme: tint box and accent remain legible/appropriate.
- `npm run build` and `npm test` pass.

## Constraints

- Add the color map to `src/presentation/components/FoodIcon.tsx` (or a sibling) keyed by
  `FoodIconKey`; expose accent via a CSS custom property or inline style so the wrapper
  can apply the tint box.
- Apply the box via CSS in `src/index.css` (e.g. `.food-item-icon` becomes a tinted
  rounded container sized ~32px; icon inside ~20px).
- Follow M3 color conventions (use existing `--md-*` tokens where practical and
  `color-mix` for tints); respect `prefers-color-scheme` dark via existing tokens.
- No new runtime dependencies.

## Context

- `FoodIcon.tsx` renders `ICON_PATHS[name]` with `stroke="currentColor"`; the row wraps
  it in `<span className="food-item-icon" aria-hidden="true">`.
- The picker row uses `.food-suggest-item` with an icon slot; only the icon wrapper and
  `FoodIcon` need changes.
- FoodIconKey set: fish, meat, poultry, egg, root-veg, leafy, brassica, squash, gourd,
  aubergine, tomato, pepper, legume, corn, grain, rice, porridge, pasta, bread, avocado,
  banana, apple, pear, stone-fruit, mango, melon, watermelon, berry, cherry, pineapple,
  citrus, grapes, kiwi, dairy, cheese, nut, seed, butter, bottle, generic.
