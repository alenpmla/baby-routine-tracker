# Phase 4 addendum — Keep action buttons above the soft keyboard

## Goal

While typing in a modal field (e.g. the solids **Food** name), the sheet's action button (Save/Continue) must stay visible above the on-screen keyboard.

## Acceptance criteria

- While the soft keyboard is open, the modal bottom sheet is pushed up so its bottom edge (and the Save button) sits above the keyboard.
- The sheet's height is capped to the visible (visual) viewport so content is reachable by scrolling.
- The focused input is scrolled into view.
- Desktop and non-keyboard behaviour is unchanged.
- Build + tests pass.

## Constraints

- Implemented in `Modal.tsx` using the `visualViewport` API (guarded when unavailable); no behaviour change when there's no keyboard.
