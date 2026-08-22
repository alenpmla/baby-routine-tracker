# Multi-theme: mode + accent picker

## Goal

Add theme accent support: keep the existing **System / Light / Dark** mode control, and add an
**accent-color picker** in Settings with 5 options — **Violet** (current default look), **Ocean**,
**Forest**, **Sunset**, **Rose**. Accents tint the M3 primary/secondary/tertiary tokens (and their
containers) in both light and dark. Existing behaviour preserved; default = current look.

## User decision

"Mode + accent picker": keep System/Light/Dark mode control; ADD a separate accent selector
(5 options, current = default).

## Design

- New synced setting `themeAccent?: ThemeAccent` on `AppSettings` with
  `type ThemeAccent = 'violet' | 'ocean' | 'forest' | 'sunset' | 'rose'`. Default `'violet'`.
- `ThemeProvider` exposes `accent` + `setAccent` and applies `data-accent="<accent>"` on
  `<html>` (removes the attribute when accent is the default violet).
- `SettingsScreen` gets a second "Appearance" card: an accent row of 5 labeled swatches
  (colored dots + name) next to the existing mode segmented control.
- `index.css`: define per-accent M3 palettes scoped to `:root[data-accent='ocean|forest|sunset|rose']`
  (violet = base, no override) for light, and matching dark overrides under both the system-dark
  `@media` block and the manual `:root[data-theme='dark']` block. Override `--md-primary`,
  `--md-on-primary`, `--md-primary-container`, `--md-on-primary-container`, `--md-secondary*`,
  `--md-tertiary*` (12 tokens).

## Acceptance criteria

- Settings shows an accent picker (5 swatches) alongside the mode control; choosing one persists
  via `updateSettings({ themeAccent })`, survives reload, and syncs.
- Applying an accent changes the primary/secondary/tertiary colors app-wide in both light and
  dark (and both system-dark and manual-dark paths) while keeping the category accents
  (sleep/feed/diaper/health/etc.) unchanged.
- Violet (default) renders exactly as today when unset.
- `data-accent` attribute is set/removed correctly by `ThemeProvider`.
- `npm run build` PASS and `npm test` PASS.

## Constraints

- No server schema change needed (`normalizeSettings` preserves unknown fields; store merges).
- Follow the existing settings patterns (`ThemeProvider`/`updateSettings`, `.segmented`,
  `.settings-theme`). Add minimal `.accent-*` CSS.
- Keep mode control semantics identical; accent is additive.

## Files

- `src/domain/model/AppSettings.ts` (add `ThemeAccent`, `themeAccent?`)
- `src/presentation/store/ThemeProvider.tsx` (accent state + `data-accent`)
- `src/presentation/screens/SettingsScreen.tsx` (accent picker)
- `src/index.css` (per-accent palettes, light + both dark paths)
- tests: `App.settings.test.tsx` or new accent assertions

## Context

- WP133 fixed system-dark missing accent tokens; the current `:root`/dark blocks define the
  violet look. Accents will add override blocks after the base tokens.
- Precedents: `ThemeProvider.tsx` applies `data-theme`; `SettingsScreen` `THEME_OPTIONS`
  segmented; `updateSettings` merges patches; synced `AppSettings` fields.