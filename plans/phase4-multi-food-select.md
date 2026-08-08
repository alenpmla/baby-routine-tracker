# Phase 4 addendum — Multi-food selection for solids

## Goal

Allow selecting **multiple** foods for a solid feed. The Food picker shows the Settings suggestion list with **checkboxes** as you type; tick every food eaten (e.g. avocado and salmon). Save them as a `foods: string[]` array on the feed record.

## Requirements

- Data model: `FeedingSession` gains `foods: string[]` (replaces the single `food` string; `food` kept only as a deprecated legacy field for migration).
- The Food field becomes a multi-select autocomplete: typing filters the suggestion list; each suggestion has a checkbox; ticking adds the food. Selected foods render as removable chips.
- Free text still works: typing a custom food and pressing Enter (or leaving the field) adds it as a chip.
- Validation requires at least one food ("Choose at least one food").
- Legacy records (server JSON / localStorage cache with `food: "X"`) are migrated to `foods: ["X"]` when loaded.
- Timeline/dashboard shows the combined list, e.g. `Solids · salmon, beef`.

## Acceptance criteria

- The Food picker lets you tick several suggestions; the saved feed has `foods` = the ticked list.
- Selected foods show as chips and can be removed individually.
- A custom food typed + Enter (or blur) is added as a chip.
- Saving without any food shows a validation error and blocks.
- Existing single-food records (from a previous version) still display after load.
- Editing a solids feed pre-populates its chips and allows changing the list.
- `npm run build` and `npm test` pass.

## Constraints

- Follow existing Clean Architecture and sync data model.
- Server store stays a passthrough; add a read-time migration of legacy `food` -> `foods` so old JSON upgrades.
- Client normalizes feedings on load (`RemoteRepositories` + `FeedingRepositoryImpl`).
- Settings food-suggestion list is unchanged (source of the tick options).

## Suggested tasks

- Domain: `foods` on `FeedingSession`, `foodsOf`/`normalizeFeeding` helpers, `FeedingDetails.foods`, validation/record/update changes.
- Data: server `store.js` migration + tests; client normalization.
- Presentation: `FoodMultiSelect` component, `SolidsFields` wiring, `FeedingScreen` edit prefill, `describeFeedingTitle`.
- Tests + docs.
