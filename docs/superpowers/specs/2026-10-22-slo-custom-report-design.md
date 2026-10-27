# SLO in Create Custom Report — design

**Date:** 2026-10-22 · **Status:** v3 — built. v2 settled Aggregation, Source Filter and the
Properties panel; v3 (2026-10-23 review) made the tile pictures black and white, gave the criteria
the product report's layout (plain field row, preview box always shown), set the SLO Type / Counter
defaults, and made Source an always-empty box.

## 1. Goal

ObserveOps already reports on one SLO at a time (the SLO's own report). This adds SLO as a **report
type in the Report module**, so a user can build a custom report across many SLOs — or across the
instances behind them — the same way they build an APM or Performance report today.

Source of truth: the user's product screenshots (build 10.0.1) of the Report page, the Create
Custom Report wizard (APM criteria and Report Properties), and the dashboard's **Create Widget**
SLO query, whose fields this report reuses.

## 2. Flow

```
Reports  →  Report page (#/reports/categories)  →  [Create Custom Report]
         →  #/reports/create
              1 Report Type       pick the SLO tile
              2 Report Criteria   widget type, SLO query, live preview      [Previous] [Next]
              3 Report Properties name, description, category, orientation, schedule
                                                                            [Previous] [Save & Exit]
         →  back to the Report page, the new report in the list
```

The wizard is one routed screen, `#/reports/create`, with the product's layout: a header with a
back arrow and "Create Custom Report", a left rail listing the three steps, and the step's content
to its right. A finished step shows a ✓ and its choice ("Report Type : SLO"). The back arrow
returns to the Report page without saving.

## 3. Step 1 — Report Type

- A search box, then the product's tile grid, four per row: Availability, Performance, Inventory,
  Active Alerts, Availability Flap Summary, Metric Alerts, Audit, Log Events, Trap Events, Log
  Analytics, Flow Analytics, Custom Script, Polling Data, Historical Trend, Compliance, APM, RUM,
  NetRoute — and **SLO**, added after NetRoute.
- **Only SLO is clickable.** The other tiles render as in the product but are not interactive (no
  hover, no pointer, not focusable) — this design covers SLO only.
- The SLO tile's picture: the product's tiles are line illustrations the DS does not ship. A
  hand-drawn inline SVG in the same idiom — a semicircular gauge with a target tick. **Black and
  white only** (v3): `--neutral-darkest` and a neutral grey, never the navy-tinted text colour.
  Logged as a DS gap (G59).
- Search filters tiles by name. "For more information: Create Custom Report ↗" sits at the foot.
- Picking SLO completes step 1 and opens step 2.

## 4. Step 2 — Report Criteria

### 4.1 Widget Type

A segmented control: **Grid | Top N** (Grid selected first). Top N's **view picker** — seven icon
buttons: **Area, Line, Horizontal Bar, Vertical Bar, Pie, Solid Gauge, Grid** — lives in the
Properties panel's Style tab (§4.3), where Create Widget puts it.

### 4.2 The SLO query

One plain row of fields, laid out as the product's report criteria (v3 — not Create Widget's
striped panel), **20px between columns** as measured on the product's APM report criteria:

| Field | Behaviour |
|---|---|
| **SLO Type** | SLO · Metric · APM · RUM · NetRoute. Default **SLO**. Changing it resets the counters. |
| **Counter\*** | Depends on SLO Type (below). Default **`slo.achieved.percent`** (v3); after an SLO Type change, that type's `achieved.percent`. Added rows start empty. |
| **Aggregation\*** | **Last** — the only option (user-confirmed), so it is pre-selected. |
| **Source Filter\*** | **Performance SLO · Availability SLO** (product screenshot). Required; starts on "Select". |
| **Source** | Always an empty, bordered box (v3 — never the borderless disabled look, no placeholder text); its list fills with the SLOs of the picked kind. |

**Counters by SLO Type**

- **SLO** — `slo.achieved.percent`, `slo.violated.percent`, `slo.error.budget.left.percent`,
  `slo.mttr.seconds`, `slo.mtbf.seconds`, `slo.burn.rate`
- **Metric, APM, RUM, NetRoute** — the same six as `slo.instance.*`
  (`slo.instance.achieved.percent` …)

**More counters:** ⊕ adds a row of **Counter\* + Aggregation\*** beneath, aligned under the first
row's Counter and Aggregation. Each added row has ⊗ (remove) beside it; ⊕ sits on the last row only.
SLO Type, Source Filter and Source apply to every row. **No Result By** — Create Widget's SLO query
has none.

