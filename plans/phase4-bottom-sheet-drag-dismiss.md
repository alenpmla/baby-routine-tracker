# Bottom sheet drag-to-dismiss

## Goal

Bottom sheets (the `Modal` `variant="sheet"` used for Add/Edit feeds, sleep, diaper,
weight, etc.) should dismiss by **dragging the sheet downward** (standard M3 bottom-sheet
behavior), in addition to the existing overlay tap, X, and Escape. Dragging the header
or the top drag-handle area translates the sheet with the finger; releasing past a
threshold dismisses it, otherwise it snaps back.

## Requirements

- Dragging down on the sheet's header/top-handle area translates the sheet live with the
  pointer (no transition while dragging).
- Releasing beyond a dismiss threshold (e.g. min(140px, ~30% of sheet height)) slides the
  sheet fully down and calls `onClose()`.
- Releasing below the threshold animates the sheet back to its resting position.
- Applies to `sheet` and `fullscreen` variants; NOT to the centered `dialog` variant.
- The drag must not conflict with interactive content: it starts only from the header or
  the top handle/padding region, not from buttons/inputs/scrollable body.
- Escape/overlay/X and the nested-modal topmost behavior are unchanged.
- `prefers-reduced-motion: reduce` disables the drag gesture.

## Acceptance criteria

- Dragging the sheet header/handle down moves the sheet; releasing past the threshold
  calls `onClose()`; releasing below it returns the sheet to rest without closing.
- The dialog variant is unaffected (no drag-to-dismiss).
- Interactive elements inside the sheet (buttons, inputs) are not hijacked by the gesture.
- Existing close paths (Escape, overlay tap, X) still work.
- `npm run build` and `npm test` pass.

## Constraints

- Implement inside `src/presentation/components/Modal.tsx` using pointer events + inline
  transform (a `.modal-dragging` class to disable the CSS transition while dragging).
- Reuse the existing enter/exit lifecycle; on dismiss, animate down then call `onClose()`.
- Add tests in `src/presentation/components/__tests__/Modal.test.tsx`.

## Context

- `Modal.tsx` renders `.modal-overlay > .modal` (sheet/dialog/fullscreen) in a portal;
  `.modal::before` is the drag handle. Close paths today: overlay click, header X, Escape.
- `.modal` uses `transform: translateY(...)` for enter/exit (0.24s), so inline transform
  during drag must disable the transition, then re-enable for snap-back/dismiss.
