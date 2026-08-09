# WP047 — Wake window notification

## Goal

Remind the parent when the baby has been awake longer than a configurable "wake window". Default 3 hours, configurable in Settings under a new **Notifications** sub-screen.

## Acceptance criteria

- A "wake window" is the time since the most recent completed sleep ended (the baby is awake); it is paused while a sleep is running.
- When the wake window exceeds the configured duration, fire a reminder **once per wake cycle** (not repeatedly, and not again on reload for the same wake).
- Reminder shows an in-app snackbar; if browser notification permission is granted it also sends a Web Notification.
- Settings → Notifications: toggle to enable/disable (default on), duration selector in hours (default 3, options ~1–8), and a button to request browser notification permission.
- Prefs persist (localStorage); the wake window + reminder logic live in the domain layer.
- `npm run build` + `npm test` pass.

## Constraints

- No server changes; no push infrastructure — reminders fire while the app is open (in-app snackbar always; Web Notification when permitted).
- Follow existing conventions: prefs provider under `src/presentation/store`, sub-screen under `src/presentation/screens`, domain logic under `src/domain/usecase`.
