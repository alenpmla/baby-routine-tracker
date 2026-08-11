# Food picker: full-screen search sheet + collapsed-state polish

## Goal

Fix the cosmetic/UX issues in the food picker introduced in WP068. The "+ Add foods"
flow should open a **full-screen search sheet** (standard M3 pattern for a searchable
multi-select from a bounded list) instead of a cramped nested bottom sheet. Also fix
chip/add-chip alignment in the collapsed state, and the missing spacing above the
search field.

## Requirements

- **Full-screen sheet**: tapping "+ Add foods" opens a full-height M3 sheet (covers
  the viewport, near-`100dvh`, top corners rounded) — not a small bottom sheet nested
  inside the parent Add/Edit feed modal.
- **Search field placement**: the search field sits at the top of the sheet with clear
  vertical spacing (not flush under the header), and remains accessible while typing.
- **Done above keyboard**: the Done button is pinned to the bottom of the sheet
  (sticky) so it stays visible above the on-screen keyboard regardless of scroll/focus.
- **Collapsed alignment**: when selected food chips and the "+ Add foods" chip appear
  on the same row, they are baseline-aligned (same height/line). No `margin-top` offset
  on the chip row.
- The sheet's list is scrollable and full-height; selected items are pre-checked;
  toggling updates immediately; Done closes; Escape/overlay/Close close it.
- No free-text anywhere; foods can only ever be suggestion-list entries.

## Acceptance criteria

- Opening "+ Add foods" shows a sheet that fills the viewport height (visually
  full-screen), not a partial bottom sheet.
- The search field has visible top spacing from the sheet header and is not flush.
- The Done button stays visible above the keyboard when the list is scrolled or the
  search field is focused (sticky bottom within the sheet).
- In the collapsed Food field, chips and the "+ Add foods" chip align on the same
  baseline when sharing a row (no vertical offset between them).
- Search filters, pre-check, toggle, Done-close, nested Escape (closes only the picker)
  all continue to work.
- `npm run build` and `npm test` pass.

## Constraints

- Change is confined to `src/presentation/components/FoodMultiSelect.tsx`,
  `src/presentation/components/Modal.tsx` (if needed for a full-screen variant), and
  `src/index.css`. No domain/server changes.
- Reuse the existing `Modal` component; if a full-screen variant is needed, add it
  there rather than duplicating overlay logic.
- Keep the shared props API (`value`, `suggestions`, `onChange`, `ariaInvalid`,
  `ariaDescribedby`) so `SolidsFields` callers are unchanged.
- No new runtime dependencies.

## Context

- Current issues (from WP068):
  - `.food-picker` (flex-wrap) wraps chips + add chip; `.food-tags` has
    `margin-top: 10px` and chips use `padding: 6px 12px` vs the add chip `height: 32px`
    → misaligned baselines when on one row.
  - The picker uses the default sheet `Modal`; the sticky-button rule in CSS only
    targets `.modal-body .form > button.btn-block:last-child`, so the picker's Done
    button is not pinned above the keyboard.
  - `.food-picker-sheet` has no top spacing; the search field sits flush under the
    sheet header.
- M3 guidance: searchable multi-select over a bounded list is best done in a
  full-screen dialog/sheet with a persistent action area.
- The full-screen variant should still animate in/out like other modals (Modal owns
  enter/exit lifecycle).
