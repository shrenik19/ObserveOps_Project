# Handoff — 2026-10-22

## Read first

`CLAUDE.md` in this folder — especially **"How we work"** and **"Standing constraints"** (incl. the
form layout rules). The previous handoff (SDP drawer + layout fixes, 2026-10-12) is preserved in git
at `770a1b9`; its one open step — designer review of the SDP template → fields map — still stands.

## What we worked on this session

**SLO as a report type in Create Custom Report.** The product already reports on one SLO at a time;
this adds SLO to the Report module's Create Custom Report wizard. Built from the user's product
screenshots (Report page, the 3-step wizard, APM criteria + preview, Report Properties) and the
dashboard's Create Widget SLO query.

- Spec: `docs/superpowers/specs/2026-10-22-slo-custom-report-design.md` (v2, user-approved)
- Plan: `docs/superpowers/plans/2026-10-22-slo-custom-report.md` (executed inline)

## Completed

- **`src/custom-report/`** (70 tests) — the wizard, opened by **Create Custom Report** on the Report
  page as an internal view, `#/reports/categories?view=create-report` (deep-linkable):
  - **Report Type** — the product's 18 tiles + **SLO** after NetRoute; only SLO is clickable;
    search; hand-drawn token-only pictures.
  - **Report Criteria** — Widget Type **Grid | Top N**; the SLO query: SLO Type (SLO · Metric · APM ·
    RUM · NetRoute) → Counter\* (`slo.*` for SLO, `slo.instance.*` otherwise), Aggregation\* (**Last**
    only, pre-selected), Source Filter\* (**Performance SLO · Availability SLO**), Source
    (multi-select, disabled until a filter); ⊕ adds a Counter + Aggregation row, ⊗ removes it.
    Live preview once complete: Grid (the Create Widget columns, one per counter, tags as chips,
    scrolls sideways) or Top N (Area, Line, Horizontal/Vertical Bar, Pie, Solid Gauge, Grid —
    inline SVG on `--chart-*`), beside a collapsible **Properties → Style** panel (Header Font Size
    for Grid; the seven-view picker for Top N).
  - **Report Properties** — Name\* (unique), Description, Category\* (real categories, not All
    Reports), Orientation (Auto · Portrait · Landscape), Schedule; Previous / Save & Exit.
  - **Saved** into the list as Type **SLO**, Report Type **Custom** (`store.addReport`, new).
- **`scripts/probe-custom-report.mjs` — 54/54 in real Chrome**, incl. measured 24px column gaps,
  added rows under Counter/Aggregation, ⊗ on the Source Filter edge, Save & Exit on the field edge,
  and a negative control (a forced 32px gap is caught). Shots: `docs/shots/custom-report-*.png`.
- Rendering caught three defects jsdom could not, all fixed: the preview ignored the Source Filter;
  "Availability SLO" clipped; the grid squeezed its columns instead of scrolling.
- **DS-GAPS G57–G59**: `obs-table` header font size unreachable (measured); its `tags` cell type
  undocumented; no report-type illustrations or chart-type icons.
- Full suite **896 / 896 across 60 files** (whole working tree); colour guard clean; build clean.

### 2026-10-23 — user review, round 1

Four changes from the user, all built and verified (spec v3):

1. **Tile pictures black and white** — `--neutral-darkest` + a neutral grey. `--page-text-color`
   and `--border-color` are navy / blue-tinted, so the first attempt was not; the probe now
   measures every painted stroke and fill is grey.
2. **Criteria in the product report's layout** (from the user's APM screenshot): a plain field row
   (no SLO stripe, no panel), **20px** gaps as measured there; the preview box always shown and
   filling down to Previous / Next, "No data found" until complete; Properties with the round ›
   toggle on its border.
3. **Defaults**: SLO Type **SLO**, Counter **slo.achieved.percent** (that type's achieved percent
   after a change; added rows start empty).
4. **Source** is always an empty bordered box. `obs-select` falls back to "Select" for an empty
   placeholder, so it gets a single space; negative-controlled.

Probe **58/58**; suite **898 / 898 across 60 files**; colour guard and build clean.

### 2026-10-27 — Properties tabs

**Column Setting** and **Timeline Preference** added beside Style (product screenshot), shown but
**not clickable** — `disabled` tabs on `obs-tabs` (user decision). Probe checks both paint and that
clicking them leaves Style open; negative-controlled (an enabled tab does switch). Probe **60/60**.

### 2026-10-27 — wizard footer

Report Properties' **Previous / Save & Exit** now match the product (user screenshot): pinned to the
page's bottom-right corner, where Next sits on Report Criteria, instead of the right field edge;
**Previous** a filled grey `neutral-lightest` on both steps, **Save & Exit** an outlined `default`.
CLAUDE.md's layout rule gained a step-wizard exception. Probe **63/63** (position and painted
fill / outline measured at rest — the pointer must be moved off first or hover is measured).

### 2026-10-27 — "small things" pass

