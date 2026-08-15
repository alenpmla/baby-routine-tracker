# Sleep: night sleep vs naps + wake windows between naps

## Goal

Distinguish **night sleep** from **naps** so stats (totals, averages, insights, report) split them, and show the **wake windows between naps** to guide the 9-month two-nap schedule.

## Requirements

- A `kind: 'nap' | 'night'` field on `SleepSession` (nullable for legacy records, defaulting by an inference rule aligned with the existing `SleepScreen` heuristic — night = a completed sleep whose **start** falls in the local 7pm–9am window (`hour >= 19 || hour < 9`), otherwise nap; editable per session).
- When logging/backfilling sleep, the user chooses **Nap** or **Night** (or it is auto-inferred and adjustable on edit).
- Sleep stats split nap vs night:
  - Sleep screen: separate **Total slept**, **Naps** (count + total), **Night sleep** (total).
  - `averages.ts`, `insights.ts`, the daily-averages UI, and the PDF report's sleep/daily totals keep working and report nap vs night where meaningful.
- **Wake windows between naps**: for a selected day, show the gap (wake window) between each completed nap's end and the next sleep's start, plus the current window since the last nap ended (reusing `getWakeInfo`).

## Acceptance criteria

- `SleepSession.kind?: 'nap' | 'night'` is persisted, synced, imported/exported, and backfilled with legacy inference (all existing records render correctly without user action).
- Sleep form (quick-add timer + backfill modal) lets the user mark Nap/Night; edits preserve/change it.
- Sleep screen shows at least: night total, nap count + nap total, and total; day lists label each session Nap/Night.
- Wake-window line appears on the sleep day view showing gap between naps (and the live "awake since X" when awake), driven by existing `wakeWindow.ts` helpers.
- `npm run build` passes and `npm test` passes; existing sleep tests stay green (legacy records without `kind` still work).

## Constraints

- Follow the sleep pattern in `src/domain/model/SleepSession.ts`, `src/domain/usecase/sleep.ts`, `src/presentation/screens/SleepScreen.tsx`, `src/domain/usecase/averages.ts`, `src/domain/usecase/insights.ts`.
- Server `store.js`/`app.js` need no new collection — `kind` rides on the existing `sleeps` items (no schema migration beyond optional field).
- Night definition must be timezone-aware (local time), consistent with `time.ts` helpers; document the inference rule.

## Context

- `wakeWindow.ts` already exposes `getWakeInfo` (ms since last completed sleep ended) and `shouldFireWakeReminder`; `useWakeStatus.ts`/`useWakeWindowReminder.ts` consume them.
- Baby is 9 months — typical schedule is 2 naps; the wake-window display supports planning the 2-nap transition.
