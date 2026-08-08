# Phase 4 addendum — Period report as a professional PDF

## Goal

From **Settings**, pick a date range and download a professional **PDF report** for that period. It includes a cover/summary and per-category detail tables, with a **separate, detailed Feeding report**.

## Acceptance criteria

- A period picker (from/to) plus a "Download report (PDF)" button in Settings.
- PDF layout: A4, header band with app title + period, baby name, a summary block, then separate sections/pages for **Sleep**, **Feeding**, and **Diaper**.
- The **Feeding** section is a dedicated, detailed report (per-meal rows: date, time, type, foods, amount) — its own page.
- Generated client-side with jsPDF (+ autotable); no server change.
- Build + tests pass.

## Constraints

- Report generator in `src/presentation/utils/report.ts` (pure, testable data builder + PDF builder).
- Records for the period come from the repositories via a new store action.
