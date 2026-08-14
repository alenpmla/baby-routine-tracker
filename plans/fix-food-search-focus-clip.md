# Fix food picker search input focus ring clipped on the sides

## Goal

In the "Add foods" fullscreen sheet, when the search input is focused, the focus
ring's left/right edges are cut off because `.modal-body` clips horizontal overflow
(`overflow-y: auto` computes `overflow-x: auto`), clipping the default `:focus-visible`
outline that extends past the full-width input.

## Requirements

- The search input shows a clear, unclipped focus indicator on both sides.
- Prefer a focus style that stays within the input's box (e.g. inner ring via
  `box-shadow: inset` or `border-color` change), which cannot be clipped by overflow.

## Acceptance criteria

- Focusing the food search input shows a visible focus state whose left/right edges are
  not cut off.
- Other inputs' focus behaviour is unchanged.
- `npm run build` and `npm test` pass.

## Constraints

- Scope: `src/index.css` — add a focus rule for `.food-search > input` (and the
  `.food-picker-sheet > input` variant). Do not widen inputs or change layout.
- No behaviour/DOM changes.

## Context

- Global `:focus-visible { outline: 2px solid; outline-offset: 2px }` (index.css:282).
- `.food-search > input` is `width: 100%` (index.css:883-893); `.modal-body` has
  `overflow-y: auto` (index.css:~2100). The outline extends past the input and is
  clipped horizontally.
- No previous fix exists for this input's focus (only commit touching the picker is
  8cdc869, which added the input without focus styling).
