# Baby Tracker Web

A mobile-web friendly Baby Tracker. Record and review your baby's **sleep**, **feeding**, and **diaper** activity, with a dashboard summary. All data stays on your device (browser `localStorage`) — no account, no server, no cloud.

This is a web port of the BabyTracker requirements (the original Android/Kotlin build was abandoned because the dev host has only 8GB RAM, not enough for Android toolchains).

## Features

- **Baby profile** — name, date of birth, notes. Created on first launch, editable later from Settings.
- **Dashboard** — summary cards (sleeps / feeds / diapers today) and a reverse-chronological timeline.
- **Sleep tracking** — start/stop timer with live elapsed clock, today's list with each completed nap's duration and a **Total slept** stat tile for the day, delete/edit entries.
- **Feeding tracking** — **Bottle** with amount + unit (ml/oz), **Breast** with start/end times (shows nursing duration), and **Solids** with one or more foods, amount, and unit (oz/gram). The Food picker shows selected foods as chips; tap **+ Add foods** to open a full-screen searchable sheet and tick everything eaten (e.g. avocado *and* salmon). Foods are chosen **only** from that list — there's no free-text entry, so typo'd food names never get saved. Stat tiles show **Feeds**, total **Bottle**, and total **Solids** for the day, converted to your preferred units (ml/oz and g/oz).
- **Settings** — edit the baby profile, manage the food-name suggestions, pick the **theme** (System, Light, or Dark), the **snapshot preferred units** and separate **PDF report units**, **export/import** a JSON backup, and **download a professional PDF report** for any date range (with a dedicated Feeding report and a per-day "Daily totals" breakdown showing each day's sleep, feeds, bottle & solids amounts, and diapers). Sub-screens (Profile, Units, Data & reports, Food suggestions) open from the main Settings list.
- **Diaper tracking** — one-tap Wet / Dirty / Both buttons, live today count.
- **Weight tracking** — log your baby's weight (kg/lb) quickly or for a past date/time, see the latest weight, view/edit/delete per-day entries, and see a **weight progress chart** on the Home dashboard plotted against the **typical WHO weight-for-age range** (0–24 months, P3–P97 band with the P50 median).
- **Backfill past records** (Phase 2) — "Add past feed / sleep / change" opens a date+time picker (any past date, future rejected; sleep needs end after start) so you can log something you missed.
- **Ongoing past sleep** (Phase 2) — when adding a past sleep, choose **Still sleeping** to log a nap that started earlier and is still going (no end time needed); it becomes the running timer so you tap **Stop sleep** when the baby wakes.
- **Day navigation** (Phase 2) — previous / next / today arrows on every screen to view any day's timeline and counts (cannot go beyond today).
- **Material 3 UI** (Phase 4) — restyled to Material Design 3 guidelines: token-driven color/type/shape/elevation, filled buttons, bottom-sheet dialogs, and a light + dark theme (System / Light / Dark selectable in Settings). The layout adapts from phones (bottom nav) to tablets/desktop (left navigation rail, wider spacing).

## Stack

- Vite 5 + React 18 + TypeScript
- Clean Architecture layering: `src/domain` (models, repository interfaces, use cases) / `src/data` (localStorage implementation) / `src/presentation` (React screens, store, navigation)
- Vitest + React Testing Library

## Getting started

```bash
npm install        # install dependencies
npm run dev        # start the dev server (http://localhost:5173); proxies /api to :3000
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build (http://localhost:4173) — build-only check
npm test           # run the test suite
npm start          # run the API server (serves dist + /api on http://localhost:3000)
```

## Sync server (Phase 3)

Data now lives on a small, self-hosted server instead of the browser. PC and phone
share the **same** data by connecting to it over Wi-Fi. If the server is unreachable
the app keeps working on cached data and syncs queued changes when it comes back
(an offline banner appears with a "Retry sync" button).

### Run it with Docker (on your home server)

```bash
# on the machine that will host the data
docker compose up -d --build
```

The app is then available at `http://<server-ip>:3000` from any device on your
network. Data is stored in `./data/bt.json` (a mounted volume), so it survives
container restarts.

Or with plain Docker:

```bash
docker build -t baby-tracker .
docker run -d --name baby-tracker -p 3000:3000 -v "$(pwd)/data:/data" baby-tracker
```

### Run it with Node (no Docker)

```bash
npm run build
npm start                 # http://localhost:3000, data in ./data/bt.json
DATA_FILE=/path/bt.json PORT=8080 npm start   # customize path/port
```

### API

- `GET /api/health`
- `GET /api/baby` · `PUT /api/baby`
- `GET/POST /api/sleeps` · `DELETE /api/sleeps/:id` (same for `feedings`, `diapers`)
- `GET/PUT /api/settings` (food suggestions)

Items are merged by `id` on the server, so concurrent adds from two devices are safe.


## Usage

1. Open the app. First launch prompts you to create a Baby profile (name + date of birth required).
2. Use the bottom tab bar: **Home** (dashboard), **Sleep**, **Feeding**, **Diaper**.
3. Sleep: tap *Start sleep timer*, then *Stop sleep*; the session lands in today's list.
4. Feeding: tap a type chip to record a feed now. **Bottle** asks for amount + unit (ml/oz); **Breast** asks for start + end times (shows the nursing duration); **Solids** requires at least one food, an amount, and a unit (oz/gram) — tap **+ Add foods**, search the suggestion list, and tick the foods eaten (e.g. avocado and salmon), then **Done**. Foods are chosen **only** from that list (no free text, so typos are avoided); add any missing foods in Settings first. Details show on the list and dashboard.
5. Manage those suggestions in **Settings** (gear icon on Home): add or remove foods; the list is shared across devices.
6. Diaper: tap a button to record a change; the count updates immediately.
7. Forgot to log something? Use **Add past feed / sleep / change** and pick the date + time. For sleep, choose **Still sleeping** if the nap is ongoing (just pick when it started), or **Completed** to enter start + end. Future times are rejected.
8. Use the **previous / next / today** arrows to view any day's timeline and counts (you can't go beyond today).
9. **Edit a record**: tap the pencil on any sleep, feed, or diaper in a list to change its properties (times, type, and for solids the foods/amount/unit). Edits sync like every other change.
10. **Delete a record**: swipe a row (sleep, feed, diaper, or weight) to the left to reveal a red **Delete** control, then tap it. Only one row is open at a time; tapping elsewhere closes it. Keyboard users can tab to the revealed Delete button. Tapping **Delete** asks for confirmation first — the row collapses and a dialog asks you to confirm before the record is removed.
11. Everything persists in your browser between visits. Use *Edit profile* on Home to change details.

