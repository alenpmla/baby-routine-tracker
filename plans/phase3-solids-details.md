# Phase 3 addendum — Solid-food details (food, amount, unit)

## Goal

When logging a **solids** feeding, capture what food was given, how much, and the unit (oz or gram). Bottle/Breast stays one-tap as today.

## Requirements

- **Solids quick-add**: tapping the Solids chip opens a small form asking for **food** (required), **amount**, and **unit** (oz / gram) before saving. Bottle/Breast chips keep recording instantly.
- **Solids backfill**: the "Add past feed" form shows the same food/amount/unit fields when Solids is selected.
- Amount is optional; if provided it must be > 0 and must have a unit (and vice versa).
- Lists and the dashboard timeline show the details, e.g. "Solids · Banana · 2 oz".

## Acceptance criteria

- Tapping Solids opens the details form; saving with a food name records a solid feed.
- Saving without a food name shows an error and does not record.
- An amount without a unit (or unit without amount) is rejected; a non-positive amount is rejected.
- The recorded feed shows the food (and amount + unit when provided) on the Feeding list and Dashboard timeline.
- Backfill of a past solid feed captures the same details.
- Bottle and Breast quick-add behaviour is unchanged.

## Constraints

- No data-layer/server changes: the JSON store persists arbitrary fields by id.
- Keep Clean Architecture: domain model + use case validation, store passes details through.
- `FeedingSession` gains optional fields `food?: string`, `amount?: number`, `unit?: 'oz' | 'gram'`.

## Context

- `recordFeeding(repo, type, now)` currently builds the session with only id/time/type. Extend with an optional `details`.
- Feeding chip flow and the shared backfill form are the two entry points; a reusable `SolidsFields` input group keeps them consistent.

## Suggested tasks

- Domain: optional fields on `FeedingSession`; `recordFeeding` accepts details and validates (food required for solids, amount/unit pairing, amount > 0).
- Store: `addFeeding(type, at?, details?)`.
- Presentation: `SolidsFields` component; FeedingScreen Solids modal; backfill solids fields; display labels in FeedingScreen + Dashboard.
- Tests: domain validation, quick-add modal, backfill solids, e2e solid flow with details shown.
