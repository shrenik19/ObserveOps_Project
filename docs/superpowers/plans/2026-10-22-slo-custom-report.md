# SLO Custom Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SLO as a report type to the Report module's Create Custom Report wizard — tile, criteria with live preview, properties, save into the report list.

**Architecture:** Pure modules (catalogue, data, wizard state) with no DOM; three step renderers and a preview renderer on the DS; the wizard is an internal view of the existing Report screen (`#/reports/categories?view=create-report`, swapped in place with `history.replaceState`), so `router.js`/`registry.js` — both mid-change in a parallel session — stay untouched.

**Tech Stack:** vanilla JS, Vite 8, Vitest + jsdom, `@mtdt/observeops-ds-*` (`obs-steps`, `obs-select`, `obs-radio as-button`, `obs-table`, `obs-input`, `obs-switch`, `obs-date-time-picker`, `obs-tabs`, `obs-button`), playwright-core probe.

**Spec:** `docs/superpowers/specs/2026-10-22-slo-custom-report-design.md` (v2)

**Deviation from spec §2/§8 (route):** `#/reports/categories?view=create-report` instead of `#/reports/create` — a second Reports screen would make `#/reports` a card grid and needs router changes another session owns.

## Global Constraints

- No hardcoded colours: every colour a `var(--token)`; charts use `--chart-*` only.
- 24px between columns; edges aligned across rows; plainest product control (CLAUDE.md standing constraints).
- Aggregation has exactly one option, `Last`, pre-selected.
- Source Filter\* options exactly `Performance SLO`, `Availability SLO`; Source disabled until one is picked.
- Widget Type exactly `Grid`, `Top N`; Top N views exactly Area, Line, Horizontal Bar, Vertical Bar, Pie, Solid Gauge, Grid.
- Only the SLO tile is clickable; tile order = product's 18, then SLO.
- Saved report: `type: 'SLO'`, `reportType: 'Custom'`.
- Commit only this feature's paths (the working tree holds another session's uncommitted work).

## Review Focus

1. Changing SLO Type after picking counters → counters reset to that type's family (`slo.*` vs `slo.instance.*`); a stale `slo.*` counter must never survive under Metric. (Task 2 test)
2. Changing Source Filter → Source selection cleared (Performance SLOs are not valid under Availability). (Task 2 test)
3. Removing the middle of three counter rows → the remaining rows keep their own values. (Task 2 test)
4. Previous from step 3 → step 2 shows the same query and preview; Previous from step 2 → step 1 with SLO still marked. (Task 6 test)
5. Back arrow mid-wizard → Report page, nothing saved, list unchanged. (Task 6 test)

---

### Task 1: Catalogue and example data

**Files:** Create `src/custom-report/catalogue.js`, `src/custom-report/sloReportData.js`, tests beside them.

**Interfaces — Produces:**
- `REPORT_TYPES: string[]` — the 18 product tiles in product order, then `'SLO'`; `CLICKABLE = new Set(['SLO'])`
- `SLO_TYPES = ['SLO','Metric','APM','RUM','NetRoute']`
- `countersFor(sloType): string[]` — six; `slo.*` for SLO, `slo.instance.*` otherwise (achieved.percent, violated.percent, error.budget.left.percent, mttr.seconds, mtbf.seconds, burn.rate)
- `AGGREGATIONS = ['Last']`, `SOURCE_FILTERS = ['Performance SLO','Availability SLO']`, `WIDGET_TYPES = ['Grid','Top N']`, `TOPN_VIEWS = [{key,label}×7]`, `ORIENTATIONS = ['Auto','Portrait','Landscape']`
- `sourcesFor(filter): string[]` — SLO names of that kind
- `previewRows({ sloType, counters, sources }): Row[]` — one per SLO (or instance for non-SLO types, with `instance`); each row carries `id, name, target, service, tags[], frequency, profileType` and a numeric value per counter key
- `previewColumns({ sloType, counters }): {key,title}[]` — SLO.ID, SLO.PROFILE.NAME, [INSTANCE], one per counter (title = counter upper-cased), SLO.TARGET, SLO.PROFILE.BUSINESS SERVICE, SLO.PROFILE.TAGS, SLO.FREQUENCY, SLO.PROFILE.TYPE

- [ ] Tests: tile order ends `NetRoute, SLO`; `countersFor('Metric')[0] === 'slo.instance.achieved.percent'`; columns for two counters have two counter columns between NAME and TARGET; INSTANCE only for non-SLO types; rows filtered by sources; values deterministic. Run → fail → implement → pass.

### Task 2: Wizard state

**Files:** Create `src/custom-report/wizard.js` + test.

**Interfaces — Produces:** `createWizard()` → `{ state(), pickType(t), setWidgetType(w), setView(v), setSloType(t), setCounter(i,c), addRow(), removeRow(i), setSourceFilter(f), setSources(list), criteriaErrors(): {[field]:msg}, canNext(step), go(step), setProps(patch), propsErrors(isTaken): {...}, toReport(): {name,description,category,type:'SLO',reportType:'Custom',schedule,orientation,criteria} }`. State: `{ step: 0|1|2, type, widgetType:'Grid', view:'area', fontSize:'Small', query:{ sloType:'SLO', rows:[{counter:'',aggregation:'Last'}], sourceFilter:'', sources:[] }, props:{name:'',description:'',category:'',orientation:'Auto',schedule:false} }`.

