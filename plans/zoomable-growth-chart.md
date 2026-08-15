# Zoomable home growth chart

## Goal

Make the Home dashboard **growth charts** (weight and head-circumference progress) **zoomable** so
the parent can pinch/drag to focus on a time range instead of always seeing the full 0–24 month span.

## Requirements

- **Zoom + pan** on the SVG plot area (time axis): pinch-to-zoom on touch, wheel/trackpad on
  desktop, plus drag-to-pan. The value (y) axis stays auto-scaled to the visible window.
- **No pinch-zoom conflicts**: the page-level pinch zoom must not fight the chart; the chart uses
  its own transform on the rendered data (viewBox manipulation or a translated/scaled `<g>`).
- Controls: an **M3 reset button** (e.g. a small "Reset" chip/icon) appears when the view is
  zoomed, returning to the full range. A subtle "pinch to zoom" hint on first load.
- Preserves all existing render (percentile band, P3/P50/P97, baby line, points, legend, note,
  aria-label) — only the visible x-window changes under zoom.
- No domain/data/store changes: `GrowthChart.tsx` + `index.css` only, plus tests.

## Acceptance criteria

- A time window narrower than full range can be selected via wheel/pinch; the chart re-scales
  x-axis ticks and the baby line/percentile band to that window; the y-axis re-fits the window.
- Dragging pans within the total 0–24 month range (clamped at edges).
- Reset returns to the full range and hides the reset control; the hint shows on first load only.
- All existing growth-chart tests pass; new tests cover zoom-in, pan clamping, and reset.
- `npm run build` passes and `npm test` passes.

## Constraints

- Pure presentation change in `GrowthChart.tsx` + `src/index.css`; do not touch domain/data/store.
- Accessible: the zoomed state is announced; reset is a labelled button; keyboard pan via arrows.
- Reuse M3 tokens; keep the existing legend/note/aria intact.

## Files

- `src/presentation/components/GrowthChart.tsx`
- `src/index.css`
- `src/presentation/components/__tests__/GrowthChart.test.tsx` (extend)

## Context

- `GrowthChart.tsx` renders a fixed `0 0 620 300` SVG with a 0–24 month x-axis and an auto y-range.
- Dashboard shows weight + head-circumference charts; both use the same component.
- M3 chip/button vocabulary and `--md-*` tokens available.
