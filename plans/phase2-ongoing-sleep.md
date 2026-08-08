# Phase 2 addendum — Backfill an ongoing ("still sleeping") past sleep

## Goal

When adding a past sleep, let the user log a sleep that **started in the past and is still running**, without entering an end time. It becomes the active sleep timer so the user taps **Stop sleep** when the baby wakes.

## Requirements

- The "Add past sleep" form offers two modes: **Still sleeping** (ongoing) and **Completed**.
- **Still sleeping**: only a start date + time is asked. Start must be in the past. Submitting starts the sleep timer at that past time (it becomes the running timer shown on the Sleep screen with elapsed time).
- **Completed**: existing behaviour — start + end, end after start, no future times.
- If a sleep timer is already running, starting an ongoing backfill shows an error (only one running sleep at a time).
- Stopping the ongoing backfilled sleep works exactly like the normal timer (Stop sleep → completed session appears in that day's list).

## Acceptance criteria

- A user can add a past sleep that is still ongoing and is NOT asked for an end time.
- The ongoing backfilled sleep appears as the running timer ("Sleeping now … Started at <time>").
- Tapping Stop sleep completes it and it appears in the day list.
- A future start time is rejected.
- Attempting an ongoing backfill while a timer is already running shows an error and keeps the existing timer intact.

## Constraints

- No data-layer change; reuse the existing active-sleep model (`endTime: null`).
- Follow existing Clean Architecture and store conventions.
- Quick-add timer behaviour unchanged.

## Context

- `startSleep(repo, now)` already accepts an explicit start time — only needs a future-time guard and a store action that accepts an optional `at`.
- `SleepBackfillForm` currently always requires end; add the mode toggle. `SleepScreen` routes `ongoing` to the start-timer action and `completed` to `logPastSleep`.
