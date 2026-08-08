# Phase 4 addendum — Settings sub-screen + PDF report units

## Goal

1. Move the **food suggestions** manager out of the main Settings screen into its own **sub-screen** (reachable from Settings via a nav entry, with a back button).
2. Add a **PDF report units** preference (like the snapshot units): Bottle `ml`/`oz` and Solids `g`/`oz` used specifically by the period PDF report (independent of the on-screen snapshot units).

## Acceptance criteria

- Main Settings shows a "Food suggestions" entry that opens a dedicated sub-screen (add/remove suggestions there); back returns to Settings.
- Settings gains a "Report units" card (two selects) persisted separately from snapshot units; the PDF report uses these units.
- Build + tests pass.

## Constraints

- Device-local preference (localStorage `bt.reportUnits`).
- Food suggestions list/screen logic reused from Settings.
