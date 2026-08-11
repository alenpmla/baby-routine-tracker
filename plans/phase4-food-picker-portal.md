# Portal the Modal overlay to document.body (fixes non-fullscreen picker + empty list)

## Goal

The food picker sheet still does not render full screen, and dismissing the keyboard
leaves an empty list. Root cause: the picker `Modal` is rendered **inside** the parent
Add/Edit feed sheet's DOM, and the parent `.modal` keeps a non-`none` `transform`
(`translateY(0)` after the slide-up animation). A `transform` on an ancestor makes
`position: fixed` descendants (the picker's `.modal-overlay`, `inset: 0`) behave like
`position: absolute` relative to that ancestor, so the "fullscreen" overlay is confined
to the parent modal's box (max-width 680px / 88dvh) and clipped — the picker never fills
the viewport and the list area collapses/disappears on viewport/keyboard changes.

## Requirements

- Render every `Modal` through a **React portal to `document.body`** so overlays are no
  longer contained by any transformed ancestor. This is the standard practice for
  modals and makes the `fullscreen` variant genuinely cover the viewport.
- The food picker (`variant="fullscreen"`) fills the real viewport, not the parent
  sheet's box.
- The picker list stays populated and correctly laid out when the on-screen keyboard is
  dismissed (no empty-list state).
- All existing Modal behaviour preserved: enter/exit animation, Escape closes only the
  topmost modal (`openStack`), overlay/X/backdrop close, content snapshot during exit,
  visualViewport scroll handling, nested picker still closes independently of the parent.
- No changes to FoodMultiSelect behaviour or props API.

## Acceptance criteria

- The `.modal-overlay` is a direct child of `document.body` (portal), not nested inside
  the parent sheet's `.modal`.
- The full-screen picker overlay covers the full viewport (its box is not constrained by
  the parent modal's `transform`/box).
- Dismissing the keyboard leaves the picker list visible and populated (no empty state).
- Escape/overlay/X/backdrop close still work for both the picker and the parent sheet;
  Escape in the picker closes only the picker.
- Enter/exit animation still plays; content stays visible during exit.
- `npm run build` and `npm test` pass, with tests updated to assert portal rendering.

## Constraints

- Change is confined to `src/presentation/components/Modal.tsx` (add
  `createPortal(document.body)` around the returned overlay) plus any test updates.
- No CSS changes required for correctness (portal fixes the containing-block issue);
  adjust CSS only if a layout regression appears.
- Keep the component API and all existing props/variants unchanged.
- No new runtime dependencies (React already provides `createPortal`).

## Context

- `Modal` renders `.modal-overlay` (fixed, inset 0) inline where it is used. The food
  picker is the first Modal nested inside another Modal, exposing the transform
  containing-block bug.
- CSS: `.modal` has `transform: translateY(...)` under `prefers-reduced-motion:
  no-preference`; `.modal.modal-open { transform: translateY(0) }` still applies a
  transform at rest.
- jsdom tests: portals still render into `document.body`, so existing `getByRole`
  queries continue to work.
