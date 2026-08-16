# Fix: back-dismissing the graph sheet reloads the home screen (stats reset)

## Goal

Dismissing the growth-chart zoom sheet with the browser/hardware **back button** must simply close the sheet and leave the app on the home screen, exactly like the close button does. Today it can **reload the page and reset the home stats** because the back-overlay handler relies on a fragile `window.history.pushState`-inside-`popstate` trick.

## Background / root cause

- The zoom sheet (`src/presentation/components/GrowthChartZoomModal.tsx`) registers a back overlay via `registerBackOverlay(onClose)` (useBackNav.ts) but pushes **no history entry** when it opens.
- `useBackNav.ts` popstate handler (lines 96-113): when an overlay is active it calls `activeOverlay()` then `window.history.pushState({ bt: 'app' }, '')` to try to "cancel" the back.
- Problem: when the user presses back, the browser has *already* popped the prior entry. If that entry is a real document URL (e.g. the pre-PWA entry, or an entry whose URL differs from the current one), the browser commits a real navigation → full page reload → `TrackerProvider` re-initializes → home stats reset. The `pushState` inside the handler cannot reliably undo an already-committed navigation.
- The close button path never touches `history`, which is why it behaves correctly.
- The generic `Modal` (WP112) reuses the same `registerBackOverlay` + `useBackNav` popstate path, so the same fragility applies to all sheets/dialogs.

## Requirements

1. Pressing back while the graph zoom sheet is open closes the sheet; the app stays on the same screen with **no page reload** and **no stats reset** (no "Loading…" flash).
2. The fix must be centralized in the overlay mechanism (`useBackNav.ts` `registerBackOverlay` + popstate handler) so all modals/sheets/dialogs benefit consistently (zoom sheet, generic `Modal`, confirm dialogs, pickers).
3. A dedicated history entry must be pushed when an overlay opens and consumed when it is dismissed by back, so back pops an entry whose URL matches the current document (no real navigation). Nested overlays (e.g. FoodMultiSelect inside the solids sheet) must remain ordered correctly.
4. Closing via X / close button / Escape / backdrop / drag-dismiss must leave a subsequent back press behaving normally (no swallowed or double back, no off-by-one history).
5. No regression to existing navigation: with no overlay open, all current back scenarios still pass (tabs → Home, Settings sub-screens, Health sub-screens, Home exit, reload-restore, zoom-modal back test).
6. `npm run build` passes and `npm test` passes.

## Acceptance criteria

- Back on the zoom sheet: sheet closes, `Home` heading still visible, no reload indicator, no stats reset (mirror the close-button result).
- Back on a generic sheet (e.g. add-feed): sheet closes, holding screen stays.
- Nested: with FoodMultiSelect picker open inside the solids sheet, back #1 closes the picker only, back #2 closes the sheet, screen stays.
- After any non-back close (X/Escape/backdrop/drag), the next back navigates as before (no swallowed/double back).
- No-modal back scenarios unchanged (existing `App.back*`/`App.zoommodal` tests green).
- `npm run build` PASS; `npm test` PASS (new + existing tests).

## Constraints

- Fix lives in `src/presentation/store/useBackNav.ts` (overlay registration + popstate) and the overlay users only if strictly necessary (`GrowthChartZoomModal.tsx`, `Modal.tsx`). Preserve the module-level `registerBackOverlay` API.
- Match the established history-mirroring invariants: in-memory `stackRef` and browser history depth must stay consistent (they are used by reload-restore, `goToTab` `history.go(-depth)`, and `pendingBacks`).
- jsdom tests must keep passing (they dispatch `PopStateEvent` directly). Any new test should assert behavior observable in jsdom (overlay closed, screen unchanged, no `location.reload` call), plus keep the real-browser reload protection as a documented invariant.
- Follow the project's no-comments-unless-consistent style and run work through the Agent Loop only.
