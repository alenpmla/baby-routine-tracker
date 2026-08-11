# Food picker: small emoji box in selected-food chips and solids record rows

## Goal

Extend the small tinted emoji box (`.food-item-icon`, as used in the food picker list)
to two more places so the food visuals stay consistent:

1. **Selected-food chips** in the "Add solid food" sheet (the `.food-tag` chips under the
   "+ Add foods" row) — show a small emoji box before the food name.
2. **Solids feeding record rows** in the Feeding timeline — for solids feeds, show the
   emoji box (first food's emoji) in place of the generic feed icon.

## Requirements

- Chip variant: each `.food-tag` chip shows a small tinted emoji box (same accent/
  tint style as `.food-item-icon`, but smaller to fit a chip, e.g. 22–24px) followed by
  the food name and the remove button.
- Record variant: in the Feeding timeline, solids feed rows show a small emoji box with
  the first food's emoji (using `foodEmoji(foodsOf(f)[0])`) in the event-icon slot;
  other feed types keep their existing icons.
- The emoji is aria-hidden; accessible names/roles unchanged (chips keep their remove
  button label; record rows keep their title).
- No behaviour changes: add/remove chip, duplicate/edit/delete flows, validation.

## Acceptance criteria

- A `.food-tag` chip in the Add solid food sheet shows a small emoji box before the food
  name.
- A solids feed row in the Feeding timeline shows a small emoji box (first food's emoji)
  instead of the generic feed icon; bottle/breast rows are unchanged.
- The small box uses the same accent-tint style as the list's `.food-item-icon`.
- `npm run build` and `npm test` pass.

## Constraints

- Reuse the existing `.food-item-icon` styling; add a smaller modifier (e.g.
  `.food-item-icon-sm`) and a chip-embedded variant in `src/index.css`.
- Reuse `foodEmoji` + `FOOD_ICON_COLORS[foodIconKey(...)]` (domain/presentation helpers).
- Changes confined to `FoodMultiSelect.tsx` (chip render), `FeedingScreen.tsx` (record
  icon), and `src/index.css` + tests.

## Context

- `.food-tag` chips currently render `{food}` text + a remove button; the picker list
  already renders `.food-item-icon` (34px tinted box + emoji).
- Feeding timeline `event-icon event-feeding` currently renders `<BottleIcon size={18} />`
  for every feed type; solids rows should show the food emoji instead.
- `foodsOf(f)` and `describeFeedingTitle(f)` already handle solids lists; the first food
  is `foodsOf(f)[0]`.
