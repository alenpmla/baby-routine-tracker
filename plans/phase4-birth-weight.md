# WP049 — Birth weight in profile + percentile chart anchor

## Goal

Ask for the baby's **birth weight** on the entry page (onboarding) and in Settings → Edit profile, and use it in the WHO percentile growth chart so the curve anchors at birth (month 0).

## Acceptance criteria

- `Baby` gains an optional `birthWeightKg` (normalized to kg).
- ProfileScreen (onboarding + Settings edit) has an optional **Birth weight** field with kg/lb entry, converted to kg on save and pre-filled from the stored value.
- The dashboard GrowthChart plots the birth weight as a month-0 point when available (WHO weight-for-age reference already covers month 0).
- Values persist through the server (baby PUT/POST), backup/import, and edit.
- WHO reference data is unchanged (already correct at birth: boys m=3.346, girls m=3.232).
- `npm run build` + `npm test` pass.

## Constraints

- Store as kg (canonical); convert lb→kg on save. No server schema change beyond the baby object already being free-form JSON.
