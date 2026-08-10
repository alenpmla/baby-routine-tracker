# Food variety card → smart insight with Material expand/collapse

## Goal

Turn the "Food variety · last 7 days" card on the Feeding screen into a compact,
M3-style **expandable insight card**. In its collapsed state it shows only the overall
week summary (headline, score, covered-group chips) so the user can absorb the big
picture at a glance without the full list of foods; tapping the header expands the
details (per-group rows with their foods and "try …" hints) using a proper Material
expand/collapse (accordion) pattern.

## Requirements

- Collapsed default: card shows a header ("Food variety · last 7 days" + chevron/expand
  affordance), a short insight headline summarizing the week (e.g. "6 of 7 food groups
  covered"), and a compact visual summary (covered groups as small icon chips / the
  X-of-7 score). It must **not** print the full per-group food list in the collapsed state.
- Tapping the header toggles an M3 expand/collapse: the detail body slides open/closed,
  the chevron rotates, and the state is announced (button carries `aria-expanded` and
  `aria-controls`; the section is labelled).
- Expanded state shows the existing detail rows unchanged in content: per-group icon,
  name, distinct foods (covered) or "none yet — try …" hint (uncovered), and the
  ✓/○ status badge.
- Behaviour invariants preserved from WP055: card hidden when no solids in the 7-day
  window, hidden on past/future days, rolling 7-day classification, case-insensitive
  dedupe, no false positives (pear vs pea).
- Keyboard accessible: the header is a real `<button>`, toggling works with Enter/Space,
  and focus stays usable. No new runtime dependencies.

## Acceptance criteria

- Collapsed by default: opening the Feeding screen today shows the summary headline and
  score with no per-group food list visible.
- Clicking/tapping the card header expands the details; clicking again collapses. The
  `aria-expanded` attribute reflects the state and the chevron rotates.
- The expanded details show the same per-group content (foods / "try …" hints / status
  badges) as the current card.
- When a group is covered, the collapsed summary communicates which groups are covered
  without listing every food name (e.g. icon chips or counts), so repeated food names are
  no longer printed up front.
- All WP055 invariants hold (hidden without solids / on past days; rolling window; pear
  vs pea; case-insensitive dedupe).
- `npm run build` and `npm test` pass; integration test covers collapse/expand + summary
  headline.

## Constraints

- No new runtime dependencies; hand-rolled M3 styling consistent with existing `.card`,
  `.stat-*`, and `.food-variety-*` CSS and theme tokens.
- Reuse `getFoodVariety` domain output unchanged; the insight summary is derived in the
  presentation layer from the same `FoodVariety` object.
- Keep the existing group icons/accents and status-badge language.
- Only the Food variety card changes; Feeding screen placement and other cards untouched.

## Context

- Current component: `src/presentation/components/FoodVarietyCard.tsx` (always-expanded
  list, WP055). Tracker exposes `foodVariety` via `useTracker()`.
- Existing CSS block `.food-variety-*` in `src/index.css` (lines ~1131–1287); group icon
  accent pairs `--accent-{iron,protein,veg,fruit,grain,dairy,legume}-{bg,fg}`.
- No chevron/expand icon exists yet in `icons.tsx`; one will be added following the
  existing 24×24 stroke-icon style.
- The card sits between the quick-add feed card and the timeline on the Feeding screen
  when viewing today (`FeedingScreen.tsx`).
