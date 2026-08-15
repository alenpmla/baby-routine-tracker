# Zoomable growth chart via modal (no scroll conflict)

## Goal

Make the Home growth charts zoomable **without interfering with page scroll**. Tapping the
(static) growth chart opens a **full-screen modal** containing a large zoomable version of the
same chart. Inside the modal, pinch/wheel zoom + pan + reset work freely because the page behind
is not scrollable while the modal is open — so the dashboard list keeps normal scrolling.

## Requirements

- **Dashboard**: the existing `GrowthChart` stays static (unchanged) — no wheel/pan handlers,
  no `touch-action` hacks, no scroll interference.
- **Tap to zoom**: the chart (and a subtle "tap to zoom" affordance) opens a modal with a larger,
  interactive chart for the same metric.
- **Modal zoom chart**: full-screen M3 dialog with:
  - pinch / ctrl+wheel zoom about the cursor,
  - drag + arrow-key pan (clamped to 0–maxMonth),
  - y-axis refits to the visible window,
  - "Reset zoom" control when zoomed,
  - a close/back button (X) and Escape-to-close.
- The modal renders the same data/percentile band/legend/note as the inline chart.
- Accessible: modal has a labelled dialog role, focus trapped, Escape closes, zoomed state announced.

## Acceptance criteria

- The inline dashboard chart has **no** zoom handlers; page scroll over it works normally.
- Tapping the chart opens the modal zoom view; Escape / X / backdrop closes it.
- Inside the modal: pinch/wheel zooms, drag/arrows pan, reset restores full range, y-axis refits.
- Legend + note + aria present in both views; all existing growth tests pass unchanged.
- New tests: tap opens modal, Escape closes, zoom-in changes ticks in the modal.
- `npm run build` passes and `npm test` passes.

## Constraints

- Presentation-only: `GrowthChart.tsx`, a new zoomable modal component (or `GrowthChartZoomModal.tsx`),
  `Modal.tsx` reuse if suitable, `index.css`. No domain/data/store changes.
- The inline `GrowthChart` keeps its current API; add an optional `onOpenZoom` callback or wrap in a
  tappable container from the Dashboard.
- Reuse M3 tokens; keep the existing legend/note/aria.

## Files

- `src/presentation/components/GrowthChart.tsx` (optional `onOpenZoom` + affordance)
- `src/presentation/components/GrowthChartZoomModal.tsx` (new, interactive chart in a modal)
- `src/presentation/screens/DashboardScreen.tsx` (wire tap → modal, per weight/HC chart)
- `src/index.css` (modal + zoom styles)
- tests: `src/presentation/components/__tests__/GrowthChart.test.tsx` (extend), new modal test file

## Context

- `GrowthChart.tsx` renders the static 0–24 month chart; earlier inline zoom attempts fought page
  scroll. A modal isolates the interactive gesture.
- M3 `Modal` component exists for other screens; reuse its dialog pattern.
- The zoom interaction code (window/pan/reset) was developed for the earlier inline attempt and can
  be reused inside the modal.
