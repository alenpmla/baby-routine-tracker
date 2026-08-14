# Offline banner does not appear when the device loses connectivity

## Goal

When the device goes offline (e.g. WiFi disconnected), the app should show the offline
banner proactively, not only after an HTTP operation fails. Currently the banner only
appears reactively: `offline` is set to true when a `loadAll`/`push`/`syncNow` request
fails. If the user simply disconnects and looks at the screen, no request runs, so
`offline` stays false and no banner shows.

## Requirements

- On losing connectivity, the offline banner appears (proactively, without requiring a
  failed write).
- On regaining connectivity, the banner clears (already handled by WP093's `online`
  listener and SSE reconnect).
- Existing reactive detection (failed requests) still works.

## Acceptance criteria

- A browser `offline` event (or `navigator.onLine` false) shows the offline banner.
- The banner still clears when back online.
- `npm run build` and `npm test` pass.

## Constraints

- Scope: `src/presentation/store/TrackerProvider.tsx` — add a `window.addEventListener('offline', ...)`
  that sets the offline state, mirroring the existing `online` listener (and optionally
  honour `navigator.onLine` on mount). No changes to RemoteRepositories' reactive flag.
- Keep the banner clearing path (online event + SSE reload) intact.

## Context

- `TrackerProvider.tsx:183-185` — `online` listener exists; no `offline` listener.
- `refresh()` sets `offline` from `repos.current.isOffline()`; the reactive flag lives in
  RemoteRepositories and is only flipped by failed requests.
- `App.tsx:46` renders `OfflineBanner` when `offline` is true.
