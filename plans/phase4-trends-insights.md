# Trends & insights on the Dashboard

## Goal

Give the parent on the Dashboard a small set of data-driven, at-a-glance insights computed
from their own records — so the app is proactive ("next feed likely around…") instead of
passive, without adding any data entry.

## Requirements

- On the Dashboard when viewing **today**, show an optional "Trends & insights" section
  between the summary cards and the weight chart.
- Each insight is informational (not a button), follows the existing M3 card language, and is
  hidden when there is not enough data to compute it.
- Insights included:
  1. **Next feed estimate** — from bottle/breast ("milk") feeds over the last 48h: median
     feed gap applied to the last feed. If the last feed is overdue by more than half the
     typical gap, reframe as "feed time?" instead of a predicted time.
  2. **Longest stretch between feeds** — the largest gap (≥ 2h) between consecutive milk
     feeds in the last 24h, with the time span.
  3. **Sleep today vs usual** — completed sleep so far today compared with the 30-day daily
     average (labeled "so far" so a partial day is not misread as a full-day deficit).

## Acceptance criteria

- Viewing today with ≥ 3 milk feeds in 48h → next-feed insight appears (predicted time, or
  overdue reframe when applicable).
- Viewing today with ≥ 2 milk feeds in 24h and a gap ≥ 2h → longest-stretch insight appears
  with the span.
- Viewing today with ≥ 1 completed sleep today → sleep-total insight appears with "so far"
  wording; hidden when no sleep recorded yet today.
- Any insight with insufficient data is omitted (no empty section, no placeholder).
- Insights are not rendered when viewing a past/future day.
- No data entry or settings changes introduced.
- `npm run build` and `npm test` pass.

## Constraints

- Layering: domain computes insights as structured data (`src/domain/usecase/insights.ts`,
  pure TS, no DOM/Intl formatting); presentation formats with existing
  `formatDuration`/`formatClock`.
- Reuse existing daily-average window logic (30 days) for the sleep comparison.
- M3 visual language consistent with `.card`/`.stat-tile`; informational, not tappable.
- No new runtime dependencies.

## Context

- `TrackerProvider` computes `dailyAverages` via `getDailyAverages` (30-day window) — reuse the
  same window semantics for the sleep average.
- `day`/`dayCounts` already drive Dashboard cards; insights need raw repo access, exposed by
  adding an `insights` value to `TrackerState`.
- Milk feeds = `type === 'bottle' | 'breast'` (solids excluded from feeding-gap metrics).
- Time stored as ISO-8601 UTC; "today" uses local midnight (matches `startOfDay`/`getDayRange`).
