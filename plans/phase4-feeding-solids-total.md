# Phase 4 addendum — Feeding screen solids total snapshot

## Goal

The **Feeding** screen shows a snapshot of the **total solid food consumed** for the selected day (e.g. `Today: 2 feeds · 150g of solids`).

## Acceptance criteria

- The Feeding header shows the day's total solids amount for the selected day (works for past days too, like the sleep total).
- Oz and gram amounts are normalized into a single total: if any gram record exists the total is shown in grams (oz converted at 1oz = 28.35g), otherwise in oz.
- Non-solids feeds are ignored by the total.
- Hidden when the day has no solids.
- `npm run build` and `npm test` pass.

## Constraints

- Pure presentation: a helper in `src/presentation/utils/feeding.ts` + a sub-line in `FeedingScreen`.
