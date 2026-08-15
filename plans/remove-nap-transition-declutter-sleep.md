# Remove nap-transition tracking + declutter Sleep top tiles

## Goal

Two product corrections decided by the user:

1. **Remove the nap-transition tracking feature (WP101)** entirely — the manual "log nap change" logging, the "Nap schedule" card/line/pill, the history UI, and its domain/data/store/server surfaces. It was judged redundant because the app already tracks every nap, so a manual schedule-change log adds bookkeeping without real value. It was fully implemented (WP101 validated ACCEPTED) and must be cleanly reverted from the working tree.
2. **Declutter the Sleep tab top tiles** (WP100's follow-up): keep the three **day** tiles (**Total slept, Night sleep, Naps**) plus **one combined Avg/day** tile; remove the two extra average tiles (**Avg night/day**, **Avg naps/day**) that duplicate the Dashboard's averages.
3. **Move the wake-window line below the sleep-logging card** (user decision): sleep logging is the primary action, so `<WakeWindowLine>` renders after the "Start sleep timer"/"Add past sleep" card instead of above it.

## Requirements

- Delete all nap-transition (NapScheduleEvent) code paths so no dead code remains: model, repository contract, use cases, memory repo, localStorage impl, RemoteRepositories wiring, server KEYS/routes/import-optional, mock API, store actions/state, Sleep screen UI (pill, schedule card, history, modal, backfill form), and their tests.
- Remove README documentation of nap-transition tracking.
- Sleep tab top: Total slept, Night sleep, Naps (unchanged from WP100) + one Avg/day tile; drop Avg night/day and Avg naps/day tiles.
- Wake-window line appears BELOW the sleep-logging card, not above it.
- Keep the night-vs-nap split and wake-window line (WP100) fully intact — only the manual nap-change logging is removed.

## Acceptance criteria

- `rg` for `napSchedule`/`NapSchedule`/`NapScheduleEvent`/`nap-change`/`Nap change`/`nap change` finds no production, test, or mock references (except this plan and the WP101 archive records).
- Sleep screen shows exactly: Total slept, Night sleep, Naps, and Avg/day tiles; no nap pill, no "Nap schedule" card/line/history, no "Log nap change" button, no nap-change modal.
- The wake-window line renders below the sleep-logging card (sleep logging is the primary action and stays above it).
- `dailyAverages.avgNightSleepMs` / `avgNapSleepMs` may remain in the averages computation (harmless, and T-5079's rendering tiles are removed) OR be removed — prefer removing the two rendering tiles only, keeping the averages math intact to avoid churn.
- No other feature regresses: night-vs-nap split, wake windows, all other tabs/screens untouched.
- `npm run build` passes and `npm test` passes (test suite shrinks by the nap-transition tests).

## Constraints

- Client + server removal must be consistent: server `store.js` KEYS/defaults, `app.js` IMPORT_OPTIONAL_KEYS and auto-routes, `RemoteRepositories` CollectionKey/cache/queue/backup, mock API, storage keys.
- Backup forward-compat: if any user's backup already contains `napScheduleEvents`, import must tolerate it (treat as unknown/ignored) — do not break `/api/import` for old backups.
- Do not touch WP102 (teething) or WP103 (med/fever) in-flight work.

## Context

- WP101 = plans/sleep-nap-transition.md (validated ACCEPTED). The user decided after seeing it that logging nap transitions is unnecessary since naps are already tracked per-session.
- Sleep screen: src/presentation/screens/SleepScreen.tsx (nap pill, schedule card, history, nap modal), src/presentation/components/BackfillForms.tsx (NapScheduleBackfillForm), useBackNav (no nap view), time.ts helpers (formatDayMonth used by the schedule line).
