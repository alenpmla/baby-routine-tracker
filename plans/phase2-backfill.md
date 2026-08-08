# Phase 2 — Backfill past records & view past days

## Goal

Let parents add sleep, feeding, and diaper records for a **past date/time** when they forgot to log at the moment. Quick-add stays one-tap "now"; **only backfill asks for date + time**. Backfilled records are visible when viewing their day.

## Requirements

- Add an **"Add past record"** action on the Sleep, Feeding, and Diaper screens that opens a date + time form (pre-filled with the current date/time).
- The form accepts **any past date** (no future timestamps allowed) and any time of day.
- **Sleep backfill** asks for a start date/time and an end date/time; end must be after start.
- **Feeding backfill** asks for the type (Bottle / Breast / Solids) plus date/time.
- **Diaper backfill** asks for the type (Wet / Dirty / Both) plus date/time.
- Quick-add buttons (feeding chips, diaper one-tap) keep recording "now" instantly **without** prompting.
- Add lightweight **day navigation** (previous / next / today) so users can open the day a backfilled record belongs to and see its timeline and summary cards.
- Backfilled records appear in that day's list and contribute to that day's summary.

## Acceptance criteria

- A user can add a feed, diaper change, or completed sleep for a previous day (e.g. yesterday or last week) and it appears when viewing that day.
- Every backfill flow explicitly asks for date and time — no silent "now" timestamps in backfill.
- Future timestamps are rejected in the backfill form.
- Sleep backfill rejects an end time that is not after the start time.
- Day navigation lets the user move between days and see each day's timeline/summary; the current day is always available.
- Existing quick-add behaviour is unchanged (records "now" in one tap).
- All data still persists in `localStorage` and survives a reload.

## Constraints

- Do not change the existing quick-add UX.
- No backend, accounts, or sync — `localStorage` only (data-layer interfaces stay swap-ready).
- Follow the existing Clean Architecture: add/extend domain use cases, keep `src/domain` pure TypeScript, extend the `TrackerProvider` store actions, add presentation components/screens.
- Times stored as ISO-8601 UTC; input is local date/time.

## Context

- Feeding/diaper domain use cases (`recordFeeding`, `recordDiaperChange`) already accept an explicit `Date`; the store currently hardcodes `new Date()` — expose an optional `at?: Date`.
- Sleep domain has start/stop only; backfill needs a new operation to create a **completed** sleep directly with start + end (e.g. `logCompletedSleep`). Reuse the day-window listing that already filters by end-time.
- The dashboard and tracking screens currently compute "today" via `getDayRange(new Date())`. Day navigation will need a shared "selected day" concept in the store.
- Backfill for a day that is not today: today's screens only show the current day, hence the day-navigation requirement above.

## Suggested task breakdown (for the planner)

- **Domain**: add `logCompletedSleep(repo, start, end)`; confirm feeding/diaper use cases accept an explicit timestamp.
- **Data**: no repository change expected (all operations already persist arrays by id/time).
- **Store**: add optional `at?: Date` to `addFeeding` / `addDiaper`; add `logPastSleep(start, end)`; add a `selectedDay` state with `prevDay` / `nextDay` / `today` actions; derive lists for the selected day.
- **Presentation**: reusable backfill form component (date + time inputs, future/ordering validation); backfill entry points on Sleep, Feeding, Diaper screens; day-navigation control on the Dashboard (and optionally the tracking screens).
- **Tests**: domain use-case tests (completed-sleep validation, explicit-time feeding/diaper), form validation tests (future rejected, end > start), day-navigation tests, and an end-to-end backfill flow test.
