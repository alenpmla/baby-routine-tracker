# Food picker: clear-text suffix in search + "Most used" section

## Goal

Improve the food picker sheet UX: the search field needs a visible **clear (×) suffix**
to wipe the query in one tap, and the sheet should show a **"Most used"** section at the
top of the list so parents can quickly tick the foods they log most often, before the
full alphabetical suggestion list.

## Requirements

- **Clear-text suffix**: the search input shows a trailing clear (×) icon button
  whenever the query is non-empty; tapping it empties the query (list returns to full /
  most-used view) and re-focuses the search field. The suffix must not overlap the text
  or block typing, and must have an accessible name (e.g. "Clear search").
- **Most used section**: above the main suggestion list, show a "Most used" group of the
  most frequently logged foods (computed across all feeding records, case-insensitive,
  counting each food once per solids feed). Only foods that are also in the suggestion
  list are shown (they must be selectable). If there are no logged foods yet, the section
  is hidden. When the user types a query, the list switches to search matches (no
  most-used section shown while searching).
- Items in "Most used" behave exactly like suggestion items: checkbox + canonical name,
  pre-checked if selected, toggles on tap.
- The picker remains full-screen, searchable, pre-checking, and free-text-free.

## Acceptance criteria

- The search field shows a clear (×) suffix only when the query is non-empty; tapping it
  empties the field, restores the full/most-used list, and keeps focus in the field.
- The sheet shows a "Most used" section above the full list when there is no query, and
  hides it while a search query is active.
- "Most used" lists the most-frequently-logged selectable foods first (count + name),
  capped to a reasonable number (e.g. 6); it is hidden when no foods have ever been logged.
- Toggling a "Most used" item adds/removes exactly the canonical suggestion name.
- Everything else preserved: full-screen sheet, search/filter, pre-check on reopen,
  Done-close, nested Escape, no free text.
- `npm run build` and `npm test` pass.

## Constraints

- Follow layering: a new domain usecase (e.g. `getMostUsedFoods(feedingRepo, limit)`)
  computes frequency; the tracker exposes `mostUsedFoods`; `SolidsFields`/`FoodMultiSelect`
  receive it as a new optional prop. No server/API changes.
- Search suffix and list section styling live in `src/index.css`; no new runtime deps.
- Keep `FoodMultiSelect` props backward compatible (`mostUsed` optional); callers that
  don't pass it (tests, isolated use) simply see no section.

## Context

- `FoodMultiSelect` (used by quick-add and backfill via `SolidsFields`) currently renders
  a plain search `<input>` with no clear affordance and a single alphabetical suggestion
  list.
- `FeedingRepository.getAll()` returns all feeding sessions; solids feeds carry a `foods`
  array (`foodsOf(feed)`). Frequency = count of solids feeds containing each food
  (case-insensitive), sorted by count desc then name asc, intersected with suggestions.
- Tracker already exposes `foodSuggestions` and computes derived values (foodVariety,
  dailyAverages) from repos; adding `mostUsedFoods` follows that pattern.
