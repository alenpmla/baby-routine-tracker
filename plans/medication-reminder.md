# Medication reminder card on Home

## Goal

Show a **medication reminder card on the Home screen** (as the **first section**, above the
"Sleep today / Feeding today / Diapers today" summary grid). The card asks the parent whether
they already gave a dose they gave around the same time on a previous day; if they agree, the
app logs that medication dose. A subtle **"Don't show me again"** action permanently silences
reminders for that medication — but if the same medication is logged again manually later, the
reminder re-arms and asks again the next day.

## User requirement (verbatim intent)

- In Home, show a card asking whether to add the medication or not; if the user agrees, add that
  medication log.
- When to show: **ask around the same time as the previous day's dose**. Example: antibiotic
  recorded yesterday morning 8:30 and evening 8:30 PM → ask "did I give the antibiotic?" today
  around the same times (8:30 AM and 8:30 PM). Same logic applies to all medications.
- A subtle **"Don't show me again"** stops the reminder logic for that medication permanently.
- If that same medication is started again (logged manually), the reminder asks again next day.
- The card is the **first section** on Home, before the Sleep today / Feeding today / Diapers
  today summary grid.

## Reminder logic (specification)

Reference day per medication name = the most recent local calendar day **strictly before today**
that has at least one `MedicationEntry` for that name. Today's scheduled times = the clock times
(local HH:mm) of that reference day's doses for that name.

A reminder instance for `(medName, scheduledClockTime)` on today is **due/showable** when ALL hold:

1. There is at least one reference day for that name (see above).
2. `|now - today@HH:mm| <= REMINDER_WINDOW_MS` where `REMINDER_WINDOW_MS = 60 min` (the card is
   showable from 30 min before to 30 min after the scheduled clock time on the local day).
3. **No `MedicationEntry` already exists today for that name within the same window of that
   clock time.** This includes any entry the user added **manually** (Health tab quick-add /
   add-past) OR via the card's own "Yes, log it" action. If the user already recorded the dose
   today (manually or otherwise) around that time, the card must NOT appear — never nag about a
   dose that is already logged. (Note: this naturally prevents the card from re-appearing after
   "Yes, log it", since that action logs the entry.)
4. The name is not in the **"don't show me again"** dismissal list.
5. The instance `(today | name | HH:mm)` is not **resolved** (user answered "No" today).

Reminder **re-arm**: any manual add/duplicate of a medication (`addMedication`) with a name that
is in the dismissal list removes that name from the list, so the logic asks again the next day.

## Requirements

- **Pure decision logic** in a new domain use case `src/domain/usecase/medicationReminder.ts`,
  mirroring the `wakeWindow.ts` style (pure functions, no timers, no storage writes):
  - `listMedicationReminders(entries, dismissed, resolved, now)` →
    `{ name, scheduledClock, within }[]` of today's due/showable reminders.
  - `isMedicationDismissed(dismissed, name)`.
  - `removeMedicationDismissal(dismissed, name)` (re-arm on manual add).
  - Time handling: derive reference day and clock times from **local** calendar semantics; the
    pure function takes an injected `now` (ISO string) so tests are deterministic. Export a
    `REMINDER_WINDOW_MS = 3_600_000` constant.
- **Persistence**:
  - Dismissal list per device in localStorage key `bt.medReminderDismissed` (JSON array of med
    names) — same namespace convention as `bt.wakeNotifiedForEnd`. Read/written via small
    helpers in the new presentation hook.
  - Resolved instances per device in localStorage key `bt.medReminderResolved` (JSON record keyed
    by `YYYY-MM-DD|name|HH:mm`). Prune entries older than 7 days on read.
- **Hook** `src/presentation/store/useMedicationReminders.ts` (mirrors
  `useWakeWindowReminder.ts`):
  - Ticks every 30 s; reads `day.medications` (all of today + prior days from the store),
    dismissed list, resolved list, and `now`.
  - Exposes `reminders` (showable list), `confirm(name)` (logs the dose at the **reference clock
    time today** — see below), `resolve(name, scheduledClock)` (marks resolved for today),
    `dismissForever(name)` (adds to dismissal list).
  - **Confirm/log semantics (user clarification):** confirming the card does NOT log at "now".
    Instead it **duplicates the previous day's reference entry, changing only the date**: the new
    `MedicationEntry` keeps the same `name`, `amount`, `unit`, `notes`, and the same clock time
    (HH:mm) as the reference-day entry, but its date is today (local), producing an ISO-8601 UTC
    timestamp for today at that clock time. If the reference day has multiple entries for the
    name at the scheduled clock time, match the reference entry by clock time (first match) and
    copy it. Implement via `combineLocalDateTime(toInputDate(today), toInputTime(refEntry.time))`
    from `src/presentation/utils/time.ts`.
  - On `confirm`, also clears the name from the dismissal list (re-arm semantics).
