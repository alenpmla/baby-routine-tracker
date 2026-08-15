# Baby milestones: sitting, crawling, rolling over, and more

## Goal

Track **developmental milestones** (rolling over, sitting, crawling, standing, walking, first smile, first words, etc.) so the parent can record when their baby achieves each one and see the timeline of firsts at a glance.

## Requirements

- **Milestone entries**: `{ id, time (ISO-8601 UTC), milestone: string, notes? }` where `milestone` is a pick of a curated, age-ordered list (e.g. lift head, roll over, sit up, crawl, pull to stand, first word, walk) or custom.
- One entry per milestone achievement; the same milestone may be re-recorded only if the parent chooses a custom label (no duplicate-type restrictions beyond that).
- Screens: a **Milestones** screen (list of achieved milestones newest-first, with age-at-achievement shown) plus add/edit/delete, mirroring the established collection screens (e.g. `MedicationFeverScreen`, `WeightScreen`).
- **Firsts summary**: on the Milestones screen (or a small card), show the "firsts" — earliest recorded date for the common curated milestones (roll over, sit, crawl, stand, first word, walk) with the baby's age then, so `null`/empty for not yet achieved.

## Acceptance criteria

- New `MilestoneEntry` model with repository and use cases (`recordMilestone` validates a non-empty milestone value and no future timestamps; update/delete), mirroring `weight.ts`/`medication.ts`.
- Data layer persists + syncs end-to-end: localStorage impl, `RemoteRepositories` collection (`milestones`), pending-op queue, server KEYS + routes, backup/import round-trip.
- Store exposes `day.milestones`, `allMilestones()`, add/update/remove actions, and a `firstMilestones()`/`firsts` helper for the common curated list.
- Milestones screen: list newest-first with age-at-achievement, add/edit/delete, and a "Firsts" summary row/card for the curated milestones.
- `npm run build` passes and `npm test` passes (domain/data/store/UI tests, TZ-robust, fixed timestamps).

## Constraints

- Follow the established collection pattern end-to-end (model → use case → localStorage impl → `RemoteRepositories` → server KEYS/routes → store → screen).
- Curated milestone list is a fixed, age-ordered set (with a "custom" free-text escape hatch); the enum itself is not free-text.
- Pure log + read-only summary: no milestone "due date" alerts, no expected-age nudging, no medical claims.
- Reuse existing components (`DayNav`/`Modal`/`SwipeableRow`/`StatTile`) and the Health sub-view navigation pattern.

## Decisions (resolved 2026-08-15)

- **Navigation**: Milestones lives under the existing **Health** tab as a sub-view (menu entry alongside Weight, Head circumference, Teeth & teething, Medication & fever). No new bottom-bar tab.

## Context

- Baby is 9 months: rolling, sitting, and crawling are recent/expected; the parent wants a reliable "when did they first do X" record.
- Collections to mirror: `WeightEntry`/`weight.ts`/`WeightScreen`, `MedicationEntry`/`medication.ts`/`MedicationFeverScreen`; server `store.js` KEYS + `app.js` routes; `RemoteRepositories.ts` CollectionKey + cache + pending ops; store via `TrackerProvider.tsx` + `timeline.ts`.
