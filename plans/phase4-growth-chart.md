# Phase 4 addendum — Dashboard weight progress chart with typical range

## Goal

Show a **weight progress chart** on the Home dashboard: the baby's logged weights plotted over age, overlaid on the **typical weight-for-age range** (WHO Child Growth Standards, 0–24 months, P3–P97 band with the P50 median).

## Acceptance criteria

- A "Weight progress" section appears on the Dashboard when weight entries exist.
- The chart is a responsive SVG: shaded P3–P97 "typical range", a median (P50) line, and the baby's weight points connected in time.
- Age is computed from the baby's DOB; axes labelled in months and kg.
- Source noted as WHO weight-for-age standards.
- Build + tests pass.

## Constraints

- Reference data embedded (boys/girls median + SD, monthly 0–24), combined average for the band; linear interpolation between months.
- No new chart dependency (custom SVG).
