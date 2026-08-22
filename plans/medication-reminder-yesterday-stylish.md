# Medication reminder: strictly-yesterday reference + stylish card

## Goal

Two refinements to the WP123 medication-reminder cards on Home:

1. **Strictly-yesterday reference**: only a dose logged **yesterday** triggers a card today. If
   the card is ignored (no dose logged today), it will **not** come back tomorrow — because
   tomorrow's "yesterday" has no dose. (Currently it uses the most-recent-prior-day-with-a-dose,
   so ignored cards reappear daily forever.)
2. **Stylish card**: restyle the compact card using the app's own M3 visual language — a
   health-green accent tile icon, a two-line header, a "Reminder" eyebrow, and pill/link actions
   — instead of the current plain gray-circle flex row that looks "too basic".

## User decisions

- Reference rule: **strictly yesterday only**.
- Card icon: **health-green accent tile** (rounded-square `--shape-md`,
  `--accent-health-bg`/`--accent-health-fg` — same as the Medication quick-add tile).
- Card density: **two-line header** ("Give {name}" + "Scheduled at {time}").

## Behaviour

1. `listMedicationReminders`: reference day = **yesterday's local calendar day** for each name.
   Entries on older days do not schedule today's cards. Everything else unchanged:
   - showable from the scheduled clock time onward, stays visible until confirmed or dismissed;
   - already-logged-today within ±30 min suppresses the card;
   - dismissal + re-arm (manual re-add today → tomorrow asks again, since tomorrow's "yesterday"
     = today with a dose).
2. Card render:
   - eyebrow `Reminder` (caption, `--md-primary`);
   - 44px rounded-square health-green tile with `PillIcon`;
   - title `Give {name}` (bold) + sub `Scheduled at {time}` (`--md-on-surface-variant`);
   - `Yes, log it` compact `.btn-primary` pill + `Don't show me again` `.link-btn` beneath.

## Acceptance criteria

- A card shows today only if the name has a dose **yesterday**; doses only on older days produce
  no card today (unit test).
- Ignoring a card (no dose logged today) means no card tomorrow (unit test: reference is
  yesterday only).
- Existing behaviour preserved: showable from scheduled time onward, all-day persistence,
  already-logged suppression, dismissal, re-arm (manual re-add → next-day ask).
- Card renders the two-line header with health-green tile, Reminder eyebrow, and pill + link
  actions; no overlapping elements.
- App tests: stacking, first-section placement, confirm-at-reference-time, dismiss persistence,
  re-arm still pass (text/buttons unchanged).
- `npm run build` PASS and `npm test` PASS.

## Constraints

- Same as WP122/WP123: presentation + domain + local persistence only; no changes to
  `AppSettings`/server/`RemoteRepositories`/medication repository; no system notifications; no
  future `MedicationEntry`; real `<button>`s with accessible names; reuse existing M3 tokens.

## Files

- `src/domain/usecase/medicationReminder.ts`
- `src/domain/usecase/__tests__/medicationReminder.test.ts`
- `src/presentation/screens/DashboardScreen.tsx`
- `src/index.css`
- `src/App.medreminder.test.tsx` (only if assertions break)

## Context

- WP122 delivered the feature; WP123 (COMPLETE) made it a compact single-line card and removed the
  "No" button + 30-min auto-clear. User then clarified the reference rule (strictly yesterday) and
  requested a more polished, less "basic" card look.
- Health accent tokens exist (`--accent-health-bg` #e6f0e8 / `--accent-health-fg` #2f6b46, dark
  #1d3a26/#9fd0b0) and are used by the Medication quick-add tile (`quick-add-health`).
- `quick-add-head` (44px icon + title/sub) and summary tiles show the established patterns to
  mirror. `--type-caption`/`--type-label`/`--type-title` and `.btn-primary`/`.link-btn` available.
- `whatsNew.ts` 0.1.10 entry remains accurate; no doc change expected.