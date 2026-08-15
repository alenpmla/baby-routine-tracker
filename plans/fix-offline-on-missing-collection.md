# Bugfix: missing collection endpoint flips the whole app offline

## Goal

When the backend lacks one collection endpoint (e.g. a new collection like `headCircumferences` not yet deployed server-side), the app currently falls back to localStorage and shows the offline banner permanently. The app should stay online and treat the missing collection as empty rather than flipping globally offline.

## Repro / observed behaviour

- Server on `:3000` is the old git version (no `/api/headCircumferences`); frontend is the new code.
- `GET /api/headCircumferences` → 404.
- `RemoteRepositories.loadAll()` uses `Promise.all` across all collections; one 404 rejects the whole batch → `catch` marks `this.offline = true` and loads from localStorage cache.
- Result: the "Offline — changes are saved on this device..." banner shows persistently on a healthy network.

## Expected behaviour

- A 404 (or a single failing collection fetch) must NOT flip the app offline. Missing/unknown collections resolve to `[]` so `loadAll`/`refreshFromServer`/`exportData` still succeed.
- Genuine network failure (server unreachable, timeouts) still falls back to offline + localStorage cache as today.

## Acceptance criteria

- `loadAll` tolerates a 404 on one collection endpoint (e.g. `/api/headCircumferences` missing) — cache loads the rest, `offline` stays `false`, banner does not appear.
- `refreshFromServer` and `exportData` behave the same (missing collection → `[]`, no offline flip).
- `importData`/`isValidBackup` unchanged and still round-trip.
- A hard network failure (fetch rejects / times out) still marks offline and uses the localStorage fallback (existing behaviour preserved).
- `npm run build` passes and `npm test` passes (new tests cover the 404-tolerant case and the still-offline-on-network-failure case).

## Constraints

- Change is client-side only: `src/data/repositories/RemoteRepositories.ts` (and its tests + `src/test/mockApi.ts`/harness if needed). No server change required.
- Keep the offline/SSE/reconnect behaviour from WP093-WP096 intact — do not weaken the offline detection for real outages.
- Do not touch the in-flight WP099-103 collection work beyond what's needed here.

## Context

- `FetchHttp` (src/data/http.ts) throws `HttpError('Request failed with status 404')` on non-ok — callers must inspect the HTTP status, not just swallow any error.
- `RemoteRepositories.loadAll` (src/data/repositories/RemoteRepositories.ts) batches `Promise.all([...])`; `refreshFromServer` and `exportData` have the same shape.
