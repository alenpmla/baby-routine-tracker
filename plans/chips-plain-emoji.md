# Remove the tinted container around the emoji in selected-food chips

## Goal

In the food picker sheet, each selected-food chip (`.food-tag`) currently renders the food
emoji inside a small tinted box (`.food-item-icon.food-item-icon-sm`). Remove that box:
the chip shows just the emoji (no container), the food name, and the remove button —
consistent with the plain emoji-in-chip look.

## Requirements

- A `.food-tag` chip renders the food emoji directly (no `.food-item-icon-sm` container
  around it), then the food name and the existing remove button.
- The emoji stays decorative (`aria-hidden`); the remove button label is unchanged.
- The picker **list** rows (`.food-item-icon`) keep their tinted emoji box — unchanged.
- No changes to solids record rows, food variety insight, Dashboard, or data/logic.

## Acceptance criteria

- Each `.food-tag` chip in the Add solid food sheet shows the emoji without a container
  (no `.food-item-icon-sm` element inside the chip).
- The picker list still shows each food emoji inside its tinted `.food-item-icon` box.
- Chip remove buttons and their accessible labels are unchanged.
- `npm run build` and `npm test` pass, with chip assertions updated to expect the plain
  emoji (no box) while list assertions keep expecting the box.

## Constraints

- Scope: `src/presentation/components/FoodMultiSelect.tsx` (chip render), and the
  chip-related assertions in `src/presentation/components/__tests__/FoodMultiSelect.test.tsx`
  and `src/App.solids.test.tsx` if they reference the chip box.
- Keep `FOOD_ICON_COLORS`/`foodIconKey`/`foodEmoji` usage where still needed (the picker
  list rows still use them).
- Do not touch `.food-item-icon` base styles, the picker list, solids rows, or insights.

## Context

- `FoodMultiSelect.tsx:82-90` renders the chip with an inner
  `.food-item-icon.food-item-icon-sm` span (tinted box) containing the emoji.
- `.food-tag` (index.css:780-792) is the chip pill; `.food-item-icon-sm` (index.css:766-771)
  is the 24px tinted box.
- `FoodMultiSelect.test.tsx:14-26` asserts `.food-item-icon-sm` inside chips and its accent
  var — these must change to assert a plain (unboxed) emoji in the chip.
- `App.solids.test.tsx` also asserts `row.querySelector('.food-item-icon-sm')).toBeNull()`
  for the timeline row (unrelated to chips) — that assertion is about the solids record
  row, not the chip; keep it unless the chip scope affects it.
