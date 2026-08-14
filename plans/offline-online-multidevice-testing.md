# Comprehensive offline/online multi-device sync testing

## Goal

Thoroughly test the offline→online sync and multi-device merging behaviour, covering
scenarios beyond the existing suite: offline edits/deletes/settings, SSE broadcast to
other online devices, and concurrent offline adds from two devices that later merge.

## Scenarios to test

1. Offline add → SSE reconnect (`onopen`) merges, banner clears (covered, keep).
2. Offline add → browser `online` event merges (covered, keep).
3. Offline add → manual Retry merges + "Synced" snackbar (covered, keep).
4. Offline with no pending → Retry → "Sync failed" error snackbar (covered, keep).
5. **Offline edit** of an existing record → replays as upsert → server + other devices see new value.
6. **Offline delete** → replays as delete → removed on server + other devices.
7. **Offline settings change** → replays → other devices see new settings.
8. **Two devices both offline**, each adds records, both return online → server has the union; each device sees both.
9. **SSE broadcast**: Device A online adds → Device B (online, SSE connected) receives the broadcast and refetches → sees A's record.
10. **Offline then online mid-session** (not fresh load): device was online, went offline, added, came back → auto-merges.

## Acceptance criteria

- Every scenario has a passing automated test in `src/App.sync.test.tsx` (or a new
  `src/App.synctest.test.tsx`).
- Any failing scenario is reported as a found issue with reproduction, not silently fixed.
- `npm run build` and `npm test` pass; the report lists found issues (expected: 0 new).

## Constraints

- Test-only work package. If a scenario fails, STOP and report the issue (create a
  blocker); do not patch production code inside this WP.
- Reuse `setupApi`, `MockApi.setOffline`, and the `FakeEventSource` pattern from
  App.sync.test.tsx.

## Context

- Server merges by upsert on `id` (store.js upsert/add); deletes by id. Unique ids per
  device make concurrent offline adds a union merge.
- WP093/WP094/WP095 fixed SSE reconnect reload, `online` listener, proactive banner, HTTP
  timeout, and `syncNow` connectivity check. This WP validates those fixes across more
  paths.
