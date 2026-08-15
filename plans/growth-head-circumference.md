# Growth: head circumference tracking + WHO chart

## Goal

Log the baby's **head circumference** (alongside weight) and plot it on a WHO head-circumference-for-age chart (0–24 months), mirroring the existing weight/GrowthChart experience so pediatrician visits can be tracked completely.

## Requirements

- A Head circumference entry: `{ id, time (ISO-8601 UTC), value (cm/in), unit ('cm' | 'in') }`.
- Full CRUD: log now, log past, edit, delete, duplicate — matching `WeightEntry` + `WeightScreen`.
- Latest head-circumference stat tile, and a chart on the Home dashboard (same growth-chart treatment as weight).
- WHO head-circumference-for-age percentiles (P3/P50/P97) for boys and girls, 0–24 months.

## Acceptance criteria

- A new `HeadCircumferenceEntry` model + repository + use cases (`recordHeadCircumference` validates positive value and no future timestamps; `update`/`delete`/`latestHeadCircumference`), mirroring `weight.ts`.
- The data layer persists and syncs the new collection end-to-end: localStorage impl, `RemoteRepositories` collection (`headCircumferences`), pending-op queue, server `store.js` KEYS + `/api/headCircumferences` GET/POST/DELETE, backup/import round-trip.
- Store exposes `day.headCircumferences`, `latestHeadCircumference`, `addHeadCircumference`, `updateHeadCircumferenceRecord`, `removeHeadCircumference`.
- A Head circumference screen (or tab) with quick-add, add-past, list with edit/delete/duplicate, latest stat tile.
- `growthStandards.ts` gains head-for-age data + `percentileCm(...)`; a head-circumference chart (reusing `GrowthChart`'s SVG approach) renders baby points against the P3–P97 band with a P50 median, with cm/in handling.
- `npm run build` passes and `npm test` passes (new domain/data/store/screen tests, TZ-robust, fixed timestamps).

## Constraints

- Follow the established `WeightEntry`/`WeightRepository`/`WeightScreen`/`RemoteRepositories` pattern exactly (model in `src/domain/model`, use cases in `src/domain/usecase`, storage keys in `RemoteRepositories.ts`, server KEYS in `server/store.js` + `server/app.js`).
- WHO head-circumference-for-age reference data (boys/girls, m + sd per month) must be sourced and cited in `growthStandards.ts`.
- Chart stays mobile-first; if the dashboard gets crowded, add a metric toggle rather than a second always-on chart.

## Decisions (resolved 2026-08-14)

- **Baby sex field**: add `sex?: 'male' | 'female'` to the `Baby` profile (edit screen optional select). Used for the head-circumference chart and also the existing weight chart (replaces the current `'combined'` default when a sex is set).
- **Navigation**: Weight moves into a new **Health tab** (5 tabs total: Home / Sleep / Feeding / Diaper / Health), which hosts Weight, Head circumference, Teeth/Teething, and Medication/Fever. The Health tab is implemented as a sub-navigator (tab-level views), reusing the existing settings sub-screen pattern.

## Context

- Weight implementation to copy: `src/domain/model/WeightEntry.ts`, `src/domain/usecase/weight.ts`, `src/presentation/screens/WeightScreen.tsx`, `src/presentation/components/GrowthChart.tsx`, `src/presentation/utils/growthStandards.ts`, `server/store.js` KEYS, `src/data/repositories/RemoteRepositories.ts` (CollectionKey + cache + pending ops).
- Baby is 9 months; HC is a standard part of well-child checks alongside weight.
