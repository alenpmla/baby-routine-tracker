# Food variety tracker (last 7 days)

## Goal

Help the parent check whether the baby is getting enough variety / the food groups they
need by surfacing which groups were eaten in the last 7 days, based on the solids foods
already recorded. No new data entry.

## Requirements

- On the Feeding screen when viewing **today**, show a "Food variety · last 7 days" card
  between the quick-add card and the day timeline.
- Classify each recorded food (free text) into food groups by keyword: Iron-rich, Protein,
  Vegetables, Fruit, Grains, Dairy, Legumes. A food may belong to multiple groups;
  unclassified foods are simply not counted.
- For each group show whether it was eaten this week and the actual foods recorded; for
  uncovered groups show a "none yet — try …" hint.
- Footer shows the score: "X of 7 groups covered this week".
- Card is hidden when there are no solids feeds in the window.

## Acceptance criteria

- Solids feeds from the last 7 days (rolling) are classified and grouped; older feeds are
  ignored; bottle/breast feeds are ignored.
- Each covered group lists the distinct foods eaten this week (case-insensitive dedupe,
  original casing preserved for display).
- Each uncovered group shows the static "try …" suggestion.
- Card hidden when no solids recorded in the last 7 days, and when viewing a past/future day.
- Classification is keyword/exact-token based and does not produce false positives for
  similar words (e.g. "pear" must not be counted as legumes via "pea").
- `npm run build` and `npm test` pass.

## Constraints

- Layering: group definitions + classifier + coverage live in domain (pure TS); component
  formats for display; no new runtime dependencies.
- Static "try …" suggestions per group (no settings UI in this work package).
- M3 card language consistent with `.card`; informational, not tappable.

## Context

- Solids foods are already stored as `foods[]` on `FeedingSession` (`foodsOf` helper).
- Default suggestions include compounds like "porridge (with pears)" — keyword tokens must
  handle plurals and punctuation (tokenize on non-alphanumeric, exact token match).
- Reuse the 7-day rolling window semantics and "today view" guard already used by the
  Dashboard insights.
