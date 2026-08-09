# Phase 4 addendum — Installable PWA (open as an app)

## Goal

Make the app installable so it opens as a **standalone app** (no browser address bar) when added to the phone's home screen.

## Acceptance criteria

- A web app **manifest** (`public/manifest.webmanifest`) with `display: standalone`, app name, theme/background colors, and 192/512 PNG icons.
- `index.html` links the manifest + `apple-touch-icon` + mobile-web-app-capable metas.
- Icons generated into `public/` (included in the Docker image via the build).
- Build + tests pass.

## Constraints

- No service worker / offline scope (would require HTTPS). Note to the user: iOS opens standalone over HTTP; Android Chrome wants HTTPS for the true "Install app" fullscreen (addable to home screen regardless).