A date range (Today, with its from/to stamps) sits top right, as in the product.

### 4.3 Preview — the report visualization

Below the query, the product's split: a **preview box** on the left filling the step down to
Previous / Next, showing **"No data found"** until the query is complete (v3), then:

- **Grid** — one row per SLO (SLO Type = SLO) or per SLO instance (other types). Columns:
  SLO.ID, SLO.PROFILE.NAME, *one column per chosen counter*, SLO.TARGET,
  SLO.PROFILE.BUSINESS SERVICE, SLO.PROFILE.TAGS (chips, "+N" overflow), SLO.FREQUENCY,
  SLO.PROFILE.TYPE. Instance rows add INSTANCE after the profile name.
- **Top N** — the SLOs (or instances) ranked by the first counter, drawn in the chosen view: area,
  line, horizontal/vertical bar, pie, one solid gauge per item, or the grid above limited to the top
  N. SLO names on the category axis, the counter's unit on the value axis.

**Properties panel** — beside the preview on the right, 20px from it, as in the product's APM
report: a round **›** toggle on the panel's left border that collapses the panel (the preview then
takes the full width), a "Properties" heading, and a **Style** tab:

- Grid → **Header Font Size**: Small · Medium · Large (Small), applied to the grid header.
- Top N → the seven-view picker (§4.1).

**Column Setting** and **Timeline Preference** tabs sit beside Style, as in the product, but are
**not clickable** (user decision, 2026-10-27). Sorting and the Filters bar are left out.

Charts are inline SVG coloured only with the DS's `--chart-*` tokens (the DS ships no chart
element — G34/G35), as the WAN Link screens already do. Data is example data built from the app's
existing SLO estate (`src/slo-list/sloStore.js`), plus example instances for the other types.

**Next** is enabled once the query is complete; otherwise the incomplete required fields are marked.

## 5. Step 3 — Report Properties

From the product screenshot, two columns:

| Left | Right |
|---|---|
| **Report Name\*** (placeholder "Name"; unique) | **Report Description** (placeholder "Description") |
| **Report Category\*** (select, the Report page's categories) | **Report Orientation** — Auto · Portrait · Landscape (Auto) |
| **Schedule** — switch, OFF | |

**Previous** returns to step 2 with everything kept. **Save & Exit** validates (name required and
unique, category required), saves, and returns to the Report page, where the report appears in its
category and in All Reports with **Type "SLO"**, **Report Type "Custom"**, and Schedule as set.

## 6. Layout rules (standing — CLAUDE.md)

- **Product-measured gaps**: 20px between the criteria fields and between preview and Properties
  (the product's report criteria); 24px in Report Properties (the product's form standard).
- **Edges line up across rows**: added counter rows sit exactly under Counter / Aggregation; Report
  Category under Report Name, Report Orientation under Report Description; Previous / Next /
  Save & Exit end on the content's right edge.
- **Plainest controls the product uses**; segmented controls are `obs-radio as-button`.
- App theme as the rest of this app (the DS's), not the product's dark screenshots.

## 7. Out of scope

- The other 18 report types (tiles shown, not clickable).
- Opening, editing, downloading or running a saved report; scheduling details beyond the switch.
- Widget Types other than Grid and Top N; the contents of Column Setting and Timeline Preference
  (shown, inert); Sorting; the Filters bar.
- A real backend: options, counters and values are example data.

## 8. Structure

```
src/custom-report/
  catalogue.js        report types, SLO types → counters, aggregations, filters — no DOM, no DS
  sloReportData.js    example SLO / instance rows and counter values — no DOM, no DS
  wizard.js           step state + validation — no DOM, no DS
  screen.js           #/reports/create: header, step rail, the three steps
  reportTypeStep.js · criteriaStep.js · propertiesStep.js
  preview.js          grid + the seven Top N views (inline SVG)
  customReport.css    token-only
```

`report-categories/screen.js` wires **Create Custom Report** to `#/reports/create`, and adds the
saved report to its store on return.

## 9. Testing

- **Unit (Vitest):** counters per SLO Type; wizard step gating and validation; add/remove counter
  rows; preview data per widget type; unique-name check; the saved report's shape in the store.
- **Rendered (`scripts/probe-custom-report.mjs`, real Chrome):** the full click-through from the
  Report page to the saved row; only SLO is clickable; each Top N view paints; measured 24px gaps and
  aligned edges (§6); no page errors. Screenshots per step in `docs/shots/`.
