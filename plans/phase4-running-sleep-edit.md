# Phase 4 addendum — Edit a running sleep's start time

## Goal

Show the in-progress sleep in the day's history with an edit button to fix its start time; the sleep keeps running after the edit.

## Acceptance criteria

- The running sleep appears in the day list (on the day it started), labelled "Sleeping" with "ongoing" meta.
- Its edit button opens a form asking only the start time (no end).
- Saving updates the start time; the timer stays running.
- Delete still works for the running sleep.
- Dashboard timeline shows the running sleep as "Sleeping · ongoing".
- Build + tests pass.
