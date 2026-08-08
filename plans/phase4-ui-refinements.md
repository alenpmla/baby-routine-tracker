# Phase 4 amendment — UI refinements (keyboard spacing + snapshot look)

## Goal

Fix two regressions from WP021/WP022:
1. **Keyboard**: the previous bottom-sheet offset created excessive empty space above the keyboard (double-offset on browsers that already lift the sheet). Revert the offset/max-height overrides; keep only scrolling the focused field into view so the form stays usable without adding spacing.
2. **Snapshots**: the stat tiles look like buttons (border + shadow + padding). Restyle them as a flat, non-interactive info element (accent icon + label + value, no box).

## Acceptance criteria

- Modals behave as before the offset change: no artificial gap above the keyboard; focused fields still scroll into view.
- Stat tiles render without button-like chrome (no border/elevation/box), clearly reading as info.
- Build + tests pass.
