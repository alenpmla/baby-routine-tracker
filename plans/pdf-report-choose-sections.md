# PDF report: ask which sections to include before downloading

## Goal

When the user downloads the PDF report from **Settings → Data & reports**, ask them which information to include in the PDF, seamlessly, instead of always emitting every section. The selection happens in a lightweight in-app dialog that appears right after tapping **Download PDF report** (after the date range is validated), with every section selected by default and the last choice remembered for next time.

## Requirements

- The report is composed of five sections that can be independently included/excluded:
  - **Summary** (period overview stat cards)
  - **Daily totals** (per-day table)
  - **Sleep** (sleep detail table, own page)
  - **Feeding** (feeding detail table, own page)
  - **Diaper** (diaper detail table, own page)
- Before generating, the app shows a section picker dialog with a checkbox per section. All are on by default.
- The chosen sections are remembered (persisted locally) so the next download opens pre-filled — "seamless", no re-ticking every time.
- At least one section must be selected; the download action is unavailable otherwise.
- The generated PDF contains only the selected sections, and page breaks are correct regardless of which sections are chosen (e.g. skipping the Summary still leaves the first detail section on the first page, not a blank first page).

## Acceptance criteria

- Tapping **Download PDF report** with a valid date range opens a "Report sections" dialog (checkboxes: Summary, Daily totals, Sleep, Feeding, Diaper) rather than downloading immediately.
- Each checkbox toggles its section; the Download action is disabled when no section is selected.
- Confirming with a subset downloads a PDF that contains only those sections; confirming with all sections reproduces today's full report.
- The selection is persisted and restored on the next visit to the report screen.
- Cancel closes the dialog without downloading.
- `npm run build` passes and `npm test` passes (new + existing tests).

## Constraints

- Report builder stays in `src/presentation/utils/report.ts` (pure, testable); add a `ReportSections` type and a `DEFAULT_REPORT_SECTIONS` constant, and thread a `sections` parameter through `buildReportPdf` / `downloadReportPdf`.
- UI lives in `src/presentation/screens/DataReportsScreen.tsx` (and a small dialog component if needed), reusing the existing `Modal` (variant `dialog`) and M3 dialog styles (`.dialog-message`, `.dialog-actions`).
- Persistence uses a local key (e.g. `bt.reportSections`) consistent with existing `bt.*` localStorage keys; no server/sync change.
- No change to the report's data sources (`getPeriodRecords`) or unit conversion helpers.

## Context

- Current flow (`DataReportsScreen.tsx` `handleReport`) validates the from/to dates, fetches `getPeriodRecords`, then immediately calls `downloadReportPdf`. The report currently always renders Summary cards + Daily totals on page 1, then dedicated Sleep / Feeding / Diaper pages (`report.ts` `buildReportPdf`).
- Report PDF generation is client-side with jsPDF + autotable; tested in `src/presentation/utils/__tests__/report.test.ts`.
- Existing navigation pattern for the screen is covered in `src/App.settings.test.tsx` (Settings → Data & reports), which stubs `URL.createObjectURL` for the export flow.
