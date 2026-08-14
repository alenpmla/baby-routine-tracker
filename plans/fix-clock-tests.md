# Fix clock-dependent test failures (baseline flakiness)

## Goal

Three tests fail when the suite runs near/past midnight because they compute times
relative to `Date.now()` and rely on "today":

1. `App.breast.test.tsx` — start = `now - 2h`, end = `now - 1min` passed through
   `toInputTime()` (HH:MM only, date dropped). Before 02:00 the start lands "yesterday"
   but the form date defaults to today → start time is "in the future today" → save is
   rejected → feedings stays empty.
2. `App.edit.test.tsx` — hardcoded `08:00`/`08:30`. Before 08:30 those are "future today".
3. `App.insights.test.tsx` — feeds at `now - 8h/-5h/-2h`. Before 08:00 the oldest feed
   falls on "yesterday", so it is no longer today's data → insight text missing.

Make these tests deterministic at any hour by freezing the clock at a fixed midday time.

## Acceptance criteria

- The three tests pass regardless of the wall clock (freeze `Date` at a fixed time).
- No production code changes; test-only.
- `npm test` green (modulo any other pre-existing flake).

## Constraints

- Use `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(...)` in the affected
  test files' `beforeEach`, and `vi.useRealTimers()` in `afterEach`, so only `Date` is
  faked and RTL `waitFor`/`userEvent` still work.
- Keep test intent: breast duration ~2h, duplicate preserves times, insights show today.
