# Home log: Material-3 timeline view (opt-in via Settings)

## Goal

Offer an alternative **Material-3 vertical timeline** presentation of the day's log on the
Home page — natural-language wordings (e.g. "Woke up at 8:00 AM", "Had oats porridge +
banana", "Had 180 ml bottle", "Wet diaper") laid out on a time rail — **without ripping off
the existing design**. The current card list stays the default; a new setting in **Settings**
lets the parent choose between the current list and the new timeline view.

## Requirements

- **New synced setting**: `homeLogView?: 'list' | 'timeline'` on `AppSettings`, defaulting to
  `'list'` so fresh installs and existing users keep the current design. Persisted and synced
  through the existing `updateSettings`/settings-repository path (same pattern as `theme` and
  `averagesDays`).
- **Settings control**: a "Home log" card with an M3 segmented control — **List / Timeline** —
  reusing the existing `.segmented`/`.seg-selected` pattern already used for Theme and
  Averages window.
- **Timeline view** (DashboardScreen, replaces only the rendered log section when enabled):
  - Vertical time rail (a line with node dots) using M3 surface/outline tokens.
  - Each entry: time, a category node tinted with the existing `--accent-sleep/-feed/-diaper-*`
    tokens, and natural-language wording.
  - Wordings:
    - Completed sleep → **"Woke up at {time}"** (user example: "baby wake up at 8 am"); running
      sleep → **"Sleeping since {time}"**; both keep the duration/ongoing meta line.
    - Solids feeding → **"Had {foods}"** (e.g. "Had oats porridge") with amount/duration as a
      secondary meta line.
    - Bottle feeding → **"Had {amount} bottle"**; Breast → **"Nursed {duration}"**.
    - Diaper → **"Wet diaper" / "Dirty diaper" / "Diaper (both)"**.
  - Tapping an entry navigates to the matching tab, exactly as the list view does today
    (reuse `KIND_TAB`).
- **Default = current design**: when the setting is `list` (or unset), the DOM, labels, and
  CSS of today's `.event-list` are untouched.
- **Wording helpers** live in a tested presentation utility (e.g. `src/presentation/utils/timeline.ts`),
  not in the domain layer — this is a pure presentation change.

## Acceptance criteria

- Settings shows a "Home log" segmented control (List / Timeline); choosing Timeline persists,
  survives reload, and syncs through the settings round-trip (offline + server).
- With Timeline selected, the Home log renders as a vertical M3 timeline with natural-language
  wordings (including "Woke up at …" for completed sleeps and "Had …" listing solids foods);
  with List selected (and for fresh installs), it renders the existing card list unchanged.
- Tapping a timeline entry navigates to the same tab the list entry would.
- All existing test-visible strings/classes preserved in list mode; existing suites
  (`App.*.test.tsx`) pass unchanged.
- New unit tests cover the wording helpers (sleep/feeding/diaper) and the settings toggle.
- `npm run build` passes and `npm test` passes.

## Constraints

- Presentation-only: no changes to domain models, repositories, use cases, or the server.
  Add wording helpers under `src/presentation/utils` with their own tests.
- Keep current design intact — do not modify existing `.event-list`/`.event-*` rules; add new
  timeline CSS in `index.css` using the M3 token vocabulary.
- Accessibility: timeline entries are real `<button>`s with accessible names; time and wording
  are not conflated.
- Follow the established settings pattern (`AppSettings` field + `updateSettings`), and keep
  the default to the existing list so no one loses the current UI.

## Open decision (resolve during planning/discovery)

The user's examples include "had vitamin d" (a medication/health wording), but today's Home
log only surfaces sleep, feeding, and diaper. Options:

- **(a) Recommended** — scope the timeline to the same three kinds as the list, so List and
  Timeline show identical content and the switch is purely presentational.
- (b) Also include Health entries (medication/temperature) in the timeline — a content change
  on the Home screen that would make List and Timeline differ.

## Files

- `src/domain/model/AppSettings.ts` (add `homeLogView?` + default)
- `src/presentation/screens/SettingsScreen.tsx` (segmented control card)
- `src/presentation/screens/DashboardScreen.tsx` (conditional timeline render)
- `src/presentation/utils/timeline.ts` (new wording helpers)
- `src/index.css` (M3 timeline rail/node/word styles)
- tests: new `src/presentation/utils/__tests__/timeline.test.ts`, settings/Dashboard test
  coverage for the toggle

## Context

- Home log section: `DashboardScreen.tsx` renders `day.events` (sleep/feeding/diaper) in a
  `.event-list` inside `<section className="timeline">`.
- Settings segmented pattern: `SettingsScreen.tsx` Theme + Averages window cards drive
  `updateSettings` via `ThemeProvider`/`SnapshotPrefsProvider`.
- Existing vocabulary to reuse: `formatClock`, `describeFeedingTitle`, `describeFeedingMeta`,
  `formatDuration`, `sleepKind`/`inferSleepKind`, `foodsOf`, category accents, `.chip`,
  `.segmented`, `--md-*` tokens.
