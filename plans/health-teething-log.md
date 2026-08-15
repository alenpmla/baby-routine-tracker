# Health: teeth / teething log with sleep-pattern correlation

## Goal

Track **teeth and teething days** — which teeth came in, and days with teething symptoms (drooling, fussiness, fever) — so the parent can see whether rough nights cluster around teething days at 9 months.

## Requirements

- **Teeth entries** (tooth eruption): `{ id, time (ISO), tooth: string, notes? }` where `tooth` is a pick of the standard baby teeth (e.g. central incisor lower/upper, lateral, first molar, etc.) or custom.
- **Teething days** (symptom log): `{ id, day (ISO date), symptoms: string[] (drooling, fussy, fever, poor sleep, chewing, ears), notes? }` — one per day.
- Screens: a **Teeth** screen (chart of erupted teeth + list) and a **Teething** log (add a day with symptom checkboxes, list, edit/delete).
- **Correlation insight**: for the selected period, compare average sleep (duration) and night-wakings on teething days vs non-teething days, shown as a small "Teething & sleep" card (reusing `getDailyAverages`/sleep totals).

## Acceptance criteria

- New models `ToothEntry` + `TeethingDay` with repositories and use cases (validate tooth/symptoms values, no future timestamps; update/delete), mirroring `weight.ts`/`diaper.ts`.
- Data layer persists + syncs both collections end-to-end: localStorage impls, `RemoteRepositories` collections (`teeth`, `teethingDays`), pending-op queue, server KEYS + routes, backup/import round-trip.
- Store exposes `day.teeth`, `day.teethingDays`, `eruptedTeeth()`, add/update/remove for both.
- Teeth screen shows a simple tooth chart (mouth grid with erupted teeth marked) and the entry list; Teething screen supports symptom checkboxes per day.
- A "Teething & sleep" card compares average sleep on teething vs non-teething days in the last 14/30 days (per `averagesDays` setting).
- `npm run build` passes and `npm test` passes (domain/data/store/UI tests, TZ-robust, fixed timestamps).

## Constraints

- Follow the established collection pattern end-to-end (model → use case → localStorage impl → `RemoteRepositories` → server KEYS/routes → store → screen).
- Symptom set and tooth names are a fixed, curated list (no free-text for the enum fields; notes optional free-text).
- Correlation is a read-only insight computed from existing sleep records — no new sleep logic.
- Teething symptoms may include "fever" — do NOT duplicate the medication/fever log; keep it as a symptom checkbox here, with the dedicated fever log as the source of truth for temperature readings.

## Decisions (resolved 2026-08-14)

- **Navigation**: Teeth and Teething screens live under the new **Health tab** (5 tabs total: Home / Sleep / Feeding / Diaper / Health) as sub-views, alongside Weight, Head circumference, and Medication/Fever.

## Context

- Baby is 9 months: central + lateral incisors typically erupting; teething-driven sleep disruption is expected.
- Collections to mirror: `WeightEntry`/`weight.ts`/`WeightScreen`, `DiaperChange`/`diaper.ts`/`DiaperScreen`; server `store.js` KEYS + `app.js` routes; `RemoteRepositories.ts` CollectionKey + cache + pending ops; averages via `src/domain/usecase/averages.ts`.
