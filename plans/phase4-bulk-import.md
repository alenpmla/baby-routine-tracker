# WP044 — Fast bulk import (server endpoint)

## Goal

Importing a backup when the server already has data is pathologically slow (and can appear stuck). The client currently deletes every existing record one HTTP request at a time, then re-adds every backup record one at a time, and the server rewrites the entire JSON data file to disk on **every** request. For a 2,700-record backup this is thousands of full-file rewrites (verified: user's import was still running after many minutes, only 743/1185 sleeps written).

Fix: add a **bulk-replace import endpoint** on the server that swaps in all data atomically in one write; the client calls it with a single request.

## Acceptance criteria

- `POST /api/import` on the server replaces baby, settings, and all collections (sleeps, feedings, diapers, weights) in one write.
- The server validates the payload shape (rejects missing/non-array collections) and normalizes legacy `food` → `foods` on feedings.
- The client's `importData` uses the bulk endpoint (one request), then reloads state.
- A full import against a server that already holds a complete dataset completes in seconds (not minutes) with correct final counts.
- Existing per-item API endpoints are unchanged.
- Tests: store `replace()`, `/api/import` API test, client import against mock; `npm run build` + `npm test` pass.

## Constraints

- Follow existing conventions: `server/store.js`, `server/app.js`; client `src/data/repositories/RemoteRepositories.ts`; mock in `src/test/mockApi.ts`.
- Keep the old per-item endpoints working (backward compatible).
