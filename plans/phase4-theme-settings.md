# Phase 4 amendment — Theme selection in Settings (System / Light / Dark)

## Goal

Let the user choose the app theme in **Settings**: **System** (follow OS), **Light**, or **Dark**. The choice persists on the device and applies immediately (no reload).

## Acceptance criteria

- A theme picker (System / Light / Dark) appears in Settings.
- Choosing an option applies it immediately and persists across reloads (localStorage).
- CSS token themes honor a `data-theme` attribute: `light` forces light, `dark` forces dark, otherwise it follows `prefers-color-scheme` (system).
- A tiny inline script sets the attribute before first paint to avoid a theme flash.
- `theme-color` meta + `color-scheme` update with the chosen theme.
- Theme is a device-local UI preference (not synced to the server).
- Build + tests pass.

## Constraints

- No server/model changes; local UI preference only.
