# PDF report: group days with per-day totals

## Goal

The downloaded PDF report currently lists every sleep, feeding, and diaper entry in a flat table. Users also want the report grouped **by day** so each day shows its own totals (sleep count + total duration, feed/bottle/solids totals, diaper count) alongside or instead of the flat list.

## Requirements

- The PDF report shows a **daily breakdown** of the period, one row per day in the range (or per day that has records), with that day's totals:
  - Sleep: number of completed sessions and total duration.
  - Feeding: total feeds, and totals for bottle amount and solids amount.
  - Diaper: total changes (and wet/dirty/both breakdown where practical).
- Per-day rows must be **grouped/aggregated** from the same records already used by the report; no new data sources.
- The existing summary cards, detail tables, and overall layout remain intact.

## Acceptance criteria

- A "Daily totals" section appears in the PDF, grouped by date (month/day), one row per day, sorted chronologically.
- Each day row shows sleep count + total sleep duration, total feed count, bottle total and solids total (using the same unit conversion as the summary), and diaper count.
- Days with no records in a category render a placeholder (`0` or `—`) rather than an empty cell.
- The period-wide summary cards and per-category detail tables still render.
- `npm run build` passes and `npm test` passes.

## Constraints

- Report generator lives in `src/presentation/utils/report.ts` (pure, testable data builder + PDF builder via jsPDF/autotable).
- Reuse existing helpers: `formatDuration`, `describeBottleTotal`, `describeSolidsTotal`, `describeAmount`.
- No server changes; grouping is computed client-side from the already-fetched `ReportRecords`.
- Time stored as ISO-8601 UTC; grouping by day must use the local timezone, consistent with `fmtDate`.

## Context

- `buildReportSummary` already aggregates the whole period; the new grouping is the same math applied per calendar day.
- `reports/development/2026-08-09T11-30-00Z-WP034.md` documents the original PDF report work package.
