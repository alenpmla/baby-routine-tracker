# Restrict solids Food input to the suggestion list only

## Goal

The solids Food field already shows suggestions automatically while typing, but it
still lets the user type and commit an arbitrary free-text food name (via Enter or
blur). The user wants to **prevent free-text food entry** so foods are only chosen
from the existing suggestion list — eliminating typos. Almost all foods the user
needs are already present in the food list.

## Requirements

- While typing in the Food field, matching suggestions still appear automatically
  (unchanged behaviour).
- The user can only **select** foods from the suggestion list; arbitrary typed text
  that is not an existing suggestion must never be committed as a food.
- Pressing **Enter** with a single matching suggestion selects it; with multiple
  matches it should select the best/only sensible match (first) rather than commit
  free text. Enter must never add text that is not in the suggestion list.
- Blurring the field must not commit a free-text food.
- If the typed query matches no suggestion, nothing can be added from free text.
- Users can still deliberately extend the food list in **Settings → Food suggestions**
  (existing flow, unchanged), so valid foods remain selectable going forward.
- Existing behaviour (multi-select chips, remove chip, checkbox selection, outside
  click closing the popup, popup never blocking the Save button) is unchanged.

## Acceptance criteria

- Typing a name that is **not** in the suggestion list and pressing Enter does **not**
  add it to the selected foods; the field value does not become a food.
- Typing a name that **is** in the suggestion list and selecting the suggestion adds
  exactly that canonical suggestion name (no free-text variant).
- Enter selects the first matching suggestion when matches exist; no free-text food
  is ever committed.
- Blur after typing a non-suggestion does not commit it.
- A food value stored on save can only ever be one of the suggestion-list entries
  (case/whitespace-insensitive).
- `npm run build` and `npm test` pass, with tests updated to assert the new
  restrict-to-suggestions behaviour.

## Constraints

- Change lives in `src/presentation/components/FoodMultiSelect.tsx` (shared by
  quick-add modal and backfill form via `SolidsFields`). No domain/server changes.
- Keep the existing suggestion-filtering and multi-select interaction; remove only
  the free-text commit path (`commitText`) or restrict it to suggestions.
- Placeholder/hint copy may be updated to communicate "choose from suggestions".
- Tests in `src/presentation/components/__tests__/FoodMultiSelect.test.tsx` must be
  updated: the existing "adds a custom food on Enter" test is now invalid.

## Context

- `FoodMultiSelect` currently commits free text on Enter and on blur via
  `commitText()`; the placeholder says "Type a food, press Enter to add".
- Suggestions come from synced settings (`foodSuggestions`) seeded with defaults and
  editable in Settings → Food suggestions.
- FoodVariety / canonical-dedupe features assume foods come from this input; keeping
  values equal to suggestion entries keeps variety insights clean.
