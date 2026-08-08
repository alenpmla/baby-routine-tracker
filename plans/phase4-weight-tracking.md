# Phase 4 addendum — Log baby weight

## Goal

Add **weight tracking**: log a baby's weight (kg or lb), view it per day, edit/delete entries, sync to the server, and include it in backups.

## Acceptance criteria

- New **Weight** tab (5th tab) with a screen to:
  - Log a weight now (value + unit kg/lb).
  - Add a past weight (date/time + value + unit).
  - See the selected day's entries; edit and delete them.
- Weight syncs like other data (server collection `/api/weights`), is in the export/import backup, and follows day navigation.
- Stat tile shows the latest recorded weight.
- Build + tests pass.

## Constraints

- Follows the existing Clean Architecture + sync data model: domain model/usecases, server store/API, mock, `RemoteRepositories`, store actions, Weight tab/screen.
- Backups: `weights` optional on import (older backups without it still load).
