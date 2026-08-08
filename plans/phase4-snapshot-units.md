# Phase 4 addendum — Snapshot preferred unit (Settings)

## Goal

Add a **Snapshot units** setting so the Feeding screen totals display in a chosen unit:

- **Bottle** total: shown in `ml` or `oz` (converted if the recorded feeds used the other unit).
- **Solids** total: shown in `g` or `oz` (converted if recorded feeds used the other unit).

The Feeding screen gains a **Bottle** stat tile (total amount) alongside the existing **Feeds** and **Solids** tiles.

## Acceptance criteria

- Settings has two selects: "Bottle amount" (`ml` | `oz`) and "Solids amount" (`g` | `oz`).
- The preference persists on the device (localStorage, like the theme) and applies immediately.
- Feeding stat tiles respect the preference: solids total converts oz↔g (1 oz = 28.35 g); bottle total converts oz↔ml (1 oz = 29.57 ml).
- Defaults: bottle `ml`, solids `g`.
- Build + tests pass.

## Constraints

- Device-local preference (no server/sync change).
- Pure presentation + a small provider.
