# Phase 4 addendum — Material Design 3 UI + adaptive layouts

## Goal

Restyle the app following **Material Design 3** guidelines (color tokens, type scale, shape, elevation, state layers) and make the layout **adaptive** across phone / tablet / desktop, including a light and dark theme.

## Requirements

- **Design tokens**: CSS custom properties for M3 color roles (primary / on-primary / primary-container / surface / surface-container-* / outline / error / …), shape scale, elevation levels, and type scale. All component colors read from tokens (no hard-coded hex in components).
- **Component polish**: filled buttons (pill shape), tonal secondary buttons, M3 icon buttons with state layers, filled text fields, filter chips, elevated cards, M3 navigation bar with active indicator, bottom-sheet modal with grabber handle.
- **Adaptive layout**:
  - Phone: bottom navigation bar, bottom-sheet dialogs, single column, comfortable 48px tap targets.
  - Desktop (>=960px): navigation **rail** on the left, larger shell width, centered dialogs, wider spacing/typography.
  - Fluid spacing/type via `clamp()` and breakpoints; no horizontal overflow.
- **Dark theme**: follows OS `prefers-color-scheme` via the token system; `color-scheme` + `theme-color` meta updated for both modes.
- **Accessibility**: visible `:focus-visible` rings, `prefers-reduced-motion` guard, `font-size`/rem scaling.

## Acceptance criteria

- All screens restyle cleanly in both light and dark mode.
- Layout adapts at phone/tablet/desktop widths without horizontal scroll or overlap; tab bar becomes a rail on wide screens.
- All existing class names and interactions are preserved (no JSX/behavioural changes, no test regressions).
- `npm run build` and `npm test` pass.

## Constraints

- Pure CSS/HTML change (`src/index.css`, `index.html`); no component logic changes.
- Keep warm neutral surface palette tuned for a baby app, mapped onto M3 roles.
