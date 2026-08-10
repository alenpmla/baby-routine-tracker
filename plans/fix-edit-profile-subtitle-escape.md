# Fix literal \u2019 escape in Edit profile subtitle

## Goal

On the Edit profile screen (Settings sub-screen), the subtitle reads
`Update your baby\u2019s details below.` verbatim instead of
`Update your baby's details below.` (curly apostrophe).

## Root cause

`src/presentation/screens/ProfileScreen.tsx:142` places `\u2019` directly in a JSX
**text** node. JSX text is not a JS string literal, so backslash escapes are not
processed and the characters render literally. Lines 28, 32, and 153 are inside JS
string literals where `\u2019` is a valid escape and render correctly.

## Requirements

- The subtitle on the Edit profile screen shows a proper apostrophe.
- No other JSX text nodes contain raw `\u2019`-style escapes.

## Acceptance criteria

- `ProfileScreen.tsx` line 142 renders the curly apostrophe (e.g. `&rsquo;` or the
  literal character), not the escaped text.
- `rg -n '\\u2019' src --glob '*.tsx'` shows no remaining match in JSX text nodes
  (string-literal matches are acceptable).
- `npm run build` passes.
- `npm test` passes.

## Constraints

- Minimal one-line change; no behaviour or styling changes.

## Context

- File: `src/presentation/screens/ProfileScreen.tsx` (Edit profile branch at ~line 142).
- The same subtitle text at line 153 is inside a `{existing ? '...' : '...'}` JS string
  and is correct.
