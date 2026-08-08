# Phase 4 addendum — Edit records (sleep, feeding, diaper)

## Goal

Let the user edit every property of an existing record: sleep (start/end), feeding (type, time, and solids food/amount/unit), and diaper (type, time).

## Requirements

- Each record in the lists gains an **edit** action (pencil) alongside delete.
- Tapping it opens the same form used for adding (backfill), **pre-filled** with the record's current values, submitting "Save changes".
- Sleep: only completed sleeps are editable (start + end; end after start, no future). Ongoing/running sleeps are not edited (stop first).
- Feeding: type, time, and solids details (food/amount/unit required when Solids). Changing a solids feed to Bottle/Breast clears the solids fields.
- Diaper: type and time.
- Edits sync like any other write (server is source of truth; offline-capable).

## Acceptance criteria

- Editing a record and saving updates its values in the list and on the dashboard timeline.
- Validation on edit matches add: future times rejected, sleep end > start, solids requires food/amount/unit.
- A solids feed edited to Bottle/Breast no longer shows food/amount/unit.
- Build + tests pass.

## Constraints

- Reuse the existing backfill forms in an edit mode (pre-filled `initial` values); do not duplicate form UI.
- Repository contracts gain an `update` (replace-by-id) method; the server already merges by id on POST, so the remote update reuses the existing add/merge path.
- Keep Clean Architecture: domain use cases own update validation.

## Context

- Lists currently have delete only; edit buttons slot in beside them.
- `updateFeeding` must handle type changes (switch to/from solids) and reuse `validateSolidsDetails`.

## Suggested tasks

- Domain: `update` on sleep/feeding/diaper repositories + `updateSleep`/`updateFeeding`/`updateDiaperChange` use cases.
- Data: update implementations (localStorage, remote via merge-by-id, memory).
- Store: update actions.
- Presentation: edit-mode props on the forms; edit buttons + wiring on Sleep/Feeding/Diaper screens.
- Tests + docs.
