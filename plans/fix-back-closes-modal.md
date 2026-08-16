# Fix: browser/hardware back closes the screen instead of an open modal

## Goal

When any modal/sheet is open (add/edit feed, sleep, weight, medication, milestone, teething, solids picker, confirm dialog, etc.), pressing the browser/hardware **back button must close the modal** and leave the app on the holding screen. Currently back pops the nav stack behind the modal (closes the holding screen), because only `GrowthChartZoomModal` registers a back overlay.

## Background / root cause

- `src/presentation/store/useBackNav.ts` exposes `registerBackOverlay(fn)` — a single global slot. Its `popstate` handler closes the overlay when one is active (and re-pushes a history entry so the app stays put).
- `src/presentation/components/GrowthChartZoomModal.tsx` uses `registerBackOverlay(onClose)` and works (covered by `App.backnav.test.tsx` test 18 and `App.zoommodal.test.tsx`).
- `src/presentation/components/Modal.tsx` (the shared sheet/dialog/fullscreen component used by every screen's forms) does **not** register a back overlay, so back pops the screen.
- `Modal.tsx` already maintains a module-level `openStack` so only the **topmost** open modal handles Escape (nested pickers like `FoodMultiSelect` inside the solids sheet). The back overlay must respect the same topmost rule.

## Requirements

1. An open `Modal` registers a back overlay while it is the **topmost** open modal; closing it (X / Escape / backdrop / drag-dismiss / onClose) unregisters.
2. Nested modals: only the topmost handles back; when a nested one closes, the modal beneath regains the back overlay.
3. Browser/hardware back with a modal open closes that modal and leaves the app on the same screen (nav stack unchanged, matching the zoom-modal behavior: `registerBackOverlay` + `window.history.pushState` in `useBackNav`).
4. Back with no modal open behaves exactly as today (tabs → Home → exit; settings/health sub-screens pop correctly). No regression to any existing `App.backnav`/`App.back`/`App.backexit`/`App.zoommodal` scenario.

## Acceptance criteria

- Pressing back while any `Modal` (sheet, dialog, fullscreen) is open closes the modal; the holding screen remains (heading still visible, tab unchanged).
- Nested case: with the solids "Add foods" fullscreen picker open inside the "Add solid food" sheet, back closes the picker only; a second back closes the sheet; the screen stays.
- Closing a modal via X / Escape / backdrop / drag-dismiss leaves the app on the same screen, and a subsequent back press navigates as before (no swallowed or double back).
- With no modal open, all existing back-navigation scenarios still pass (tab → Home, Settings sub-screens, Health sub-screens, Home exit).
- `npm run build` passes; `npm test` passes (new + existing back/modal tests).

## Constraints

- Fix lives in `src/presentation/components/Modal.tsx` (use the existing `openStack` + `registerBackOverlay`). Do not change `useBackNav.ts` semantics or `GrowthChartZoomModal` behavior.
- Follow the established convention: register a single back overlay via the module-level `registerBackOverlay`; the topmost modal wins; unregister to `null` when nothing is open.
- Keep exit-animation behavior intact (modal animates out over `EXIT_MS` before unmount; overlay is released when `open` flips false).
- No comments unless already consistent with the file's style; match existing conventions.
