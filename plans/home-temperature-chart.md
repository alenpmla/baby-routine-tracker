# Home: 7-day temperature chart (shown when any temp ≥ 37.5°C in last 7 days)

## Goal

On the **Home page**, if **any temperature record in the last 7 days is above 37.5°C**, show a
**temperature chart covering the last 7 days**. If no record in the last 7 days exceeds 37.5°C
(or there are no temperature records), no chart is shown.

## User requirement (verbatim intent)

"whenever the temperature record is above 37.5 show the graph for temperature (last 7 days). so
if any of the temp record in last 7 days is above 37.5 graph will be visible." → shown on the
Home page.

## Design

- **Threshold**: 37.5 °C. Records may be stored in °C or °F — normalize to °C when comparing
  (`tempInC(temp, unit)` = `unit === 'c' ? temp : (temp - 32) * 5 / 9`). "above 37.5" →
  `tempInC >= 37.5`.
- **Domain helper** (`src/domain/usecase/temperature.ts`, pure, tested):
  - `tempInC(temp: number, unit: TemperatureUnit): number`.
  - `hasFeverInWindow(entries, days, now)` → true if any entry with `time` within the last
    `days` (from `now` back `days` × 24h) has `tempInC >= 37.5`.
- **Dashboard** (`src/presentation/screens/DashboardScreen.tsx`): after the Head-circumference
  section (and before the day log), add a temperature section when the 7-day window contains a
  ≥37.5 °C reading:
  - `<section className="growth">` with `<h2 className="growth-title">Temperature (last 7 days)</h2>`.
  - A new compact SVG line chart `TemperatureChart` (`src/presentation/components/TemperatureChart.tsx`)
    plotting last-7-days temps (normalized to the display unit? — use °C; the threshold is °C).
    Axes: y = temperature with a dashed **37.5 °C reference line**; x = 7-day time span with
    day labels (use `formatClock`/`formatDayMonth` helpers). Points above 37.5 tinted with the
    existing error/health accent to flag fever readings.
  - Data source: `getPeriodRecords(startOfDay(shiftDays(now, -6)), now).temperatures` sorted by
    time. Use `startOfDay`/`shiftDays` from `src/presentation/utils/time.ts`.
- **CSS**: minimal `.temperature-chart` rules reusing `.growth-*` tokens and M3 `--md-*` colors;
  no new palette tokens.

## Acceptance criteria

- Home shows a "Temperature (last 7 days)" chart when **any** temperature in the last 7 days is
  **≥ 37.5 °C** (comparing after unit normalization).
- Home shows **no** temperature section when there are no temperature records, or none in the
  last 7 days exceeds 37.5 °C.
- The chart plots the last 7 days of temperatures, includes a 37.5 °C reference line, and
  highlights readings ≥ 37.5 °C.
- Works in both light and dark (tokens), accessible (SVG `role="img"` + aria-label), touch-sized
  enough to read.
- Unit-normalization correct: a °F record equivalent to ≥ 37.5 °C triggers the chart.
- `hasFeverInWindow`/`tempInC` unit-tested; an App-level test asserts show/hide and the °F case.
- `npm run build` PASS and `npm test` PASS.

## Constraints

- Presentation + domain only; no changes to server, repositories, or the temperature record
  model. Chart is additive on Home (does not affect the day log / reminder sections).
- No system notifications. Reuse existing time helpers and M3 tokens.
- The 7-day window is inclusive of today back 7 days (matches "last 7 days").

## Files

- `src/domain/usecase/temperature.ts` (+ `__tests__/temperature.test.ts` additions)
- `src/presentation/components/TemperatureChart.tsx` (new)
- `src/presentation/screens/DashboardScreen.tsx`
- `src/index.css` (`.temperature-chart` minimal)
- `src/App.tempchart.test.tsx` (new App-level test)

## Context

- `TemperatureEntry { id, time, temp, unit: 'c'|'f', location?, notes? }`; min/max validation
  30–45°C / 86–113°F in `temperature.ts`. `getPeriodRecords` returns `temperatures`
  (TrackerProvider.tsx:330). Existing Home growth sections (weight/head-circumference) use
  `.growth` + `.growth-title` + `.growth-card` markup and `GrowthChart` (percentile-based —
  not reusable for temperature, hence the new small chart). Time helpers `startOfDay`,
  `shiftDays`, `formatClock`, `formatDayMonth` available.