# Duplicate a feeding entry

## Goal

Let the user duplicate an existing Feeding entry (bottle, breast, or solids) from the
list. Choosing Duplicate opens the Add-feed modal prefilled with the exact same items
as the original record — except the date/time, which defaults to the current moment.

## Requirements

- Each feeding row's swipe reveal shows a Duplicate action next to Delete.
- Tapping Duplicate opens the existing add-entry modal (`FeedDiaperBackfillForm` in
  "Add feed" mode) with the source record's fields prefilled:
  - type (bottle/breast/solids)
  - solids: foods, amount, unit
  - bottle: amount, unit
  - breast: startTime/endTime preserved as-is (copied from the source)
- The date/time field defaults to **now** (current moment), not the original time.
- Saving the duplicate adds a **new** record (it must not overwrite the original).
- Edit and Delete behaviours are unchanged.

## Acceptance criteria

- On the Feeding screen, swiping a row reveals two actions: Duplicate and Delete.
- Tapping Duplicate opens the Add feed modal with the record's type and detail fields
  prefilled; the Date/Time shows the current time.
- Saving creates a second, independent record with identical type/details and the
  newly-chosen time; the original record is untouched.
- For breast feeds, the copied start/end times are editable and validate as before.
- Existing delete/confirm flow, keyboard path, and single-open swipe behaviour still
  work.
- `npm run build` passes.
- `npm test` passes, including updated SwipeableRow coverage for a secondary action
  and a FeedingScreen test that duplicates a feed via the swipe UI.

## Constraints

- Reuse the shared `SwipeableRow` component; generalize it to accept an optional
  secondary action (Duplicate) so other screens are unaffected (they pass none).
- No new runtime dependencies.
- The duplicate is created through the existing `addFeeding` path with the same
  details mapping already used for editing (`foodsOf` for solids).
- Only Feeding entries get this action in this work package; Sleep/Diaper/Weight are
  out of scope.

## Context

- Rows are rendered in `FeedingScreen.tsx` (`src/presentation/screens/FeedingScreen.tsx`,
  ~line 136) inside `SwipeableRow`, which currently renders a single delete button
  (`src/presentation/components/SwipeableRow.tsx`).
- The add/edit modal uses `FeedDiaperBackfillForm` (`BackfillForms.tsx`); edit mode
  already builds an `initial` value from the record (type + at + details) which
  duplicate mode can reuse with `at: new Date()`.
- Swipe reveal width is currently `72px` in `src/index.css` (`.swipeable-row-delete`);
  a second action needs the reveal area to widen.
