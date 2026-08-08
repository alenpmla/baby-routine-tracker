# Phase 4 addendum — Export / Import data (Settings)

## Goal

Let the user back up and restore all tracker data from **Settings**: download a JSON backup, and import one to replace the app's data.

## Acceptance criteria

- **Export**: downloads a JSON file containing baby, sleeps, feedings, diapers, and settings (with a schema version + export timestamp).
- **Import**: lets you pick a backup file; validates it; replaces the server data (clears existing collections) and refreshes the app; shows success/error.
- Works with the sync server via the existing HTTP API (no server changes).
- Build + tests pass.

## Constraints

- Follow Clean Architecture: backup methods on `RemoteRepositories`, exposed via `TrackerProvider`; UI in Settings.
