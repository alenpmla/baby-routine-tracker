# WP051 — Single source of truth for all settings (sync prefs via server)

## Goal

Currently the shared data (baby, sleeps, feedings, diapers, weights, foodSuggestions) syncs between devices via the server + SSE, but **preferences live in per-device localStorage** and never sync: `bt.theme`, `bt.snapshotUnits`, `bt.reportUnits`, `bt.averagesDays`, `bt.wakeWindowEnabled`, `bt.wakeWindowMinutes`. Because the wake-window threshold is per-device, the wake window can differ between two phones.

Fix: move all preferences into the server `settings` object (single source of truth), synced through the existing server + SSE, so both devices share the same values.

## Acceptance criteria

- `AppSettings` (domain) carries: `foodSuggestions`, `theme`, `snapshotUnits`, `reportUnits`, `averagesDays`, `wakeWindowEnabled`, `wakeWindowMinutes` (with sensible defaults).
- Server persists the full settings object (store `read`/`replace` no longer drop extra fields; `/api/settings` accepts the object).
- `TrackerProvider` exposes the synced `settings` and `updateSettings(patch)` (persists via the existing synced settings repository, which pushes to the server and triggers SSE).
- `ThemeProvider`, `SnapshotPrefsProvider`, `NotificationPrefsProvider` read from and write to the synced settings (moved inside `TrackerProvider`), with one-time migration of legacy localStorage keys into the server settings.
- Device-local state stays local: `wakeNotifiedForEnd` (per-device reminder dedupe) and the offline pending queue.
- Changing a pref on one device reflects on the other via SSE.
- `npm run build` + `npm test` pass.

## Constraints

- Domain model types move to `AppSettings` (presentation re-exports to avoid churn). No new deps. Keep `bt.theme` as a localStorage cache for pre-paint (server remains the source of truth).
