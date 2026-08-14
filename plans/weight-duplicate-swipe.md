# Weight records: duplicate action on swipe (like solids/feeding rows)

## Goal

Weight rows on the Weight timeline currently only reveal a Delete action when swiped.
Add the **Duplicate** secondary action on swipe, matching the solids/feeding rows: it
opens the Add-past-weight sheet prefilled with the record's weight and unit (with a fresh
default time), letting the user save a new entry.

## Requirements

- A weight row swipe reveals **Duplicate** next to Delete (same reveal pattern as the
  Feeding timeline).
- Tapping Duplicate opens the weight modal in "add" mode, prefilled with the original
  record's weight and unit; the date/time defaults to now (like a new entry).
- Saving creates a new weight entry; the original record is untouched.
- The edit/delete flows are unchanged.

## Acceptance criteria

- A weight row's swipe reveals a Duplicate action (aria-label like
  `Duplicate weight <time>`).
- Tapping it opens the Add-past-weight dialog with the weight and unit prefilled.
- Saving adds a new weight record with the copied weight/unit; the original is unchanged.
- `npm run build` and `npm test` pass, including a new test mirroring the solids
  duplicate flow.

## Constraints

- Scope: `src/presentation/screens/WeightScreen.tsx` (add `duplicate` mode + secondary
  action), `src/App.edit.test.tsx` or a new weight test file. Reuse `SwipeableRow`'s
  `secondaryAction` and the existing `WeightBackfillForm` (initial props).
- No domain/data changes; no CSS changes.

## Context

- `WeightScreen.tsx:111-134` renders each row with `SwipeableRow` and only `onDelete`.
- FeedingScreen passes `secondaryAction={{ label: 'Duplicate ...', icon: <CopyIcon/>, onActivate: ... }}` (FeedingScreen.tsx:178-183) and a `duplicate` modal mode; the duplicate test is `App.edit.test.tsx:102-141`.
- `WeightBackfillForm` accepts `initial={{ at, weight, unit }}` (BackfillForms.tsx:316-320).
