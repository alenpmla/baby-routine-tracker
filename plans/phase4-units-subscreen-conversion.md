# Phase 4 addendum — Units sub-screen, PDF amount conversion, M3 back buttons

## Goal

1. The PDF report's feeding table shows amounts **converted to the preferred report unit** (e.g. a `2 oz` feed displays as `57g` when `g` is selected) instead of the raw recorded unit.
2. Move the **Snapshot units** and **Report units** cards into their own **Units sub-screen** in Settings (like the Food suggestions sub-screen).
3. Align sub-screen back controls with **Material Design**: a leading back arrow icon (start of the header) rather than a trailing "‹ Back" text link.

## Acceptance criteria

- PDF feeding table amounts convert oz↔g and oz↔ml to the preferred report unit.
- Settings main shows a "Units" nav entry → dedicated Units sub-screen with Snapshot + Report unit selects; back returns to Settings.
- Sub-screen headers use a leading `BackIcon` button next to the title (M3 top-app-bar pattern); main Settings keeps its trailing "Done" text action.
- Build + tests pass.
