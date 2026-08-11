# Revert inline emoji in solids history rows (keep emoji only in picker + chips)

## Goal

The inline mini emoji added to solids feeding record rows in WP079 does not look good.
Remove it: solids history rows return to the plain text title (`Solids · salmon, beef`)
with the generic feed icon, exactly as before WP078/WP079. Emoji stays only where it
looks good: the food picker list rows (`.food-item-icon`) and the selected-food chips
(`.food-tag` with `.food-item-icon-sm`).

## Requirements

- Solids feed rows in the Feeding timeline render `describeFeedingTitle(f)` as the title
  (plain text, no inline emoji), and the generic feed icon in the event-icon slot.
- Remove the `renderSolidsTitle` helper and its usage; remove the `.food-mini` CSS.
- Keep emoji in the food picker list rows and the `.food-tag` chips (unchanged).
- Bottle/breast rows, Dashboard, and insights unchanged.

## Acceptance criteria

- A solids history row title is plain text (e.g. `Solids · salmon, beef`) with no
  `.food-mini` emoji.
- The food picker list and chips still show emoji (picker `.food-item-icon`, chips
  `.food-item-icon-sm`).
- `npm run build` and `npm test` pass, with tests reverted to the plain-text assertions.

## Constraints

- Revert `FeedingScreen.tsx` to use `describeFeedingTitle(f)` for all feed types in the
  timeline title; remove `renderSolidsTitle` and the now-unused `foodEmoji` import if
  nothing else in the file uses it.
- Remove `.food-mini` from `src/index.css`.
- Update the WP079 test changes back to plain-text `getByText('Solids · salmon')` /
  `Solids · salmon, beef` assertions.
- No changes to the picker or chips.

## Context

- WP079 added `renderSolidsTitle` + `.food-mini` and changed solids-row tests to the
  inline-emoji format. WP078 added the chips emoji box (`food-item-icon-sm`) — keep that.
- `describeFeedingTitle` (utils/feeding.ts) already produces `Solids · salmon, beef`
  and is used by the Dashboard.
