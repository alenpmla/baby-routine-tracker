# Health: medication & fever log

## Goal

Track **medication doses** (name, amount, unit, time) and **fever/temperature readings** (value, unit, time, notes) so the parent has an accurate medicine + temperature history — essential at 9 months when fevers and teething/illness overlap.

## Requirements

- **Medication entries**: `{ id, time (ISO-8601 UTC), name, amount, unit ('mg' | 'ml' | 'tsp' | 'drops' | ''), notes? }`.
- **Temperature entries**: `{ id, time (ISO-8601 UTC), temp, unit ('c' | 'f'), location? ('rectal' | 'axillary' | 'ear' | 'oral'), notes? }`.
- A **Health** tab/screen with two quick-add sections (Medication, Temperature), past-entry add, list with edit/delete/duplicate, and a latest-temperature stat tile (e.g. "37.4 °C").
- A compact history view: day's meds + temperatures in the timeline; optionally a small "recent 7 days" line chart of temperatures.

## Acceptance criteria

- New `MedicationEntry` + `TemperatureEntry` models with repositories and use cases (`recordMedication` validates non-empty name and non-negative amount/unit pairing; `recordTemperature` validates 30–45°C / 86–113°F range and no future timestamps; update/delete), mirroring `weight.ts`.
- Data layer persists + syncs both collections end-to-end: localStorage impls, `RemoteRepositories` collections (`medications`, `temperatures`), pending-op queue, server KEYS + routes, backup/import round-trip.
- Store exposes `day.medications`, `day.temperatures`, `latestTemperature()`, and add/update/remove actions for both.
- Health screen: quick-add both types, add-past, list (with dose/temp shown), edit/delete/duplicate, latest-temperature tile.
- `npm run build` passes and `npm test` passes (domain/data/store/UI tests, TZ-robust, fixed timestamps).

## Constraints

- Follow the established collection pattern end-to-end (model → use case → localStorage impl → `RemoteRepositories` → server KEYS/routes → store → screen).
- No dosage calculators, no medication interaction warnings — this is a log only. Amount/unit optional for meds like "vitamin D drops" where a number may not apply.
- Temperature is a plain reading log; flag nothing as a medical alert (a >threshold highlight is acceptable as passive UI, not a claim).

## Decisions (resolved 2026-08-14)

- **Navigation**: A new **Health tab** replaces the Weight tab in the bottom bar (5 tabs total: Home / Sleep / Feeding / Diaper / Health). The Health tab is a sub-navigator hosting Weight, Head circumference, Teeth/Teething, and Medication/Fever as tab-level views (reusing the settings sub-screen pattern). WeightScreen moves under Health unchanged.

## Context

- Baby is 9 months: teething + first fevers/illnesses are common; parents routinely need to answer "when was the last dose / what's the temp trend" — today there is nowhere to record this.
- Collections to mirror: `WeightEntry`/`weight.ts`/`WeightScreen`; server `store.js` KEYS + `app.js` routes; `RemoteRepositories.ts` CollectionKey + cache + pending ops; DayNav/Modal/SwipeableRow/StatTile components.
