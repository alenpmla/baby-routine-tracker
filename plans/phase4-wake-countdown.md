# WP048 — Time left to sleep (wake window countdown)

## Goal

On the **Home (Dashboard)** and **Sleep** tabs, show how much time remains until the baby's wake window is up ("time left to sleep"), based on the configured wake window (Settings → Notifications).

## Acceptance criteria

- While the baby is awake, the Home and Sleep screens show the time left until the wake window elapses (e.g. "Nap time in 2h 15m"), ticking periodically.
- When the wake window has already elapsed, show an overdue state (e.g. "Time for a nap!").
- While the baby is asleep, no countdown is shown.
- When there is no wake window (e.g. no completed sleep yet), nothing is shown.
- Only relevant on today's view.
- Uses the configured wake window duration from notification prefs.
- `npm run build` + `npm test` pass.

## Constraints

- New `useWakeStatus` hook under `src/presentation/store` (reuses `getWakeInfo`/threshold logic); reuses the existing `.pill` styles; no server changes.