- **Dashboard card** (`src/presentation/screens/DashboardScreen.tsx`):
  - Render the reminders section as the **first section** inside the page, before the summary
    grid (before the "Sleep today / Feeding today / Diapers today" cards).
  - **Stacking:** if multiple reminders are showable, render **one card per showable reminder,
    stacked vertically, top to bottom**, in chronological order (earliest clock time first) within
    the section. Each card is independent (its own Yes/No/Don't-show actions); resolving or
    confirming one card does not affect the others.
  - Each showable reminder renders as a **Material Design 3 info / notification card** (M3
    "Info banner"-style card): leading icon in a tinted circular container, title + supporting
    text, and an inline action row — the M3 info-card anatomy, not a plain list card.
    - **Anatomy**: a circular icon avatar (`--md-secondary-container` fill,
      `--md-on-secondary-container` glyph, e.g. the existing pill/medication icon) on the left;
      title `{name} around {clock}` in `--md-on-surface` (type body-large); supporting line
      "Did you give {name} around {time}?" in `--md-on-surface-variant` (type body-medium);
      action row with filled **"Yes, log it"** (`.btn-primary`) and tonal/text **"No"** (`.btn`
      tonal using `--md-secondary-container`), plus the subtle **"Don't show me again"** link
      (`.link-btn`, `--md-primary`, `--type-caption`).
    - Card container: `--md-surface-container-low` (or `--md-surface-container`) background,
      `--shape-lg` radius, `--elevation-1`, `1px solid var(--md-outline-variant)` — consistent
      with the existing `.card` token vocabulary.
  - "Yes, log it" → `confirm(name)` — logs the dose at **today's date at the previous day's
    clock time** (duplicates the reference entry, changing only the date); "No" → `resolve(...)`
    (hides card; logic still applies tomorrow); "Don't show me again" → `dismissForever(name)`
    (hides card permanently for that name until re-added manually).
  - If there are no showable reminders, render nothing (no empty section). Multiple showable
    reminders stack as a vertical list of cards, one per reminder, ordered by clock time.
  - Styling: add minimal `.med-reminder` (and `.med-reminder-icon` / `.med-reminder-actions`)
    CSS in `index.css` using ONLY the existing M3 token vocabulary (`--md-*`, `--shape-*`,
    `--elevation-*`, `--type-*`, `.btn`, `.btn-primary`, `.link-btn`). Reuse the existing pill /
    medication SVG icon if one exists (check `src/presentation/components` icons); otherwise add
    a small inline M3 info icon (circular avatar) consistent with the icon set.

## Acceptance criteria

- A reminder card appears as the **first** Home section (above the summary grid) around the
  previous day's dose time for the same medication name; with an antibiotic at 8:30 and 20:30
  yesterday, today it is showable around 8:30 and 20:30 (within ±30 min).
- Tapping **"Yes, log it"** adds a `MedicationEntry` for that name **at today's date at the
  previous day's clock time** (same name/amount/unit/notes as the reference entry; only the date
  changes), and the card disappears (dose now logged within window).
- **Manual-log suppression:** if a `MedicationEntry` for that name already exists today within
  the window (added manually via the Health tab, or via the card), no reminder shows for that
  instance — never nag about an already-logged dose.
- Tapping **"No"** hides that instance for today but it still triggers tomorrow if the logic
  applies (reference day with a dose still exists).
- Tapping **"Don't show me again"** hides it for that name and persists across reloads; the name
  is no longer considered for any day. After manually adding that same medication again, the
  name is removed from the dismissal list and the reminder asks again the next day.
- If a dose of the same name was already logged today within the window, no reminder shows for
  that instance.
- New unit tests for `medicationReminder.ts` (reference-day selection, clock-time schedule,
  window bounds, already-logged skip, dismissal skip, resolved skip, re-arm), a hook test, and a
  Dashboard/App test that the card is the first section and its actions work.
- `npm run build` passes and `npm test` passes.

## Constraints

- Presentation + domain + local persistence only. **No changes** to `AppSettings`, the server
  (`server/store.js`, `server/app.js`), `RemoteRepositories`, or the medication repository —
  reminders derive purely from existing `MedicationEntry` data and per-device localStorage.
- No scheduling/timer alarms beyond the existing 30 s polling pattern (same as wake-window
  reminder). No system notifications for this feature.
- The reminder must never write a future `MedicationEntry` (store rejects future timestamps).
- Dashboard default list/timeline log modes are untouched; the reminder section is additive.
- Accessibility: the card's actions are real `<button>`s with accessible names.
- Timezone robustness: all logic and tests use injected `now` + fixed timestamps; use the
  existing `formatClock`/local-date helpers from `src/presentation/utils/time.ts`.

## Files

- `src/domain/usecase/medicationReminder.ts` (new — pure logic)
- `src/domain/usecase/__tests__/medicationReminder.test.ts` (new)
- `src/presentation/store/useMedicationReminders.ts` (new hook)
- `src/presentation/store/__tests__/useMedicationReminders.test.ts` (new, or folded into an
  existing store test file)
- `src/presentation/screens/DashboardScreen.tsx` (first-section reminder cards)
- `src/index.css` (`.med-reminder` styles, minimal)
- `src/App.medreminder.test.tsx` (new — end-to-end Home card test) or an existing App suite
- `src/presentation/store/TrackerProvider.tsx` (only if needed for `addMedication` re-arm
  semantics — prefer handling in the hook to keep the store unchanged)

## Context

- `MedicationEntry` (`src/domain/model/MedicationEntry.ts`): `{ id, time, name, amount?, unit,
  notes? }`; `recordMedication`/`updateMedication` reject future timestamps.
- Store exposes `day.medications`, `addMedication(name, at?, ...)`,
  `updateMedicationRecord`, `removeMedication` (`TrackerProvider.tsx` lines 616-640); `day`
  recomputes on every mutation via `version` bump.
- Dashboard (`DashboardScreen.tsx`): summary grid at lines ~105-120 (Sleep/Feeding/Diapers
  cards) — the reminder section goes **above** it; `day.events` never contains medications, so
  the card is a separate section fed by the new hook, not by `day.events`.
- Precedent for once-per-cycle local dedupe + polling: `useWakeWindowReminder.ts`
  (`bt.wakeNotifiedForEnd`, 30 s interval); `showSystemNotification`/`notify.ts` not needed here.
- Tests conventions: domain uses `MemoryMedicationRepo` (`src/test/memoryRepos.ts`); store uses
  `TrackerProvider` + `Probe` pattern (`setupApi`/`createMockApi`); screen tests render `<App/>`
  with `timelineList` helpers. Gates: `npm run build`, `npm test`.