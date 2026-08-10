# Food variety: smooth expand/collapse animation

## Goal

Make the Food variety card expand and collapse with a smooth Material-style animation
(chevron already rotates). The detail body should glide open/closed instead of popping
in/out, while respecting `prefers-reduced-motion`.

## Requirements

- When the header is tapped, the details body animates open (slides/fades in) and closed
  (slides/fades out) rather than appearing/disappearing instantly.
- The chevron keeps its 180° rotation (already present) and stays in sync with the
  animation.
- Animation respects `prefers-reduced-motion` (no animation when reduced motion is set),
  consistent with the existing `.food-variety-chevron` transition block.
- Accessibility is preserved: the toggle keeps `aria-expanded` + `aria-controls`; the
  details region is announced appropriately; content is still reachable/readable when
  expanded.
- Collapsed state still renders no visible food details; expanded state shows the full
  list (same as today). No layout regressions (sticky app bar, keyboard, other cards).

## Acceptance criteria

- Expanding: details animate in (height/opacity) and chevron rotates to 180°.
- Collapsing: details animate out and chevron rotates back.
- With `prefers-reduced-motion: reduce`, expand/collapse is instant (no transition).
- `aria-expanded` and `aria-controls` remain correct during/after animation.
- `npm run build` passes.
- `npm test` passes (existing food-variety integration tests keep passing; if the DOM
  presence of the details body changes, tests are updated to assert on visibility
  semantics, not removed).

## Constraints

- No new runtime dependencies; hand-rolled CSS animation.
- Keep the details body in the DOM across both states where needed for CSS transitions
  (e.g. grid-rows/opacity technique or measured max-height) OR keep the conditional
  render and animate on mount with a CSS enter animation + exit via a short-lived
  "closing" state. Prefer the approach with the smallest test churn.
- The animation must not break `prefers-reduced-motion: no-preference` existing pattern
  (`.food-variety-chevron` transition already sits in that media query).
- Mobile-first; no horizontal overflow during animation.

## Context

- `FoodVarietyCard.tsx` currently conditionally renders `{open && <div class="food-variety-details">…}`.
- CSS: `.food-variety-details` (padding + top border), `.food-variety-chevron(-open)`,
  reduced-motion block at `src/index.css:286`.
- WP056 delivered the expand/collapse behaviour; this WP only adds the motion polish.
