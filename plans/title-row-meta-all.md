# Compact title rows: meta on the title line for short-meta records (sleep keeps bottom)

## Goal

Make list-item rows consistent and compact. Records with a short meta (time/amount) put
the meta on the **title line** (right after the title, subtle), matching the solids rows
from WP088. Sleep keeps its longer `start → end · duration` meta on the **bottom line**
because it's a range and inherently longer.

## Requirements

- **Bottle / breast** feeding rows: title line shows `Bottle 12:25 PM · 120 ml` /
  `Breast 8:00 AM · 25 min` (title + subtle meta inline).
- **Diaper** rows: `Diaper (wet) 12:25 PM` inline.
- **Weight** rows: `Weight 12:25 PM · 7.5 kg` inline.
- **Solids** rows: unchanged from WP088 (`Solids 12:25 PM · 90 gram` inline).
- **Sleep** rows: unchanged — title `Sleep`/`Sleeping` on line 1, `start → end · duration`
  on the bottom meta line.
- Keep icon slot, swipe actions, and the subtle meta styling; no data/logic changes.

## Acceptance criteria

- Bottle/breast, diaper, and weight rows show title + meta on one line (inline, subtle
  meta), matching solids.
- Sleep rows keep the two-line layout (title, then start→end · duration below).
- `npm run build` and `npm test` pass, with existing text-presence assertions verified.

## Constraints

- Scope: a shared `.title-row` style (reuse the WP088 inline-flex pattern) applied in
  `FeedingScreen.tsx` (non-solids branch), `DiaperScreen.tsx`, `WeightScreen.tsx`; sleep
  untouched. `src/index.css` gets the shared class.
- Do not change the sleep render or any domain/data.

## Context

- WP088 added `.solids-title-row` (inline-flex, gap 6px, title/meta `flex:none`) and used
  it for solids. Reuse/extend it as a shared `.title-row` for the other short-meta rows.
- Current renders: FeedingScreen non-solids `event-title` + bottom `event-meta`;
  DiaperScreen `event-title` + `event-meta` (time); WeightScreen `event-title` + `event-meta`
  (time · weight); SleepScreen `event-title` + `event-meta` (start→end · duration).
