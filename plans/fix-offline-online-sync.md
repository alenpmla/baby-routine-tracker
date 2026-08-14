# Fix offline→online auto-sync (SSE reconnect + online listener) and add sync feedback

## Goal

Resolve the reproduced bug (WP089): events added while offline are not merged when the
device returns to the network unless the user presses "Retry sync". Make auto-sync fire
on reconnect, and give the user visible feedback on manual sync success/failure.

## Requirements

1. **SSE reconnect reload**: `TrackerProvider`'s EventSource `onopen` currently treats the
   first successful open as "initial" (`firstOpen`) and skips `reload()`. If the app
   loaded while offline, that first open happens on reconnect and is swallowed, so queued
   events never merge. Fix: on `onopen`, only skip the reload when `!repos.current.isOffline()`.
   When offline at open, call `reload()` (which re-fetches and replays pending).
2. **Browser `online` listener**: add a `window.addEventListener('online', ...)` that calls
   `reload()`/`syncNow` so returning to the network triggers a merge even if the SSE stream
   does not re-open in time.
3. **Sync feedback**: manual `syncNow` (Retry) shows a snackbar — success ("Synced") or
   failure ("Sync failed — still offline"). Auto-sync (SSE/online) clears the banner without
   a snackbar (non-intrusive).

## Acceptance criteria

- The WP089 repro test passes: after `api.setOffline(false)` and SSE `onopen`, the banner
  clears and the queued feed reaches the server WITHOUT manual Retry.
- A new (or updated) test asserts a `window` `online` event triggers the merge.
- Manual Retry shows a success or error snackbar.
- `npm run build` and `npm test` pass.

## Constraints

- Scope: `src/presentation/store/TrackerProvider.tsx` (SSE `onopen` fix + `online`
  listener; `syncNow` returns/throws ok so Shell can show feedback) and
  `src/App.tsx` (use `useSnackbar()` around `syncNow` in the banner handler).
- Keep the existing `firstOpen` behaviour for the normal online load (skip the redundant
  first reload).
- No changes to `RemoteRepositories` unless needed for the failure signal.

## Context

- `TrackerProvider.tsx:133-163` — SSE effect with `firstOpen` swallow; `syncNow` at
  :165-169 sets `offline` but returns nothing to the caller.
- `App.tsx:44` — `OfflineBanner onRetry={syncNow}`; `Shell` is inside `SnackbarProvider`.
- `SnackbarProvider` exposes `showSnackbar(message, variant)`.
- WP089 repro test: `src/App.sync.test.tsx:118-153` (currently red).
