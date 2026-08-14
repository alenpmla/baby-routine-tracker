# Settings: "What's new" item showing recently shipped features

## Goal

Add a **"What's new"** item to the Settings screen that opens a sub-screen listing the
recently shipped features/changes, so users can see what's new in the app.

## Requirements

- A new "What's new" row in the Settings main screen (matching the existing
  `.settings-nav` card style with icon, title, meta, chevron).
- Tapping it opens a new settings sub-screen (like Profile/Units/Data) listing recent
  feature entries (version/date + short description).
- The list is a static changelog maintained in code (e.g. `src/presentation/utils/whatsNew.ts`
  or inline), ordered newest first.
- Back button returns to Settings (same navigation pattern as other sub-screens).

## Acceptance criteria

- The Settings screen shows a "What's new" row.
- Tapping it shows a screen titled "What's new" with a list of recent features, newest first.
- Back returns to Settings.
- `npm run build` and `npm test` pass.

## Constraints

- Follow the existing `SettingsView` navigation pattern (`useBackNav.ts` type +
  `SettingsScreen` `view` prop + `App.tsx` wiring).
- Reuse the `.settings-nav` card styling; add a sub-screen header consistent with
  FoodSuggestionsScreen/UnitsScreen (back button + title).
- Content: a curated, code-maintained changelog (recent WP features), newest first.

## Context

- `SettingsView = 'main' | 'profile' | 'suggestions' | 'units' | 'data' | 'notifications'`
  (useBackNav.ts:4); `App.tsx:71-74` passes `view` and navigates.
- `SettingsScreen.tsx` renders sub-screens by `view` and the main list with
  `.settings-nav` buttons (lines 109-162).
- Recent shipped features to list (from the loop): offline→online auto-sync, proactive
  offline banner, sync feedback snackbar, duplicate-on-swipe for weight, distinct list
  icons (bowl/dirty diaper), compact solids rows with tap-to-expand food list, food
  search focus ring fix.
