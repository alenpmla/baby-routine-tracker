# Solids record rows: right-align the time/amount meta on the title line

## Goal

Make the solid-food record rows in the Feeding timeline more compact. Currently the
row stacks four lines: title "Solids", food names, emoji boxes, then the meta
(`12:25 PM · 90 gram`) on its own line. Move the time/amount meta up to the **title
line, right-aligned** so "Solids" stays prominent on the left and the meta sits subtly
on the right — the standard mobile list pattern.

## Requirements

- In a solids row, the title line shows **"Solids"** on the left and the
  **time/amount meta** (`12:25 PM · 90 gram`) right-aligned on the same line.
- Food names (subtle) stay on their own line below; emoji boxes stay below them
  (wrapping).
- The icon slot, edit/duplicate/delete swipe actions, and spacing are unchanged.
- Bottle/breast rows keep their existing layout (title line, meta on the line below).

## Acceptance criteria

- A solids row's title line contains both "Solids" (left) and the time/amount meta
  (right-aligned).
- The food names line and the wrapping emoji-box row remain below.
- Bottle/breast rows are unchanged.
- `npm run build` and `npm test` pass, with solids-row assertions updated as needed.

## Constraints

- Scope: `src/presentation/screens/FeedingScreen.tsx` (solids branch) and a small CSS
  block in `src/index.css` (e.g. `.solids-title-row` using flex with
  `justify-content: space-between`). Meta for solids must be moved out of the bottom
  `.event-meta` (or kept there only for non-solids).
- Keep `.event-title` (bold) and `.event-meta` (subtle) styles.
- No changes to the picker, chips, insights, Dashboard, or data/logic.

## Context

- FeedingScreen.tsx:189-218: `.event-body` stacks `.event-title` "Solids",
  `.solids-food-names`, `.solids-food-icons`, then `.event-meta` (time · amount).
- Tests in `src/App.solids.test.tsx` assert `getByText('Solids')`, `.event-title`
  textContent "Solids", `/2 oz/` meta, and `.solids-food-icon` counts. Those should
  still hold if the meta stays in the row; verify right-alignment via structure/CSS.
