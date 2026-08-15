# Sleep: nap-transition tracking (3 naps → 2)

## Goal

Let the parent **record nap-schedule transitions** (e.g. dropping the 3rd nap, moving to 2 naps) and **see when the change happened** so they can correlate it with sleep quality and wake windows around the 9-month transition.

## Requirements

- A nap-schedule event: `{ id, time (ISO-8601 UTC), fromNaps: number, toNaps: number, notes? }` (e.g. 3 → 2).
- Log it quickly (default "now", or pick a past date), list events, edit/delete.
- Show the current nap count (latest event) in the Sleep screen header, and a small "nap schedule" line on the sleep day view (e.g. "2 naps · switched 3→2 on Aug 3").
- A simple timeline/list of transitions (Settings sub-screen or Sleep screen) so the parent can review history.

## Acceptance criteria

- New `NapScheduleEvent` model + repository + use cases (`recordNapTransition` validates 1–6 naps, toNaps != fromNaps, no future timestamps; update/delete), mirroring `weight.ts`.
- Data layer persists + syncs end-to-end: localStorage impl, `RemoteRepositories` collection (`napScheduleEvents`), pending-op queue, server KEYS + `/api/napScheduleEvents` GET/POST/DELETE, backup/import round-trip.
- Store exposes `napScheduleEvents`, `latestNapCount()`, `addNapTransition`, `updateNapTransition`, `removeNapTransition`.
- Sleep screen shows the current nap count and recent transition; a transition can be added/edited/deleted from the UI.
- `npm run build` passes and `npm test` passes (domain/data/store/UI tests, TZ-robust, fixed timestamps).

## Constraints

- Follow the established collection pattern (model → use case → localStorage impl → `RemoteRepositories` → server KEYS/routes → store actions → screen).
- Keep it lightweight: an event log, not a planner — no scheduling/alerts.
- Reuse `SleepScreen`/DayNav/Modal conventions; new events default to the selected day or now.

## Context

- Baby is 9 months; the 3→2 nap drop is the common transition at this age. Recording the date lets the parent see sleep/diaper/feeding patterns before vs after the switch.
- Existing collections to mirror: `WeightEntry`/`weight.ts`/`WeightScreen`; server `store.js` KEYS + `app.js` routes; `RemoteRepositories.ts` CollectionKey + cache + pending ops.
