# Reproduce: offline→online sync after adding events while offline

## Goal

Reproduce the reported bug: the user added records while out of network, returned home,
and the app stayed offline — the pending changes never merged to the server and the
banner never cleared. Produce a failing test that captures the exact merge gap, so the
fix work package can target it.

## Requirements

- Write a test that:
  1. Loads the app online and records some data (server has baseline).
  2. Goes offline and adds new events (feeding/diaper).
  3. Brings the connection back (server reachable again).
  4. Asserts the pending events reach the server **without** pressing the Retry button
     (auto-sync on reconnect), and the offline banner clears.
- The test must reproduce the reported "nothing happens on return to network" behaviour
  in the current code (expected to fail today, i.e. demonstrates the bug).

## Acceptance criteria

- A test file (e.g. `src/App.syncrepro.test.tsx` or an addition to `App.sync.test.tsx`)
  that fails against the current implementation with the offline banner persisting and
  the server missing the offline-added events.
- The test documents the exact sequence (online → offline add → back online) and which
  step fails.
- No production code is changed in this work package.

## Constraints

- Test-only work. No fixes in `TrackerProvider`, `RemoteRepositories`, or the server.
- Reuse `setupApi`/`MockApi` (`setOffline`) and the `FakeEventSource` pattern from
  `App.sync.test.tsx`.
- Keep the test deterministic (no real timers/network).

## Context

- `App.sync.test.tsx:84-116` already has an offline test, but it presses **Retry sync**
  manually — it does not assert auto-sync on reconnect. The reported gap: coming back
  online should clear the banner and merge without a manual tap.
- Suspected root cause to confirm: the SSE `onopen` handler treats the first successful
  open as "initial" (`firstOpen`) and skips the reload, so after an offline period the
  reconnect reload never fires; also no `online` event listener exists.
