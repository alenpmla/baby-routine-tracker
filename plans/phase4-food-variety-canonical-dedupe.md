# Food variety: canonical-name dedupe for near-duplicate foods

## Goal

Stop the same food from appearing twice in the Food variety card when it was recorded
with slightly different spellings (pluralisation, capitalisation, common misspellings).
Each distinct food should be listed once, using a canonical display name.

## Requirements

- Dedupe foods by a **canonical form**, not just lowercased exact match:
  - merge case variants (`Potato` / `potato`) — already covered, keep working;
  - merge simple English plurals when the singular is a recognised food keyword
    (`Peaches` → `peach`, `pears` → `pear`, `Peas` → `pea`);
  - merge known misspellings from the real logged data via an alias table
    (`pototo` → `potato`, `Parship` → `parsnip`, …);
  - compound names stay intact (`Corn porridge` ≠ `corn`; `sweet potato` ≠ `potato`).
- Display the canonical name with its natural casing (prefer the casing recorded in the
  data, e.g. `Potato`, `Parsnip`, `peach`).
- Classification must remain correct: canonicalising for display must **not** change
  group membership (a food still counts toward every group its tokens match) and must
  not break the `pear` vs `pea` distinction.
- Cross-group repetition (e.g. `beef` under Iron-rich AND Protein) is **intended** and
  out of scope.

## Acceptance criteria

- In a group's detail list, `Potato` and `pototo` render as a single `Potato`; `Parship`
  and `Parsnip` render as a single `Parsnip`; `peach` and `Peaches` render as a single
  `peach`; `pears` and `Pears` render as a single `pear`.
- `Corn porridge` and `corn` remain separate entries; `sweet potato` and `potato` remain
  separate.
- `pear` is never counted as legumes; `peas`/`pea` are never counted as fruit.
- Domain tests cover canonicalisation (singular/plural, misspelling aliases, compound
  preservation) and existing 7-day window + hiding invariants still pass.
- `npm run build` and `npm test` pass.

## Constraints

- No new runtime dependencies. Canonicalisation lives in the domain layer
  (`src/domain/usecase/foodVariety.ts`), alongside `tokenizeFood`/`classifyFood`.
- The alias table is derived from the real logged-data keywords already present in
  `FOOD_GROUP_DEFS`; keep it small and documented.
- Display casing: prefer a recorded variant whose lowercase form equals the canonical
  key; otherwise fall back to the first-seen recorded spelling.

## Context

- Duplicate foods seen in real data (`data/bt.json`, 7-day window):
  `Potato`/`pototo`, `Parship`/`Parsnip`, `peach`/`Peaches`, `pears`/`Pears`.
- Current dedupe in `getFoodVariety` uses `trimmed.toLowerCase()` as the map key;
  `classifyFood` still runs on that lowercased key.
- The Food variety card (WP055/056) renders `group.foods` from `getFoodVariety`; no
  component changes expected unless display casing needs plumbing.
