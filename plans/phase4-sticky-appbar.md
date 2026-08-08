# Phase 4 addendum — M3 sticky Top App Bar + Settings back

## Goal

Give every screen the Material Design 3 **Top App Bar** treatment:
- **Sticky** at the top of the viewport (app-like on mobile web).
- Container = `surface`; when content scrolls under it, transitions to `surface-container` with elevation level 2 (the M3 "elevated on scroll" variant).
- Content color `on-surface`; leading **back arrow** (BackIcon) on Settings and its sub-screens; trailing **Done** text button on Settings.
- Add a leading back arrow to the main Settings screen.

## Acceptance criteria

- `.screen-header` is sticky and full-bleed; elevates on scroll per M3.
- Settings main header gains a leading back arrow (closes Settings); sub-screens keep their leading back arrows.
- No invented chrome: uses M3 color roles + elevation tokens.
- Build + tests pass.
