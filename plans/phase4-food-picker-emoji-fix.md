# Food picker: per-food emoji (fix wrong glyphs like carrot → 🥔)

## Goal

The emoji shown per food row is currently resolved from the **category** icon key
(`FOOD_ICON_EMOJI[foodIconKey(food)]`), so all foods in a category share one emoji.
That gives wrong glyphs for many foods: `carrot` (root-veg) shows 🥔, `parsnip` shows
🥔, `beetroot` shows 🥔, etc. The emoji must be resolved **per food name** (carrot →
🥕, potato → 🥔, parsnip → 🥕, beetroot → 🥕), while the box **tint stays per category**
(`FOOD_ICON_COLORS[foodIconKey(food)]` is unchanged).

## Requirements

- Emoji resolution becomes per-food-name: `foodEmoji(name)` returns the specific emoji
  for a food (e.g. `carrot → 🥕`, `salmon → 🐟`, `banana → 🍌`), falling back through the
  category key and then generic 🍽️.
- The box (`--food-icon-accent`) continues to come from the category accent
  (`FOOD_ICON_COLORS[foodIconKey(food)]`) — unchanged.
- Every food in the user-exported 107-item list resolves to a sensible, specific
  non-generic emoji.
- Emoji is aria-hidden; accessible name unchanged; all picker behaviour unchanged.

## Acceptance criteria

- `carrot` renders 🥕 (not 🥔); `potato` renders 🥔; `parsnip`/`beetroot` render 🥕.
- Specific foods within a category render their own emoji (e.g. apple 🍎, pear 🍐,
  banana 🍌, grapes 🍇, corn 🌽 all differ).
- The box tint still follows the category accent (carrot box = root-veg accent).
- All 107 exported foods resolve to a non-generic emoji.
- `npm run build` and `npm test` pass.

## Constraints

- Add a per-food emoji resolver (e.g. `foodEmoji(name)` in `src/domain/usecase/foodIcons.ts`
  or a presentation module) with the exact-name overrides → keyword token (with singular)
  → group → generic resolution already proven in WP073.
- Keep `foodIconKey` and `FOOD_ICON_COLORS` for the box accent (category-level).
- `renderItem` uses `foodEmoji(food)` for the glyph and `FOOD_ICON_COLORS[foodIconKey(food)]`
  for the accent.
- No new runtime dependencies.

## Context

- `FoodMultiSelect.renderItem` currently renders `FOOD_ICON_EMOJI[foodIconKey(food)]`
  inside the `.food-item-icon` box with accent `FOOD_ICON_COLORS[foodIconKey(food)]`.
- WP073 previously implemented per-food emoji resolution (`foodEmoji`) with exact
  overrides, keyword+singular matching, and group fallback; it was later replaced by
  the category `foodIconKey`. This change reintroduces per-food emoji while keeping the
  category-driven box tint.
