# Solid food bottom sheet: Save button hidden behind keyboard

## Goal

In the "Add solid food" bottom sheet on Android (installed PWA / MWA), typing in the
Food field hides the "Save solid food" button behind the soft keyboard. The button must
stay on top of the keyboard, like it already does when the Amount field is focused.

## Requirements

- Opening the soft keyboard must never push the sheet's action button behind it.
- The Save button stays visible above the keyboard regardless of which field is focused
  (including the Food field with the suggestion dropdown open).

## Acceptance criteria

- On Android with the keyboard open in the solid-food sheet, the "Save solid food" button
  is visible above the keyboard when any field is focused (Food, Amount, Unit).
- Behavior when focusing Amount is unchanged (button already visible there).
- No artificial spacing/gap above the keyboard when the sheet is shown.
- `npm run build` and `npm test` pass.

## Constraints

- Keep the existing M3 bottom-sheet design and the current Modal/focus-scroll approach.
- No new runtime dependency; no layout regression on desktop/tablet.

## Context

- `src/presentation/components/Modal.tsx` keeps the focused field visible via
  `visualViewport` + `scrollIntoView`, but only scrolls the focused element.
- `.modal-overlay`/`.modal` are `position: fixed` to the layout viewport; without
  `interactive-widget=resizes-content` the sheet bottom extends behind the Android keyboard.
- The Food field is the first field, so focusing it never scrolls the trailing
  "Save solid food" button into view.
- `src/index.html` viewport meta currently omits `interactive-widget`.
