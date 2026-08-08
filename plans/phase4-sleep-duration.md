# Phase 4 addendum — Sleep durations (total + per item)

## Goal

The **Sleep** screen shows how long the baby slept: a **total for the selected day** next to the day heading, and the **duration on each completed sleep** in the list.

## Acceptance criteria

- The timeline header shows `Total slept · 3h 20m` (sum of completed sleeps for the day; hidden when there's nothing to sum).
- Each completed sleep item shows its duration, e.g. `9:00 → 10:30 · 1h 30m`.
- Ongoing sleeps stay as `→ ongoing` (no duration).
- Dashboard timeline duration display is unchanged.
- `npm run build` and `npm test` pass.

## Constraints

- Pure presentation change in `SleepScreen.tsx` + a small CSS addition.
- Reuse existing `formatDuration` helper.
