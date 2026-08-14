# Solid-food record list item: "Solids" title, food names secondary, per-food emoji boxes

## Goal

Redesign only the solid-food record rows in the Feeding timeline. Each solids row shows
**"Solids"** as the main title, all food names as subtle secondary text below it, and one
small tinted emoji box per food. The row keeps the existing dark Material 3 design,
spacing, and record actions (edit / duplicate / delete). No other part of the Feeding
screen and no data/logic changes.

## Requirements

- A solids feed row's main title is **"Solids"** (plain, not `Solids · salmon, beef`).
- Below the title, show **all food names** as subtle secondary text.
- Each food renders as a **small 8px emoji inside a 32dp rounded tinted container**
  (one box per food, using the food's accent tint and `foodEmoji`, as in the picker).
- Support **any number of foods**: the emoji boxes wrap naturally across lines.
- The food emoji is decorative (`aria-hidden`); accessible names stay based on the
  visible text ("Solids" + food names), not the emoji.
- Keep the existing row icon slot, event-meta (time · amount), swipe actions, and
  spacing for the dark Material 3 design.
- Bottle/breast rows, Dashboard, insights, FoodVarietyCard, and the picker are unchanged.

## Acceptance criteria

- A solids row shows the title `Solids` and the food names as secondary text
  (e.g. `Salmon` / `Salmon, Beef`), with no `Solids ·` prefix on the title.
- Each food in the row renders an emoji box (`.solids-food-icon`) that is a ~32px
  rounded tinted container with a small (~8px) emoji; N foods produce N boxes.
- The emoji boxes container wraps (`flex-wrap`) so any number of foods fits.
- The solids row still shows the generic feed icon in the event-icon slot, the
  time/amount meta line, and the edit/duplicate/delete actions.
- Bottle and breast rows are unchanged (title + meta as before).
- `npm run build` and `npm test` pass, with solids-row assertions updated to the new
  title/secondary-text layout.

## Constraints

- Scope: `src/presentation/screens/FeedingScreen.tsx` (solids row render), a new small
  CSS block in `src/index.css` (e.g. `.solids-food-icons`, `.solids-food-icon`), and
  the affected tests in `src/App.solids.test.tsx`. Reuse `foodsOf`, `foodEmoji`, and
  `FOOD_ICON_COLORS[foodIconKey(...)]`.
- Do not change `describeFeedingTitle`, Dashboard, insights, picker, chips, or any
  domain/data layer. Non-solids rows keep `describeFeedingTitle(f)`.
- Preserve existing uncommitted worktree changes (Modal drag-to-dismiss work) untouched.
- Time stored as ISO-8601 UTC; display uses existing `formatClock`.

## Context

- `FeedingScreen.tsx` timeline renders every feed type with
  `event-title={describeFeedingTitle(f)}` and `event-icon event-feeding` + BottleIcon
  (FeedingScreen.tsx:184-192). `describeFeedingTitle` yields `Solids · salmon, beef`.
- The picker/chips already establish the emoji-box pattern: `.food-item-icon` is a 34px
  rounded box, tinted via `--food-icon-accent` (`color-mix(..., 14%, transparent)`),
  with `font-size: 1.2rem`. `.food-item-icon-sm` is 24px / 0.9rem.
- WP079 previously added inline mini emoji (~14px) in the title; WP080 reverted it.
  This task is a new layout: fixed "Solids" title + secondary food names + per-food
  32px tinted emoji boxes that wrap.
