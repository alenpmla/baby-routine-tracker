# Medication reminder card redesign (compact M3 info card + persistent visibility)

## Goal

Rework the WP122 medication-reminder card on Home into a **compact, single-line M3 info card**
that looks polished (fixes the current "ugly", overlapping, stacked layout), removes the
meaningless **"No"** button, and changes visibility semantics so the card **stays visible until
the user acts** — it must not auto-clear after the 30-minute window.

## User decisions (captured verbatim)

- "why do we even need no button what action we need to do on no click. it doesnt make sense." →
  **Remove the "No" button.** The card asks whether the dose was given; if it wasn't, the user
  simply ignores the card (it remains until acted on).
- "why notification automatically clear after 30 mins. it should be visible unless i give it or
  click dont show me again" → **No auto-dismiss.** The card is showable from the scheduled clock
  time onward and stays visible until the user either logs the dose ("Yes, log it") or taps
  "Don't show me again".
- "Single-line compact (Recommended)" → **Compact single-line layout**: icon + short text on one
  line, compact "Yes, log it" button on the right, tiny "Don't show me again" link beneath.

## Behaviour changes

1. **Remove the "No" action** and its resolved-instance persistence
   (`bt.medReminderResolved`, `resolve()` hook action, resolved skip in domain logic, and the
   "hides for today on No" behaviour/tests).
2. **Showable logic** (domain `listMedicationReminders`): an instance `(name, HH:mm)` is showable
   when ALL hold:
   - reference day exists for the name (most recent prior local day with a dose);
   - `now >= today@HH:mm` (scheduled clock time reached today) — **no upper time bound**;
   - no `MedicationEntry` for the name today within ±30 min of that clock time (already logged →
     skip; still suppresses after "Yes, log it");
   - the name is not dismissed, or a newer entry than the dismissal timestamp proves a manual
     re-add (re-arm).
   - Remove the `resolved` map entirely.
3. **Card stays visible** all day once scheduled time is reached, until confirmed or dismissed.

## Requirements

- **Domain** `src/domain/usecase/medicationReminder.ts`:
  - Change the window check from `|now - scheduled| <= REMINDER_WINDOW_MS/2` to
    `now >= scheduled` (lower bound only). Keep `REMINDER_WINDOW_MS` as the suppression-tolerance
    (±30 min around the scheduled clock time for the already-logged check). Drop the `resolved`
    parameter, `MedicationResolvedMap`, `resolvedKeyFor`, and the resolved skip.
- **Hook** `src/presentation/store/useMedicationReminders.ts`:
  - Drop `resolve` and all `bt.medReminderResolved` read/write/prune code. Keep `confirm` and
    `dismissForever`.
- **Dashboard** `src/presentation/screens/DashboardScreen.tsx`:
  - Compact single-line card: `[icon]  Give {name} at {clock}?   [Yes, log it]` with a tiny
    "Don't show me again" link under the text. Remove the "No" button. Fix any overlap by using a
    clean flex row (icon | body | confirm button) with `flex:none` on the button and `min-width:0`
    + ellipsis on the text.
- **CSS** `src/index.css`: rewrite `.med-reminder*` to a compact ~56-64px info card using existing
  M3 tokens (secondary-container avatar, on-surface title, on-surface-variant link, `.btn-primary`
  compact min-height 36px). No new tokens.
- **Tests**:
  - Update `src/domain/usecase/__tests__/medicationReminder.test.ts`: replace ±30 window-bound
    tests with "showable from scheduled time onward, still visible hours later"; remove resolved
    tests.
  - Update `src/App.medreminder.test.tsx`: remove the "No" test; add a test that the card stays
    visible at end of day (e.g. scheduled 8:30, now 20:00, not logged, not dismissed → card still
    present) until confirmed or "Don't show me again"; keep confirm/dismiss/re-arm/stacking tests.

## Acceptance criteria

- Card renders as a compact single-line M3 info card (icon + "Give {name} at {clock}?" + compact
  "Yes, log it" button + tiny "Don't show me again" link), with no overlapping elements (asserted
  via DOM structure / headless layout).
- The "No" button is gone; no `bt.medReminderResolved` writes remain; `resolve()` is removed.
- The card is showable from the scheduled clock time onward and stays visible until confirmed or
  dismissed (test: now at 20:00 for an 8:30 dose → card present).
- "Yes, log it" still logs at today's date at the reference clock time and hides the card.
- "Don't show me again" still persists across reloads; manual re-add re-arms for the next day.
- Stacking (multiple cards, clock order) and first-section placement above the summary grid are
  unchanged.
- `npm run build` PASS and `npm test` PASS.

## Constraints

- Same as WP122: presentation + domain + local persistence only; no changes to
  `AppSettings`/server/`RemoteRepositories`/medication repository; no system notifications;
  never write a future `MedicationEntry`; additive to the Dashboard log modes; real `<button>`s
  with accessible names.

## Files

- `src/domain/usecase/medicationReminder.ts`
- `src/domain/usecase/__tests__/medicationReminder.test.ts`
- `src/presentation/store/useMedicationReminders.ts`
- `src/presentation/screens/DashboardScreen.tsx`
- `src/index.css`
- `src/App.medreminder.test.tsx`

## Context

- WP122 (COMPLETE) delivered the reminder with a ±30 min showable window, a "No"/resolve action,
  and a stacked multi-line card; user feedback: ugly, overlapping, "No" meaningless, and the
  30-min auto-clear is unwanted.
- `whatsNew.ts` 0.1.10 entry wording still fits ("tap Yes to log it or Don't show me again to
  silence reminders") — no doc change expected unless wording needs a small tweak.