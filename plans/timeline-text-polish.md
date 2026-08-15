# Timeline main-text polish (Home M3 timeline)

## Goal

Make the **Home timeline** main text (the natural-language headline row, e.g. "Woke up at 8:00 AM",
"Had oats porridge, Banana") **look more polished and designed** — the user says it is currently
"just next thing about it" (plain) and wants it styled. This is a **presentation-only** polish of
the timeline entry cards; the wordings themselves are unchanged.

## Requirements

- **Card treatment**: the timeline entry (`<button className="tl-body">`) gets a more refined M3
  card look — surface-container-low with a subtle border + elevation-1, consistent hover/active
  state layers, and a small **category accent strip** on the leading edge tinted with the existing
  `--accent-sleep/-feed/-diaper-*` tokens.
- **Headline typography**: the headline (`.tl-word`) is styled with the category accent for the
  leading icon, a stronger title weight, and a clean two-line layout: an **icon + headline** row
  and the **meta** line beneath in on-surface-variant.
- **Leading category icon**: each entry shows a small tinted icon (MoonIcon / BottleIcon /
  DiaperIcon) in a 28px rounded container using the category accent — instead of only the rail node.
- **Rail/nodes**: keep the centered rail + node dots (recently fixed), ensure the node and the new
  icon container both read clearly in light + dark.
- No wording changes; no domain/data/store changes.

## Acceptance criteria

- Timeline entries render with the category tinted leading icon + accent strip, polished headline
  typography, and a refined card; list mode (`.event-list`) is untouched.
- The rail line still passes through the center of each node; light + dark contrast is correct.
- All existing timeline/unit tests pass; add a small component/CSS-relevant test if feasible
  (e.g. icon presence per category).
- `npm run build` passes and `npm test` passes.

## Constraints

- Presentation-only: `DashboardScreen.tsx` (markup), `src/presentation/utils/timeline.ts`
  (maybe expose an icon/tint helper), and `src/index.css`. No wording changes.
- Keep accessibility: entries are buttons with accessible names from the wording.
- Reuse M3 tokens and existing icons; do not restyle `.event-list`.

## Files

- `src/presentation/screens/DashboardScreen.tsx`
- `src/index.css` (`.tl-*` block)
- tests: `src/App.timeline.test.tsx` (extend), `src/presentation/utils/__tests__/timeline.test.ts` (if helper added)

## Context

- `DashboardScreen.tsx` renders `.tl` entries with `.tl-time` / `.tl-node` / `.tl-body` (`.tl-word`
  + `.tl-meta`). The `.tl` CSS lives in `src/index.css`.
- Category accents: `--accent-sleep/-feed/-diaper-*`; icons: `MoonIcon`, `BottleIcon`,
  `DiaperIcon`/`DirtyDiaperIcon`.
- Wordings from `src/presentation/utils/timeline.ts` (unchanged).
