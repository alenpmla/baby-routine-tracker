# Phase 4 addendum — Breast feeding start/end times

## Goal

Record nursing as a start + end time so duration is tracked (like sleep).

## Requirements

- Tapping **Breast** opens the feed form asking start and end date/time (pre-filled with now).
- Backfill and edit of a breast feed also ask start + end.
- Bottle stays one-tap; Solids unchanged.
- Breast records store `startTime`/`endTime`; the record time is the start time (day filtering/order unchanged).
- Lists and dashboard show the duration (e.g. "Breast · 25m").

## Acceptance criteria

- Breast requires start and end; end after start; no future end.
- Editing a breast feed keeps/updates both times; switching to Bottle/Solids clears them.
- Duration shows on Feeding list and Dashboard timeline.
- Build + tests pass.
