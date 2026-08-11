# Redesign solids Food picker: + Add foods chip → searchable bottom sheet

## Goal

The current Food field is a free-text input with a suggestion dropdown. Even though
free-text is no longer committed, it still *reads* as editable, which is confusing.
Replace it with a read-only Material 3 pattern: selected foods shown as chips plus an
**"+ Add foods"** assist chip that opens a **searchable modal bottom sheet** with a
checkbox list of all suggestions. No free-text entry anywhere.

## Requirements

- The Food field area shows the currently selected foods as removable chips (existing
  `.food-tag` style) and an **"+ Add foods"** chip/button as the only way to add.
- Tapping "+ Add foods" opens an M3 **modal bottom sheet** (existing `Modal`
  `variant="sheet"`) titled "Add foods".
- Inside the sheet: a **search field** at the top that filters the suggestion list as
  the user types (case-insensitive substring match), and a **scrollable checkbox list**
  of the filtered suggestions; items already selected are pre-checked.
- Tapping a list item toggles its selection immediately (chips update behind the sheet);
  a **Done** button closes the sheet.
- The picker must remain **seamless**: opening the sheet is one tap; the sheet *is* the
  picker, so it should not feel like an extra step beyond the previous dropdown.
- No free-text is possible anywhere in the flow; foods can only ever be suggestion-list
  entries.
- Keyboard-friendly: search field autofocuses on open; Escape/overlay/Close close the
  sheet (Modal already handles Escape/overlay; Close button is in the header).
- Behaviour preserved: multi-select, remove-chip, validation (`Choose at least one
  food`), edit and duplicate flows (prefilled chips), quick-add and backfill forms.
- The picker is used identically in the quick-add solids modal and the backfill form.

## Acceptance criteria

- The Food field renders selected chips + an "+ Add foods" chip and **no editable text
  input** (no `type="text"` input in the picker's collapsed state).
- Tapping "+ Add foods" opens the "Add foods" bottom sheet with a search field and a
  scrollable checkbox list of all suggestions.
- Typing in the search field filters the list (case-insensitive substring); clearing
  restores the full list.
- Checking an item adds exactly the canonical suggestion name; unchecking removes it;
  the chips update immediately.
- Done closes the sheet; opened with no selections still closes (foods can remain empty
  so the form's existing "Choose at least one food" validation still applies).
- Items already selected appear pre-checked when the sheet reopens.
- A saved food value can only ever be a suggestion-list entry.
- `npm run build` and `npm test` pass, with tests updated to the new interaction.

## Constraints

- Change is confined to `src/presentation/components/FoodMultiSelect.tsx` (+ CSS in
  `src/index.css`) so `SolidsFields` callers (FeedingScreen quick-add and backfill)
  are untouched. Component props stay `value`, `suggestions`, `onChange`,
  `ariaInvalid`, `ariaDescribedby`.
- Reuse the existing `Modal` component (bottom-sheet variant) for the picker sheet;
  nested within the parent sheet (Modal already snapshots content and supports nesting).
- Keep existing chip styles; add only what's needed for the "+ Add foods" assist chip
  and the sheet list (reuse `.food-suggest-item`/checkbox styles).
- No new runtime dependencies.

## Context

- `FoodMultiSelect` is the sole food picker, used via `SolidsFields` in:
  - `FeedingScreen.tsx` quick-add "Add solid food" modal and the Add/Edit/duplicate
    feed modal (via `FeedDiaperBackfillForm` in `BackfillForms.tsx`).
- The previous work package (WP067) removed free-text commit; this redesign removes the
  confusing free-text *appearance* entirely.
- The M3 pattern: chip-group input where an assist chip ("Add") opens a picker modal —
  standard for multi-select from a bounded list with search.
