# M3 polish: Health-tab screens + shared quick-add pattern

## Goal

Bring the Health-tab screens built in WP102/WP103 up to the app's Material 3 standard:
**Medication & fever**, **Teeth**, **Teething**, and the **Teething & sleep** card — plus the
shared quick-add card/button pattern they all reuse. The screens currently look basic
(centered icon + single field + two stacked full-width buttons per section, plain selects,
no segmented controls, untinted quick-add cards).

This is a **visual + interaction** polish. Data model, domain use cases, repository layer,
store actions, and sync are untouched. All test-visible labels, button names, and error
strings are preserved so the existing suites keep passing.

## Requirements

- **Medication & fever screen** (`MedicationFeverScreen.tsx`):
  - Two M3 quick-add cards with a tinted leading icon container, a section title, and helper text.
  - Medication card: name text field (leading icon) + **unit chips** (mg / ml / tsp / drops,
    tap-to-select, no amount → "—") + amount field; primary **Add medication** button keeps its
    name/label; "Add past dose" secondary button stays.
  - Temperature card: value field (leading icon), a **segmented °C/°F toggle**, and **location
    chips** (rectal / axillary / ear / oral, optional); primary **Add temperature** button and
    "Add past temperature" stay.
  - Quick-add submits through the same store actions as today (unit-aware for temperature so the
    °F path works; medication amount/unit optional exactly as the domain validates).
  - List rows reuse the existing `SwipeableRow` + tinted `event-icon` pattern (health accent).
  - Latest-temperature `StatTile` uses a health accent.
- **Teeth screen** (`TeethScreen.tsx`): quick-add card restyled to the same M3 card pattern
  (tinted icon + title + helper); tooth pick stays a select (10 curated options, too many for
  chips) but is styled; chart header gets a tinted icon container.
- **Teething screen** (`TeethingScreen.tsx`): quick-add card restyled; symptom checkboxes stay
  chips (already M3); header icon tinted.
- **Teething & sleep card** (`TeethingSleepCard.tsx`): tinted icon container in the header row.
- **Shared bits** (`index.css`): add a `--accent-health-*` token pair (used by the new pill/
  thermo tints + health stat tile); add the shared M3 quick-add card styles
  (`.quick-add-card`, tinted header row, leading-icon text fields, unit/location chip rows,
  segmented control). Keep `.weight-card` working for Weight/Head-circumference screens.
- New icons if needed (e.g. an amount/thermometer leading icon); reuse existing `PillIcon`,
  `ThermoIcon`, `SmileIcon`.

## Acceptance criteria

- Medication quick-add accepts name (+ optional amount + unit via chips) and persists via the
  store; empty name still surfaces "Medication name is required".
- Temperature quick-add works in both °C and °F (segmented toggle) and persists with the chosen
  unit; out-of-range values still surface the domain range error.
- Unit/location are chosen with M3 chips; °C/°F with a segmented control; no plain `<select>`
  remains in the Medication/Fever quick-add path.
- Teeth / Teething / TeethingSleepCard use the same M3 card pattern; tooth pick select styled.
- All test-visible labels/button names/error strings preserved: existing
  `App.medfever.test.tsx` (7), `App.teeth.test.tsx` (19), store/domain/data suites unchanged.
- `npm run build` passes and `npm test` passes.

## Constraints

- Domain/data/server/store layers untouched (pure presentation + CSS work).
- Keep `weight-card` usable by Weight/Head-circumference screens; add new classes, don't break
  existing ones.
- Chips/segmented controls use the existing `.chip` / token vocabulary where possible.
- Accessibility: chips/segments are real buttons with `aria-pressed`; fields keep labels.

## Files

- `src/presentation/screens/MedicationFeverScreen.tsx` (rewrite quick-add UI)
- `src/presentation/screens/TeethScreen.tsx` (quick-add card restyle)
- `src/presentation/screens/TeethingScreen.tsx` (quick-add card restyle)
- `src/presentation/components/TeethingSleepCard.tsx` (header tint)
- `src/presentation/components/icons.tsx` (leading-icon additions if needed)
- `src/index.css` (health accent token, quick-add card, chip rows, segmented control)
- tests: `src/App.medfever.test.tsx` (extend for °F + unit chips), existing suites stay green

## Context

- WP102 = teeth/teething (validated). WP103 = medication & fever (validated).
- Existing M3 building blocks: `.card`, `.chip`/`.chip-row`/`.chip-selected`,
  `.field`/`.field-block`, `.btn-primary`/`.btn-secondary`, `StatTile`, `SwipeableRow`,
  category accent tokens (`--accent-*`), `event-icon` tinted containers.
