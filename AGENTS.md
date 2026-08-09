# Baby Tracker Web

Vite + React 18 + TypeScript baby tracker (PWA). Mobile-first Material 3 UI. Self-hosted sync server (`server/`) served on :3000; dev server on :5173.

## How to work on this project

**Run every task, feature, bug, or request through the Agent Loop Framework at `/Users/chinchujose/build/agent-loop-framework`.**

- The framework is the single operating model for this project's work: supervisor → discovery → planning → development → review → QA → validation → documentation.
- It runs against this repo via the target-local `.agent-loop/` directory (state, reports, logs, memory). `project_state.json` is canonical; `progress.md` is the readable mirror.
- For new work, follow the framework's "Add work after bootstrap" flow: write a plan under `plans/`, then run the loop on it, reconciling with current `.agent-loop/state/`.
- Framework path: `/Users/chinchujose/build/agent-loop-framework` (read-only; never copied into this repo).

## Conventions

- Stack: Vite + React 18 + TypeScript, mobile-first M3 UI.
- Layering: `src/domain` (models, repositories, use cases), `src/data` (repository impl, HTTP/storage), `src/presentation` (screens, components, store/hooks).
- Tests: Vitest + React Testing Library. Gates: `npm run build` and `npm test`.
- Do not commit unless explicitly asked.
- Time stored as ISO-8601 UTC strings; displayed in local time.
