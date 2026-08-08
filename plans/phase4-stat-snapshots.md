# Phase 4 addendum — Consistent Material snapshots per category

## Goal

Replace the ad-hoc snapshot text (sleep timeline header, feeding/diaper header sub-lines) with one shared **Material Design** stat-tile used by every category.

## Acceptance criteria

- A shared `StatTile` component renders an accent icon, label, and value with a consistent M3 card style.
- Sleep screen shows a `Total slept` tile; Feeding shows `Feeds` and `Solids` tiles; Diaper shows a `Changes` tile.
- Placement is the same on each screen (right below the header); works for past days via `selectedDay`.
- The old sleep `Total slept · …` timeline text and feeding/diaper header sub-lines are removed.
- Build + tests pass.

## Constraints

- Pure presentation; reuses `formatDuration`, `describeSolidsTotal`, category accent tokens.
