# Phase 4 amendment — StatTile as an M3 elevated metric card

## Goal

Present the per-category snapshots as a proper **Material 3 elevated card** (the standard M3 component for a stat/metric): surface-container background, soft elevation, **no outline border** (the border made it look like a button), a tonal 44dp leading icon container, a label, and a large value.

## Acceptance criteria

- Each snapshot is an M3 elevated card (surface-container-low + elevation-1, radius 16, no border).
- Leading icon sits in a 44dp tonal container tinted per category; label is small/muted, value is a large headline.
- Layout stays consistent across Sleep / Feeding / Diaper and adapts (1–2 cards per row).
- Build + tests pass.
