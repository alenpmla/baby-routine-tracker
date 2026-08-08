# Phase 4 — Food-name autosuggestions (editable in Settings)

## Goal

The Solids **Food** field suggests food names as you type. The suggestion list is manageable in a **Settings** screen (add/remove), is **shared across devices** (stored on the server), and ships with sensible defaults.

## Requirements

- While typing in the Food field (quick-add and backfill), show matching suggestions (case-insensitive substring match). Tapping one fills the field.
- A Settings screen lists the current suggestions, lets the user **add** and **remove** them, and returns to the app.
- Suggestions sync like other data (server is source of truth; offline-capable via the existing queue/cache).
- Seeded defaults: `porridge (with pears)`, `porridge (with apple)`, `salmon`, `beef` (and the user can edit the list freely).

## Acceptance criteria

- Typing in the Food field shows filtered suggestions; selecting one sets the value.
- The Settings screen shows the seeded defaults and allows adding (deduped, non-empty) and removing suggestions.
- Added/removed suggestions persist and sync (visible from another device after reload/sync).
- Domain: empty suggestion rejected; duplicates (case-insensitive) ignored.
- `npm run build` and `npm test` pass.

## Constraints

- Follow existing Clean Architecture and sync data model.
- `AppSettings` model with `foodSuggestions: string[]`; a `SettingsRepository` joins the repository contracts.
- Server gains `GET/PUT /api/settings`; JSON store seeds defaults when settings are absent.
- No auth (unchanged).

## Context

- The Food field currently lives in `SolidsFields` (shared by quick-add modal and backfill form); the suggestion input component will be shared too and receive suggestions as a prop.
- Settings screen is reached from the Dashboard (gear button), mirroring the existing "Edit profile" pattern in `App.tsx` shell.

## Suggested tasks

- Domain: `AppSettings` model, `SettingsRepository` interface, add/remove use cases.
- Server: settings store key + seeded defaults + `/api/settings` endpoints + tests.
- Data: `RemoteRepositories` settings cache + queue + localStorage impl; mock API settings support.
- Store: settings state + `addSuggestion`/`removeSuggestion` actions.
- Presentation: `FoodSuggestInput`, wire suggestions into `SolidsFields`/backfill, `SettingsScreen`, gear entry point.
- Tests + docs.
