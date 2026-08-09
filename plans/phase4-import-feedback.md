# Phase 4 addendum — Import feedback via snackbar (bugfix)

## Goal

Import failures are currently reported only as subtle inline text, and re-selecting the same invalid file gives **no feedback at all** (the hidden file input is never reset on the early-return error paths, so `onChange` does not re-fire). Surface import success/failure in a prominent M3 **snackbar** and make error feedback reliable on every attempt.

## Acceptance criteria

- Importing a file whose contents are not valid JSON shows an error snackbar ("That file is not valid JSON").
- Importing a structurally invalid backup shows an error snackbar ("Not a valid Baby Tracker backup file").
- A server-side import failure shows an error snackbar ("Import failed").
- A successful import shows a success snackbar ("Data imported").
- An immediate inline "Importing…" status appears while the import runs (large backups take several seconds); the Import button is disabled during import.
- Selecting the **same** file again (after a failed import) still re-triggers validation and feedback.
- Inline status/error text in the Data & reports screen still works and is cleared between attempts.
- Build + tests pass.

## Constraints

- Follow existing conventions: context provider under `src/presentation/store`, component under `src/presentation/components`, M3 tokens in `src/index.css`.
- No backend/server changes.
