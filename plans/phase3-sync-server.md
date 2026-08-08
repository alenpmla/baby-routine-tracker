# Phase 3 — Self-hosted sync server (Docker)

## Goal

Move Baby Tracker's data out of the browser and into a small, **self-hosted sync server** that can be installed anywhere via Docker (the user already runs a home server). PC and phone connect to it over Wi-Fi/LAN and share the **same** data.

## Requirements

- A lightweight Node/Express server that:
  - Serves the built web app (static files) and a REST API under `/api`.
  - Persists data in a JSON file on disk (configurable path; mounted as a Docker volume).
  - Provides endpoints: health, get/put baby, get/add/delete for sleeps, feedings, diapers. Adds merge by `id` (idempotent), deletes by `id`.
- Docker support: `Dockerfile` (build frontend + run server) and `docker-compose.yml` (port + volume), so it runs on the user's home server with one command.
- The web app uses the server API as its **source of truth**:
  - On load, fetch all data from the server.
  - Writes go to the server.
  - If the server is unreachable, the app keeps working on last-known data (localStorage cache), queues the writes, and shows an offline banner with a retry/sync action; pending writes replay when connectivity returns.
- Domain layer and business rules are unchanged.

## Acceptance criteria

- With the server running, data added on the PC appears on the phone (and vice versa) after reload/sync — both use the same central store.
- `docker compose up` (or `docker run`) on a home server makes the app reachable at `http://<server-ip>:3000` and data survives container restarts (volume).
- The app shows a clear offline state when the server is unreachable and re-syncs queued writes when it returns.
- The app still works offline on cached data.
- `npm run build` and `npm test` pass.

## Constraints

- No accounts/auth in Phase 3 (single household). Server trusts LAN clients.
- No database dependency — a JSON file store keeps the image tiny and simple.
- Keep Clean Architecture: only `src/data` changes; `src/domain` untouched; store gains async load + connection state.
- Keep the existing localStorage repositories available for tests/offline-only operation.

## Context

- Server default port `3000`; data file `/data/bt.json` (env `DATA_FILE`, default `./data/bt.json` when run without volume).
- The app talks to `/api` with **relative** URLs so no per-device config is needed whether it is served from the Docker server or the Vite dev server (dev server proxies `/api` → `localhost:3000`).
- Write/delete ops are idempotent by UUID, so replaying a queued offline op is safe.

## Suggested tasks

- Server: Express app + JSON store (atomic writes, id-merge) + REST API + static serving; unit tests for the store.
- Docker: `Dockerfile` (multi-stage: node build → node serve) + `docker-compose.yml`.
- Data layer: `http` client; `RemoteRepositories` implementing the domain interfaces with server + localStorage fallback + pending-op queue.
- Store/screens: async `load` with `ready` state, async actions, offline banner + `syncNow()`; screens await actions.
- Dev proxy + tests: vite `/api` proxy; a mock-API harness for tests; adapt existing e2e tests; add repo/store/offline tests.
- Docs: README Docker quick-start.
