# WP050 — Live sync via Server-Sent Events (SSE)

## Goal

When the app is used by two people at once (e.g. husband + wife), changes made on one device should appear on the other without a manual reload. Add **Server-Sent Events** so the server pushes an update notification to every connected device whenever data changes, and each device re-fetches the changed data.

## Acceptance criteria

- Server exposes `GET /api/events` (SSE). It broadcasts a `{"kind":"update"}` message to all connected clients whenever data changes (baby PUT, settings PUT, collection POST/DELETE, import). Sends a heartbeat so connections stay alive.
- Client opens an `EventSource('/api/events')` on load; on an update message it re-fetches server data (fresh, non-destructive) and refreshes the UI. On SSE reconnect (`onopen`) after the first connection, it refreshes too (picks up changes missed while offline).
- Re-fetch must not disturb local state on failure, and must not flip the app into "offline" incorrectly (SSE implies connectivity).
- Fully backward-compatible: if `EventSource` is unavailable (jsdom, older browsers) the app behaves exactly as before. All existing tests keep passing unchanged.
- `npm run build` + `npm test` pass; new server SSE test + new client live-sync test.

## Constraints

- No new dependencies. SSE route + broadcast inside `createApp` (per-instance client set, so server tests stay isolated). Client re-fetch via a new `refreshFromServer()` on `RemoteRepositories` that mirrors `loadAll()`'s success path without the offline fallback.