The user flagged details missed against the product screenshot and asked that such things be noted
(saved to memory: diff the whole screenshot, not just the asked part). Fixed:

- **Page title** — hand-built `.cr-header`: back chevron + **20px / 400** title (obs-page-header is
  fixed at 16px — **G61**).
- **Step rail** — hand-built `.cr-steps`: 45px rows with rules, current row banded, done = **filled
  dark disc + white check** (revisitable), current/upcoming = outlined number, no connectors,
  "Report Type : **SLO**" (obs-steps cannot — **G60**). Was green checks with connector lines.
- **Report Properties spacing** (found on the same screenshot, not flagged): **14px** between the
  columns, **40px** between rows — measured, was 24 / 24.

Probe **69/69**; suite **903 / 903**; colour guard clean.
**Brand — done (every screen):** the header shows the user's **motadata wordmark** in place of
mark + "ObserveOps" (the mark stays at the top of the sidebar, as in the product). Two assets in
`src/app/assets/`, 150 × 40: `motadata-wordmark-on-light.jpg` (dark text; its white
background blends with the light header, `rgb(255,255,255)`) and `-on-dark.png` (white,
transparent), swapped on `html[data-theme="dark-theme"]`. Verified in Chrome in both themes.
150 × 40 is 1× — an SVG would stay sharp on high-DPI screens. Known, not changed (shell-wide): the
product's header icons (search, user, monitor, bell) and its build number (8.2.9 / 10.0.1 vs 8.2.7).

### 2026-10-27 — SLO report tab

The Report page's tab row gains **SLO**, after Log Compliance (user request, product screenshot). Like
every tab there it is display-only — none of the tabs filters the list in this app. Probe **71/71**
(tab painted, last, clear of Create Custom Report). **Published 2026-10-27.** Noticed on the same
screenshot, pre-existing and unchanged: the Report title size (G61), default Type / Report Type
filter chips (G50), the ACTIONS heading, the schedule calendar icon, and 50 rows per page.

### 2026-10-27 — Settings layout published

The **shared Settings layout** — built by a parallel session (files last edited 2026-10-12) and left
uncommitted — is now committed and published at the user's request: `src/settings/` (the product's
18-section menu beside a pane, My Profile / Change Password, placeholders for sections without design
work), Settings as a **layout** module in the registry / router / screen host, and the LAMA, SLO
Profile, WAN Link Discovery and Integration screens moved into its pane (one route per menu item;
old `?view=` links redirect). DS-GAPS G55–G56 land with it, so the gap numbering is continuous.

Verified on the full tree before pushing: suite **905 / 905 across 60 files**; colour guard and build
clean; **probe-settings 40/40**, probe-integrations **55/55** (its three route checks updated to the
new routes — Integration items are `#/settings/integration-profile` etc., Slack opens the layout's
placeholder), probe-custom-report 71/71, probe-slo 29/29, probe-wan-link-discovery 85/85,
verify-create-drawers 18/18, verify-slo-filters 8/8, verify-wan-link clean. The working tree is now
fully committed — no parallel work remains uncommitted.

## In progress

**Committed and published 2026-10-27 via /publish** (SLO report + brand), with only this work's
paths and hunks — see `git log`. Paths: `src/custom-report/`,
`src/report-categories/{screen.js,store.js,store.test.js,createReport.test.js}`, `src/app/{shell.js,
shell.css,shell.test.js,assets/}`, `scripts/probe-custom-report.mjs`, `docs/shots/custom-report-*.png`,
the spec and plan, and this work's hunks in `CLAUDE.md` and `docs/DS-GAPS.md` (G57–G61).
The parallel session's Settings restructure was published afterwards (see above), so the tree is
clean and DS-GAPS numbering is continuous again.

## Next steps

1. **User decision — Header Font Size (G57):** the control is kept and saved with the report, but the
   preview cannot show it. Options: keep as is, hide it until the DS adds a hook, or drop it.
2. Designer review: the example SLO data, the tile pictures, and the date range default (the DS
   picker shows "Last 24 Hours"; the product shows "Today" — `obs-date-time-picker` exposes no preset
   value, see G28).
4. Still open from 2026-10-12: designer review of the SDP template → fields map.

## Decisions made

- **Internal view, not a route** — a second Reports screen would make `#/reports` a card grid and
  needs `router.js`, which the parallel session is changing. Spec §2/§8 named `#/reports/create`.
- **No Result By** (matches Create Widget); **Column Setting, Sorting and the Filters bar left out**
  (user decision); other tiles shown but inert (user decision).
- A Source Filter with no Source picked previews every SLO of that kind.

## Gotchas & notes

- **`obs-table` `rows` read back in Chrome is not the plain array set** — assert on painted rows
  (`shadowRoot tbody tr`), as the probe does. jsdom hides this.
- Object-valued DS props on a **detached** element must wait (`setLater` / `applyPending` in
  `src/custom-report/dom.js`), for `obs-table` as well as `obs-select`.
- Port 5199 may be held by an earlier session's Vite serving this folder — it serves current code.
