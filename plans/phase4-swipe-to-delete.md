# Swipe-to-delete for list items (Feeding, Sleep, Diaper, Weight)

## Goal

Replace always-visible delete buttons on list items with a **swipe-to-reveal delete**
gesture (iOS-style). Swiping a row sideways reveals a delete icon/action on the side;
tapping it deletes. This prevents accidental deletes. Applied consistently to all
record-list items: Feeding, Sleep, Diaper, Weight (and, if consistent, the food
suggestions manager list).

## Requirements

- On the Feeding, Sleep, Diaper, and Weight screens, each event row supports a horizontal
  swipe (typically left-to-right reveal of a delete action on the right side, or a
  right-aligned revealed delete) that shows a delete control.
- Tapping the revealed delete control deletes the row (same behaviour as today's
  `removeFeeding` / `removeSleep` / `removeDiaper` / `removeWeight`).
- Only one row may be swiped open at a time; swiping another row closes the previous one.
  Swiping a closed row in the reverse direction, or tapping elsewhere, closes it.
- The Edit button remains always visible (unchanged).
- The revealed delete is clearly an action surface (M3 tonal/error styling) and is
  large enough to tap reliably on mobile (≥ 48px).
- Works on touch and with a pointer (mouse drag); keyboard users still get an accessible
  delete (the revealed control remains a focusable `<button>` with a proper aria-label;
  consider a non-gesture fallback such as keeping the button in the DOM but visually
  hidden, or an explicit secondary path).
- No horizontal page overflow; the row content must not clip or jitter during the swipe.
- Dashboard cards, settings nav, and notification cards are **out of scope** (they are
  not deletable records).

## Acceptance criteria

- Swiping a Feeding/Sleep/Diaper/Weight row reveals a delete control; tapping it removes
  the record from the list and the data store.
- Only one row is open at a time; the previously open row closes when another opens.
- Tapping elsewhere / reverse-swipe closes an open row without deleting.
- Edit button stays visible and functional.
- Delete control is reachable/activatable by keyboard (focusable button with aria-label)
  and the integration tests verify deletion works through the swipe UI.
- `npm run build` passes.
- `npm test` passes (existing delete-related tests updated to the new interaction where
  needed; add integration coverage for swipe → delete for at least one screen and reuse
  a shared component for the rest).

## Constraints

- Build a single reusable `SwipeableRow` component (presentation layer) so all four
  screens share one implementation and CSS; no new runtime dependencies.
- Must remain compatible with the existing `card event` layout/classes and mobile-first
  CSS; respect `prefers-reduced-motion` (no slide animation when reduced motion is set —
  the delete may simply appear).
- The delete action must preserve existing confirmation/behaviour (today deletion is
  immediate with no confirm; do not add a confirm dialog unless trivial and desired).
- FoodSuggestionsScreen rows: optional in this WP; apply the same component only if it
  fits without churn, otherwise leave its trash button as-is and note it.

## Context

- Delete buttons currently live in:
  - `FeedingScreen.tsx` (~155) `removeFeeding`
  - `SleepScreen.tsx` (~180) `removeSleep`
  - `DiaperScreen.tsx` (~108) `removeDiaper`
  - `WeightScreen.tsx` (~128) `removeWeight`
- Each row is `<li className="card event">` with icon / body / Edit / Trash buttons.
- Existing tests: `App.edit.test.tsx`, `App.test.tsx`, and screen tests exercise deletes;
  search for existing delete coverage before rewriting.
