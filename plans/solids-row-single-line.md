# Solid-food list item: "Solids" and food names on one line

## Goal

In the Feeding timeline, the solids record row currently shows the title "Solids" on one
line with the food names as secondary text on the line below. Combine them onto a **single
line** while keeping the existing style split: **"Solids" big/bold** (as the title) and the
**food names subtle** (caption, on-surface-variant) — e.g. `Solids · salmon, beef` where
"Solids" is large and "salmon, beef" is the smaller secondary part.

## Requirements

- The solids row title line reads `Solids · <food names>` as one line.
- "Solids" keeps the `.event-title` styling (bold, capitalized); the food names keep the
  subtle secondary styling (`.solids-food-names`: caption size, on-surface-variant).
- The per-food emoji boxes (`.solids-food-icons` / `.solids-food-icon`) remain below the
  title line, unchanged.
- The `event-meta` line (time · amount), icon slot, and swipe/edit actions unchanged.
- Bottle/breast rows unchanged.

## Acceptance criteria

- A solids row shows "Solids" and the food names on the same line, with "Solids" in the
  title style and the food names in the subtle secondary style.
- The emoji boxes still render below that line (one per food, wrapping).
- The meta line and actions are unchanged.
- `npm run build` and `npm test` pass.

## Constraints

- Scope: `src/presentation/screens/FeedingScreen.tsx` (solids branch markup) and the
  related assertions in `src/App.solids.test.tsx`/`src/App.edit.test.tsx`.
- Keep `.solids-food-names` (subtle) and `.event-title` (bold) styles; put both in the
  same line (e.g. `.event-title` containing `Solids` + a `· ` separator + the subtle
  `.solids-food-names` span).
- Do not change `.solids-food-icons`/`.solids-food-icon`, the picker, chips, insights,
  Dashboard, or data/logic.

## Context

- FeedingScreen.tsx:190-206 renders the solids branch: `.event-title` "Solids", then
  `.solids-food-names` (foods joined `, `), then `.solids-food-icons`.
- `.solids-food-names` (index.css) is caption-sized with `--md-on-surface-variant`;
  `.event-title` is `font-weight: 600`.
