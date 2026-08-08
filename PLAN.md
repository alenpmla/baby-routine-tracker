# Baby Tracker — Web (Phase 1)

Web port of the BabyTracker requirements. Mobile-web friendly. Local-only storage in the browser. Abandoned the Android/Kotlin stack (host has 8GB RAM, insufficient for Android builds); all feature requirements are preserved.

## Goal

A mobile-web friendly Baby Tracker app: record and review your baby's sleep, feeding, and diaper changes, with a dashboard summary.

## Features (Phase 1)

- **Baby profile** — name, date of birth, notes. Created on first launch before anything else.
- **Dashboard** — today's timeline of events and summary cards.
- **Sleep tracking** — start/stop timer, today's list, delete an entry.
- **Feeding tracking** — bottle / breast / solids type chips with quick-add, today's list.
- **Diaper tracking** — one-tap wet / dirty / both buttons, today's count.

## Stack

- **Build**: Vite 5 + React 18 + TypeScript
- **Storage**: browser `localStorage` (local only, mirrors the original "Room, local only" constraint)
- **Architecture**: Clean Architecture — `domain` (models, repository interfaces, use cases) / `data` (localStorage implementation) / `presentation` (screens, components, navigation)
- **Testing**: Vitest + React Testing Library
- **Navigation**: lightweight in-app bottom tab bar (Home / Sleep / Feeding / Diaper); first-launch onboarding gate

## User Flow

```
Launch → Baby Profile (first time) → Dashboard (Home)
                                       ├── Sleep (timer + today's list)
                                       ├── Feeding (type chips + quick-add)
                                       └── Diaper (one-tap buttons)
```

## Acceptance Criteria

- A new user completes a Baby Profile (name + DOB required, notes optional) on first launch, and only then sees the Dashboard.
- The profile persists and can be edited.
- Sleep: user can start a timer, stop it, and the resulting session appears in today's list with duration; entries can be deleted.
- Feeding: user can tap a type chip to record a feed at the current time; today's list shows feeds with type and time.
- Diaper: user can tap Wet / Dirty / Both to record a change; today's count reflects the total.
- Dashboard shows summary cards (sleeps, feeds, diaper changes today) and a reverse-chronological timeline of today's events.
- App is fully usable on a mobile viewport (bottom tab bar, touch targets ≥ 44px) and renders correctly on desktop widths.
- All data persists across page reloads (localStorage).
- `npm run build` and `npm test` pass.

## Non-Goals (Phase 1)

- No backend, accounts, sync, or cloud (data layer interfaces allow a future swap).
- No Android/iOS native apps.
- No multi-baby support.
