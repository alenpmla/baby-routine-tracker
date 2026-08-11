# Food picker: single flat list (most-used on top, divider, then the rest)

## Goal

The food picker currently renders two separate stacked lists: a "Most used" section
with its own scrollable list, then the full suggestion list below it. This is a
split-list design and looks wrong. Replace it with a **single list**: most-used items
first, a divider, then the remaining suggestions in the normal (alphabetical) order.
Most-used items are not duplicated in the lower section.

## Requirements

- Render one scrollable list in the picker (when the query is empty).
- The first items are the "most used" foods (from `mostUsed`), then a **divider**, then
  the remaining suggestion entries (all suggestions except the most-used ones), in the
  existing order.
- A small section label (e.g. "Most used") may be shown above the most-used group only
  when the query is empty and most-used is non-empty; the lower group needs no label.
- While a search query is active, the list shows only the matching suggestions (single
  list, no most-used grouping/divider).
- Each item is a checkbox row exactly as today (canonical name, pre-check, toggle).
- Preserve: full-screen sheet, clear-search suffix, pre-check on reopen, Done-close,
  nested Escape, no free text.

## Acceptance criteria

- With an empty query, the sheet shows **one** list: most-used items first, a divider,
  then the remaining suggestions — and no item appears twice.
- The divider is present only when both a most-used group and a remaining group exist
  (i.e. most-used is non-empty and not all suggestions).
- While searching, the list is a single filtered list with no most-used grouping or
  divider.
- Toggling any item (most-used or regular) reports the canonical name via `onChange`.
- `npm run build` and `npm test` pass.

## Constraints

- Change confined to `src/presentation/components/FoodMultiSelect.tsx` and
  `src/index.css` (plus tests). No domain/tracker/server changes — reuse the existing
  `mostUsed` prop and `getMostUsedFoods` output.
- Keep the props API unchanged.
- No new runtime dependencies.

## Context

- `FoodMultiSelect` currently renders `.food-most-used` (a nested `.food-most-used-list`)
  above `.food-picker-list`. This plan removes the nested list and the duplicate rows.
- `mostUsed` is already the top-N most-frequently-logged suggestions (capped 6). The
  remaining suggestions = `suggestions.filter(s => !mostUsed.includes(s))` (match
  case-insensitively via `sameFood`).
