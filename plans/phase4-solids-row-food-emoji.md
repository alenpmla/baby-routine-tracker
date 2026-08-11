# Solids history rows: inline mini emoji per food

## Goal

The Feeding timeline's solids record rows currently show only the **first food's**
emoji in the left icon slot, which looks wrong when a feed has several foods. Replace
that with **inline mini emojis (insight-sized, ~14px) next to each food name** in the
row's detail text (e.g. `🥕 Carrot · 🐟 Salmon`). The left icon slot reverts to the
plain feed icon for solids. Insights/FoodVarietyCard are NOT changed.

## Requirements

- In a solids feed row, each food name in the detail line is prefixed with its tiny
  emoji (`foodEmoji(food)`, ~14px, no box) and joined with ` · `.
- The left event-icon slot for solids rows returns to the generic feed icon (BottleIcon),
  or stays empty — it no longer shows only the first food.
- Non-solids rows (bottle/breast) are unchanged.
- Emoji is decorative (aria-hidden); the row's accessible text remains e.g.
  "Solids · Carrot · Salmon" (emoji hidden from screen readers).
- Insights/FoodVarietyCard untouched.

## Acceptance criteria

- A solids row with multiple foods shows a mini emoji inline before each food name
  (e.g. `🥕 Carrot · 🐟 Salmon`), at ~14px.
- The solids row left icon no longer shows only the first food.
- Emoji is aria-hidden; the visible food names are unchanged.
- `npm run build` and `npm test` pass.

## Constraints

- Implement in `FeedingScreen.tsx` (or a small render helper) using `foodEmoji` +
  `foodsOf(f)`; reuse the insight's ~14px sizing as the reference for the emoji span.
- Keep `describeFeedingTitle` for non-solids and for the accessible/text fallback where
  sensible; add a small CSS class (e.g. `.food-mini`) in `src/index.css` for the ~14px
  inline emoji.
- No changes to FoodVarietyCard/insights or the picker.

## Context

- `FeedingScreen.tsx` timeline renders `event-icon event-feeding` with a
  `food-item-icon food-item-icon-sm` (24px) showing `foodsOf(f)[0]` for solids (WP078).
- Insight chips use `size={14}` icons (`FoodVarietyCard` line 88) — the sizing reference.
- Existing tests assert row text like `Solids · salmon` / `Solids · salmon, beef`
  (joined with `, `). If the detail line format changes to `·` with inline emoji, tests
  must be updated to match while keeping the visible food names.
