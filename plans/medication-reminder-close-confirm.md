# Reminder card: close (X) button with confirmation dialog

## Goal

Replace the card's "Don't show me again" action with a **close (X) button at the top-right of
the card**. Tapping it opens an **M3 confirmation dialog** asking the user to confirm they won't
see reminders for this medication batch until they manually add it again (notifications resume
from the next day after that). The confirmation text should be short and clear.

## User intent

- No "Don't show me again" text button; instead a close (X) on the card's top-right corner.
- Tapping X asks a confirmation: hiding reminders for this medication until the user manually
  logs it again; after that, reminders resume from the next day.
- Keep the message short and clearer.

## Behaviour

1. Card top-right: an `X` close icon button (`CloseIcon`), distinct from the modal Close label
   (accessible name e.g. "Hide reminders for {name}").
2. Tapping X opens `ConfirmDialog` (existing component):
   - Title: "Hide reminders?"
   - Message (short & clear): "You won't be asked about {name} again until you log it manually —
     reminders resume the next day."
   - Actions: **Cancel** / **Hide reminders**.
3. Confirm → `medReminders.dismissForever(name)` (same persistence as before: per-name ISO
   timestamp in `bt.medReminderDismissed`; re-arm when a newer entry than the dismissal exists).
   Cancel → close dialog, card stays.
4. Actions row keeps only the positive "Yes, log it" (check icon, green), right-aligned.

## Acceptance criteria

- The "Don't show me again" button is gone; the card has a top-right X close button.
- Tapping X opens a confirmation dialog with short, clear text covering: won't be asked again for
  that medication until manually logged; reminders resume from the next day after that.
- Cancel closes the dialog and keeps the card; confirm hides the card and persists the dismissal.
- Existing persistence/re-arm behaviour unchanged (`bt.medReminderDismissed`, re-arm on manual
  re-add).
- App tests updated: dismiss flow now goes X → dialog → confirm; all other tests pass.
- `npm run build` PASS and `npm test` PASS.

## Constraints

- Presentation + domain only; reuse existing `ConfirmDialog`, `CloseIcon`, `Modal`; no changes to
  server/AppSettings/repositories. Real `<button>`s with accessible names.

## Files

- `src/presentation/screens/DashboardScreen.tsx` (X button + ConfirmDialog + state)
- `src/index.css` (`.med-reminder-close`, actions alignment)
- `src/App.medreminder.test.tsx` (dismiss-flow assertions)

## Context

- WP125 added icon text-buttons (check/close) in the actions row; WP126 moved dose to the
  description and positive action to the right. `ConfirmDialog` (`components/ConfirmDialog.tsx`)
  already implements an M3 dialog (title, message, Cancel / confirm). `CloseIcon` exists
  (`icons.tsx`). Re-arm semantics documented in `medicationReminder.ts`.