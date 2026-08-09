# WP045 — Physical back button support

## Goal

The PWA has no back-button handling: Android's physical/gesture back and browser back do nothing useful, and sub-screen navigation isn't reflected in history. Make back behave like a native app:

- On any tab (Sleep/Feeding/Diaper/Weight), back returns to **Home**.
- In a Settings sub-screen (Profile/Units/Data & reports/Food suggestions), back returns to the **previous screen** (Settings main).
- Back from Settings main returns to the tab you were on; back from Home exits the app (default).

## Acceptance criteria

- Physical back (popstate) on any non-Home tab navigates to Home.
- Physical back in a Settings sub-screen returns to Settings main.
- Back from Settings main returns to the previous tab; back from Home exits.
- On-screen back/close buttons and sub-screen back arrows behave identically to physical back.
- Tab switches use history replace semantics so back always lands on Home; Settings/sub-screens push so back walks the stack.
- `npm run build` + `npm test` pass; tests simulate popstate for physical back.

## Constraints

- No router dependency (keep lightweight in-app navigation).
- State lives in a new `useBackNav` hook under `src/presentation/store`; browser history stays the source of truth with a React mirror stack.
- Keep all existing screens/behavior; only wire navigation through the hook.
