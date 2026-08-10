# Animated open/close for all modal bottom sheets (and dialog variant)

## Goal

Bottom sheets and the centered dialog variant should animate in when opened and
animate out when closed — including dismissal (X, overlay tap, Escape) and
form-submit closes — instead of popping in/out instantly.

## Requirements

- All modal sheets (Add/Edit feed, Add/Edit sleep, Add/Edit diaper, Add/Edit weight,
  Add solid food) slide up on open and slide down on close.
- The centered dialog variant (delete confirmation, wake-window picker) fades + scales
  in/out.
- The closing animation plays for **every** close path: X button, overlay tap, Escape,
  and form-submit (Save). Unmount happens only after the exit transition.
- The sheet keeps its last content visible during the exit (no blank flash).
- `prefers-reduced-motion: reduce` disables the movement (elements still mount/unmount,
  content unchanged).
- Existing behaviour, roles, labels, and single-open swipe coordination unchanged.

## Acceptance criteria

- Opening a sheet/dialog plays an enter transition; closing plays an exit transition
  and the element is removed from the DOM only after it completes.
- Closing via Save (submit) animates out, not instantly.
- Overlay tap, X, and Escape each animate the sheet/dialog out.
- The closing sheet still shows its content (no empty sheet flash).
- Delete-confirmation dialog (SwipeableRow), wake-window picker (NotificationsScreen),
  and all four Add/Edit sheets are covered.
- `npm run build` passes.
- `npm test` passes (exit-delay assertions updated to wait for removal where needed).

## Constraints

- Single implementation in `src/presentation/components/Modal.tsx` (all sheets/dialogs
  already go through it). Add an `open` prop; Modal owns mount + enter/exit lifecycle
  and renders `null` when closed. `ConfirmDialog` and `DurationPicker` pass `open`
  through; screens render `<Modal open={cond}>` always (children guarded on the
  condition) instead of `{cond && <Modal>}`.
- CSS transitions in `src/index.css` under `@media (prefers-reduced-motion: no-preference)`;
  no new runtime dependencies; exit duration matches the JS unmount timer.
- No focus-trap change; keyboard focusable elements and aria-labels stay as-is.

## Context

- Modal callers: FeedingScreen (2), SleepScreen, DiaperScreen, WeightScreen (sheet);
  ConfirmDialog + DurationPicker (dialog). Sheets/dialogs are currently conditionally
  mounted, so they unmount instantly on close.
- Tests assert `queryByRole('dialog')).not.toBeInTheDocument()` right after closing
  (~17 sites); these must await removal (e.g. `waitFor`) since exit now delays unmount.
