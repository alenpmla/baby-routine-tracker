# Fix offline banner/sync bugs reported on device

## Goal

User reports three real-device bugs after WP093/WP094:

1. **Endless "Loading…" on offline reload** — previously the offline message appeared
   instantly. Likely: `ready` stays false until `loadAll()` resolves; if the fetches hang
   (unreachable server, SW passthrough) the spinner never clears. Need a load timeout /
   fail-fast so cached data + offline banner render quickly.
2. **"Synced" snackbar while still offline** — `syncNow()` in RemoteRepositories only
   replays pending ops; with zero pending ops it returns `true` without contacting the
   server, so Retry shows "Synced" even when offline. Must actually verify connectivity.
3. **"Synced" notification not there** — clarify expected feedback: auto-sync is silent;
   manual Retry shows success/error. Ensure the manual path reports the real outcome.

## Requirements

- Offline reload: app renders from cache and shows the offline banner quickly, not an
  endless loading screen.
- Manual Retry while offline (with or without pending ops) shows "Sync failed — still
  offline", never a false "Synced".
- Manual Retry while online shows "Synced".
- No regression to WP093/WP094 auto-sync.

## Acceptance criteria

- A test where fetch hangs (never resolves) still completes load from cache and shows the
  banner within the timeout.
- A test where the app is offline with no pending ops: tapping Retry shows the error
  snackbar, not "Synced".
- Existing sync/offline tests stay green; `npm run build` and `npm test` pass.

## Constraints

- Scope: `src/data/http.ts` (add an abort/timeout so hanging fetches reject), and
  `src/data/repositories/RemoteRepositories.ts` (`syncNow` verifies connectivity), plus
  tests. Keep changes minimal and safe for the server/offline flows.

## Context

- `RemoteRepositories.syncNow` (RemoteRepositories.ts:311-319) replays pending only.
- `FetchHttp.request` (http.ts:31-45) has no timeout — a hanging fetch blocks `loadAll`,
  keeping `ready=false` (TrackerProvider:115-129) → endless loading.
- App.sync.test.tsx has offline-load and retry tests that only cover the "pending ops"
  path; the no-pending-offline and hanging-fetch paths are untested.