- [ ] Tests: `pickType('APM')` ignored; `pickType('SLO')` → step 1; setSloType resets counters (Review 1); setSourceFilter clears sources (Review 2); removeRow(1) of 3 keeps rows 0 and 2 (Review 3); removeRow never drops the last row; criteriaErrors lists counter and sourceFilter when empty; propsErrors: name required, unique via `isTaken`, category required. Fail → implement → pass.

### Task 3: Shell + Report Type step

**Files:** Create `src/custom-report/screen.js` (`renderWizard({ categories, isTaken, onSave, onExit }) → HTMLElement` with `.upgrade()`), `src/custom-report/reportTypeStep.js`, `src/custom-report/customReport.css`, test.

Header: back arrow (`data-role="report-back"`) + "Create Custom Report"; date range `obs-date-time-picker kind="range-presets"` at right on step 2. Left rail `obs-steps direction="vertical"` items Report Type / Report Criteria / Report Properties; done steps labelled "Report Type : SLO". Tiles: `.report-tile[data-type]`, SLO tile `button`, others `div[aria-disabled="true"]`; SLO picture inline SVG gauge, token colours. Search `obs-input` filters tiles.

- [ ] Tests: 19 tiles, last is SLO; only SLO is a button; clicking APM does nothing; search "net" leaves NetRoute; clicking SLO shows criteria step and rail label "Report Type : SLO"; back arrow calls `onExit`.

### Task 4: Criteria step

**Files:** Create `src/custom-report/criteriaStep.js`, test.

Widget Type `obs-radio as-button` (Grid|Top N). Query group `.slo-query` with SLO stripe; row 0: SLO Type, Counter\*, Aggregation\*, Source Filter\*, Source, ⊕; extra rows: Counter\*, Aggregation\* in the same grid columns, ⊗ then ⊕ on the last row. Selects carry `data-role` `slo-type`, `counter-<i>`, `aggregation-<i>`, `source-filter`, `source`; buttons `add-row`, `remove-row-<i>`. Source `obs-select multiple searchable`, `disabled` until filter. Footer Previous / Next (`data-role="prev"`, `"next"`); Next with errors marks fields (`data-invalid` + message).

- [ ] Tests: counter options follow SLO Type; ⊕ adds a row with only Counter+Aggregation; ⊗ removes; Source disabled until filter; Next with empty query stays on step 2 and marks Counter and Source Filter.

### Task 5: Preview + Properties panel

**Files:** Create `src/custom-report/preview.js` (`renderPreview(state) → HTMLElement`), `src/custom-report/charts.js` (pure SVG builders: `areaChart, lineChart, barChart(horizontal), pieChart, gaugeChart(items)` → SVG string), tests.

Grid → `obs-table` with `previewColumns/previewRows`, header font size class `slo-preview--small|medium|large`. Top N → items ranked desc by first counter, top 10; view picks the builder; view `grid` → table limited to top 10. Properties panel `.slo-properties` with "› Properties" toggle (`data-role="properties-toggle"`), Style tab: Grid → Header Font Size `obs-radio as-button`; Top N → seven icon buttons `data-view`. Preview shown only when `criteriaErrors()` empty; otherwise a hint "Pick a counter and a Source Filter to preview the report."

- [ ] Tests: each builder returns `<svg` with N marks for N items and no `#`/`rgb(` colours; ranking desc; toggle collapses panel; font size class applied.

### Task 6: Properties step, save, and Report page wiring

**Files:** Create `src/custom-report/propertiesStep.js`; Modify `src/report-categories/screen.js` (Create Custom Report → wizard view; save → `store.addReport`, back to list), `src/report-categories/store.js` (add `addReport(report)` if absent), tests.

Fields per spec §5 two-column grid (Name\* | Description; Category\* | Orientation; Schedule). Previous / Save & Exit (`data-role="save-exit"`).

- [ ] Tests: Save & Exit with empty name/category marks both; duplicate name refused; valid save calls `onSave` with `toReport()` shape and the Report page list gains the row (type SLO, reportType Custom) in that category; Review 4 and 5.

### Task 7: Render verification + docs

**Files:** Create `scripts/probe-custom-report.mjs`; Modify `CLAUDE.md`, `HANDOFF.md`; `docs/DS-GAPS.md` gains the missing report-type illustrations gap (if not already filed).

- [ ] Probe (real Chrome): Report page → Create Custom Report → only SLO clickable → criteria: counters per type, rows add/remove, Source gating → preview grid paints, each of the 7 Top N views paints SVG/table → properties → Save & Exit → row in list. Measured: 24px column gaps, extra counter rows' left edges = first row's Counter/Aggregation, Previous/Next/Save end on content edge, side-by-side controls share a top edge. Screenshots `docs/shots/custom-report-1…5.png`. Negative-control one alignment check.
- [ ] Full suite, colour guard, build; commit feature paths only.
