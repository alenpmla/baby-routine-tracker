# WP046 — Daily averages in category snapshots

## Goal

Add per-day averages (over the last 30 days) to each category's snapshot row:
- **Sleep screen**: average total sleep duration per day (e.g. "11h 24m").
- **Feeding screen**: average number of feedings per day (e.g. "4.3").
- **Diaper screen**: average number of diaper changes per day (e.g. "6.1").

## Acceptance criteria

- Averages are computed over the last 30 calendar days (including today), denominator = 30 days.
- Avg sleep uses completed sleeps only (ongoing sleeps excluded), summed duration / 30 days.
- Avg feedings = feeding count in window / 30; avg diaper changes = diaper count in window / 30.
- Each average appears as a `StatTile` ("Avg/day") in the relevant screen's snapshot row.
- Tiles hide when the average is 0 (no data in the window), matching existing zero-hide behavior.
- Averages refresh as data changes.
- `npm run build` + `npm test` pass.

## Constraints

- Compute in a domain use case (`src/domain/usecase/averages.ts`) taking repositories, exposed via `TrackerProvider`.
- No server changes.
