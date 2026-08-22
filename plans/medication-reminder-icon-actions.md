# Medication reminder card: icon actions + dose description

## Goal

Polish the WP124 reminder card's actions and description:

1. **Actions as icon text buttons**: replace the plain filled `btn-primary` "Yes, log it" pill with
   a **positive icon text-button** (check icon, positive/green color), and make "Don't show me
   again" a **negative icon text-button** (dismiss/negative icon, error color). No more "ugly"
   filled pill.
2. **Description includes the dose**: instead of "Scheduled at {time}", show the actual dose —
   e.g. "Give 1.25 ml of Vitamin D" (amount + unit when present), and also keep the time.

## User decisions

- Actions: material-style text buttons with icons — positive (check, green) for "Yes, log it";
  negative (dismiss icon, error/red) for "Don't show me again".
- Description wording: "Give {amount} {unit} of {name}" (dose), and mention the time too.

## Behaviour / UI

- Card body sub-line becomes the dose: if `amount !== undefined && unit`, render
  "Give {amount} {unit} of {name}"; otherwise "Give {name}". Keep the time on the same line:
  e.g. "Give 1.25 ml of Vitamin D · 8:30 AM" (formatClock).
- Actions row:
  - `Yes, log it` → `.med-reminder-confirm` icon text-button: `CheckIcon` + label, color
    `--accent-health-fg` (green) or a dedicated positive token.
  - `Don't show me again` → `.med-reminder-dismiss` icon text-button: dismiss/close icon +
    label, color `--md-error` (red).
- Add a small `CloseIcon`/dismiss icon to `icons.tsx` if none exists (check first).

## Acceptance criteria

- "Yes, log it" renders as an icon text-button with a check icon and positive color (not the
  filled pill).
- "Don't show me again" renders as an icon text-button with a dismiss icon and negative (error)
  color.
- The card description shows the dose ("Give 1.25 ml of Vitamin D" when amount+unit exist; plain
  "Give Vitamin D" when not) AND the time.
- All existing behaviours/tests still pass (stacking, first-section, confirm logs at reference
  time, dismiss persistence, re-arm).
- `npm run build` PASS and `npm test` PASS.

## Constraints

- Same as WP122–WP124: presentation only; reuse existing M3 tokens and the existing
  `CheckIcon`; add a dismiss/close icon only if needed; real `<button>`s with accessible names.

## Files

- `src/presentation/components/icons.tsx` (add `CloseIcon` if absent)
- `src/presentation/screens/DashboardScreen.tsx`
- `src/index.css`
- `src/App.medreminder.test.tsx` (if assertions change)

## Context

- WP124 made the card a health-green two-line info card. User now wants the action pill replaced
  with positive/negative icon text-buttons, and the description to name the dose (not just
  "Scheduled at ..."). `CheckIcon` exists (`icons.tsx:112`). Error token `--md-error` exists
  (`index.css:25`). Health-green `--accent-health-fg` exists. Need a close/dismiss icon check.