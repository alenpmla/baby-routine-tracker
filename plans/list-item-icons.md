# Distinct main icons: solid food and dirty diaper on list items

## Goal

The main event icon on list items should visually match what was recorded. The solids
record rows currently show a generic bottle icon, which does not read as solid food;
the diaper rows show a generic diaper for every type, so a "dirty" change looks the same
as a "wet" one. Fix both list-item icons.

## Requirements

- **Solids rows** (Feeding timeline): the `event-icon event-feeding` slot shows the
  solid-food icon (`BowlIcon`, already used for the Solids stat tile) instead of the
  generic `BottleIcon`. Bottle/breast rows keep the generic feed icon.
- **Diaper rows** (Diaper timeline): a `dirty` or `both` diaper change shows a distinct
  "dirty" icon in the `event-icon event-diaper` slot; `wet` keeps the existing
  `DiaperIcon`.
- Icons are decorative (`aria-hidden`); row titles/text unchanged.

## Acceptance criteria

- A solids feed row's event icon is the bowl (solid-food) icon; bottle/breast rows keep
  the generic feed icon.
- A `dirty` or `both` diaper row shows the dirty-diaper icon; a `wet` row keeps the
  existing diaper icon.
- `npm run build` and `npm test` pass.

## Constraints

- Scope: `src/presentation/components/icons.tsx` (add a dirty-diaper icon if one does
  not exist), `src/presentation/screens/FeedingScreen.tsx` (solids row icon), and
  `src/presentation/screens/DiaperScreen.tsx` (per-type diaper icon). Also the same
  per-type logic in `DashboardScreen.tsx` event rows if the diaper kind is type-aware —
  keep Dashboard feeding event as-is unless trivial.
- No CSS or data/logic changes.

## Context

- `FeedingScreen.tsx:187` uses `<BottleIcon size={18} />` for every feed type in the
  timeline; `BowlIcon` (icons.tsx:94) is already used for the Solids stat tile.
- `DiaperScreen.tsx:100` uses `<DiaperIcon size={18} />` for every diaper type;
  `DiaperType = 'wet' | 'dirty' | 'both'` (domain/model/DiaperChange.ts).
- `DashboardScreen.tsx:119-120` renders BottleIcon for feeding and DiaperIcon for diaper
  events; a dirty/both diaper could show the dirty icon there too for consistency.
- No tests currently assert these icons.