## Project layout

```text
src/
├── domain/          # pure TypeScript: models, repository interfaces, use cases
│   ├── model/       # Baby, SleepSession, FeedingSession, DiaperChange
│   ├── repository/  # repository contracts
│   └── usecase/     # single-responsibility operations (baby, sleep, feeding, diaper, timeline)
├── data/            # localStorage Storage service + repository implementations
├── presentation/    # React: store (TrackerProvider), screens, components, navigation, utils
├── App.tsx          # shell: onboarding gate + bottom-tab layout
└── test/            # test helpers
```

## Architecture notes

- `src/domain` has **no** DOM/browser dependencies, so use cases are unit-testable with in-memory repositories and a future cloud data layer can replace `src/data` without touching the domain.
- The `TrackerProvider` (React context) is the single mutation point; screens read state and call actions.
- `src/data` now has two implementations of the same repository contracts: `LocalStorage` (offline-only/fallback) and `RemoteRepositories` (the default — sync server with a localStorage offline cache and a queued-write replay).
- The server is a small Express app in `server/` (JSON-file store, atomic writes) packaged for Docker.
- Times are stored as ISO-8601 UTC and rendered in the user's local timezone.

## Known limitations

- **No accounts/auth**: the server trusts your LAN. Do not expose port 3000 directly to the internet.
- Manual mobile-device rendering was not validated on the dev host; the layout is responsive.
- Data on the server is not backed up automatically — copy `data/bt.json` occasionally.
