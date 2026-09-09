# Project context — ObserveOps Report / Category RBAC

**Read this first if you are working on the ObserveOps design system.** It is the companion to
[`DS-GAPS.md`](./DS-GAPS.md): this file explains *what was built and why*, so the gap report's
findings have context. Neither file assumes you have seen the app.

---

## 1. What this project is

A **reference implementation** of one ObserveOps product screen — the **Report module** — built
entirely from the published DS packages by a consumer who had no access to the product repo.

Its purpose was twofold:

1. **Ship a feature**: add Public/Private visibility & sharing (category-level RBAC) to the Report
   module's left-nav category list.
2. **Exercise the DS as an outside consumer would**: discover components through the MCP server and
   the published packages only, with a hard rule of *no hardcoded colours, no invented components*.

The second purpose is why `DS-GAPS.md` exists. Every finding in it came from actually building this,
not from reading the docs.

**It is not production code.** Data is seeded in-memory; there is no backend.

---

## 2. The feature: category-level RBAC

The Report module has a left-hand list of report categories (All Reports, Config, Inventory,
Wireless…). Today they are visible to everyone. The feature adds:

- **Per-category visibility** — every category is **Public** (everyone in the org) or **Private**
  (only named users / user profiles).
- **A visibility indicator on every row** — at-a-glance, without opening anything.
- **A settings panel** to change a category's name, visibility, and sharing list.
- **Create and delete** for custom categories.

**Two kinds of category**, and the distinction drives most of the UI logic:

| | `builtin` | `custom` |
|---|---|---|
| Examples | All Reports, Config, Windows | Inventory, Wireless |
| Rename | ❌ (field shown disabled) | ✅ |
| Change visibility / sharing | ✅ | ✅ |
| Delete | ❌ (the store throws) | ✅ |

**The settings panel has three modes**, which is the core of the component's design:

- `create` — blank name, defaults to Public.
- `edit-builtin` — name pre-filled but **disabled**; only visibility is editable.
- `edit-custom` — everything editable, plus a Delete action.

**Validation:** name is required and non-empty in editable modes; if Private is selected, at least one
user or profile must be shared with.

---

## 3. Tech stack

- **Vanilla JS + Vite 8** — no framework. The DS ships web components, so the app is plain DOM.
- **Vitest + jsdom** — 123 tests across 9 files.
- `@mtdt/observeops-ds-elements@0.1.159` · `observeops-ds-css@0.1.4` · `observeops-ds-spec@0.1.197`
- The **`observeops-ds` MCP server** for component discovery and token resolution.

No framework was a deliberate constraint: it keeps the DS's web components on the critical path,
so anything awkward about them shows up immediately rather than being smoothed over by a wrapper.

---

## 4. What the screen looks like

The screen reproduces the product's real Report module, top to bottom:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ obs-sidebar   │ obs-app-header  (brand · BUILD · actions · avatar)              │
│ (module rail) ├────────────────────────────────────────────────────────────────┤
│               │ module title strip   ⊙ Report                                   │
│  Dashboard    ├────────────────────────────────────────────────────────────────┤
│  Monitors     │ obs-tabs  Metric·Log·Flow·Trap·…      [Create Custom Report]    │
│  Alerts       ├───────────────────┬────────────────────────────────────────────┤
│  Topology     │ obs-side-menu     │ obs-input(search)        [pdf][xls][filter] │
│ ▶Reports      │  mode="list"      │ filter bar: Type · Report Type · + Filter   │
│  Settings     │                   ├────────────────────────────────────────────┤
│               │  ★ Favorites      │ obs-table                                   │
│               │  🔓 All Reports ✎ │  NAME↑ · DESCRIPTION · TYPE · REPORT TYPE   │
│               │  🔓 Config    ✎   │       · SCHEDULE · ⋯                        │
│               │  🔒 Inventory ⚙ ✎ │  … rows …  (⚙ = custom, on hover only)      │
│               │  🔒 Wireless  ⚙ ✎ │  « ‹ 1 2 › »  10 items per page  1–10 of 20 │
│               │ ─────────────     │                                             │
│               │  + New Category   │                                             │
└───────────────┴───────────────────┴─────────────────────────────────────────────┘
```

Overlays: **`obs-drawer`** (the settings panel, slides from the right) and **`obs-modal
variant="confirm"`** (delete confirmation).

**The RBAC feature is the 🔓/🔒 indicator, the ⚙ custom marker, the ✎ row action, `+ New Category`, the drawer and the
dialog.** Everything else is the existing product screen, rebuilt so the feature could be seen in
context rather than on a bare page.

---

## 5. Which DS components are used, and how

| Region | Component | Notes for DS maintainers |
|---|---|---|
| Module rail | `obs-sidebar` | `items` + `logo` slot. The `logo` slot is undocumented — see G10/G12 |
| App header | `obs-app-header` | `brand` / `user` slots, also undocumented |
| Module tabs | `obs-tabs` | Option shape is `{key,label}` — differs from other elements, see G5 |
| Category rail | `obs-side-menu mode="list"` | The registry's `list` variant names this exact panel |
| Row actions | **consumer-added** | Pencil wiring + the custom-category marker, injected into the shadow root — see G4/G13 |
| Filter bar | `obs-select` + `obs-radio` + `obs-button` | Composed, because `obs-filters` is referenceOnly — G9 |
| Grid | `obs-table` | `row-actions` + pagination work; cell content is the blocker — G1 |
| Settings panel | `obs-drawer` | Footer in the `actions` slot — undocumented, see G10 |
| Delete confirm | `obs-modal variant="confirm"` | `title` is dropped by this variant — G6 |
| Form controls | `obs-input`, `obs-radio`, `obs-select`, `obs-button`, `obs-icon` | |

**Everything colour-related resolves through `resolve_token`.** There is not a single hex, rgb or hsl
value in the application CSS. The one deliberate deviation is documented in G2: the info banner reuses
`--neutral-lightest` off-purpose, because the DS defines no info-surface token.

---

## 6. Architecture

```
report-categories.html          the screen: shell regions + mount points
src/report-categories/
  main.js                       wiring: store ↔ side-menu ↔ table ↔ panel ↔ dialog
  store.js                      categories + reports, no DOM     (24 tests)
  categorySettingsPanel.js      the three-mode drawer            (23 tests)
  deleteConfirmDialog.js        the confirm modal                (9 tests)
  deleteCategoryFlow.js         the four-state delete flow       (10 tests)
  reassignReportsDialog.js      reassign reports before delete   (13 tests)
  forceDeleteDialog.js          typed-name force delete          (13 tests)
  augmentSideMenu.js            consumer-side DS extensions      (17 tests)
  categoryRow.js                hand-rolled row (superseded)     (13 tests)
  *.css                         token-only styling
vite.config.js                  two entry points (the logos alias went when G12 was fixed)
```

**Data flow** — one direction, no framework needed:

```
store.subscribe(render)
  → render() maps categories to obs-side-menu items
  → user picks a row        → `select` event → setActive() → filters obs-table
  → user clicks ✎ or 🗑     → opens obs-drawer / obs-modal
  → panel saves             → store mutates → subscribers re-render
```

**`store.js` is deliberately DOM-free and DS-free.** It is the one part that would survive a move to
any framework, and it is where the builtin/custom rules live (`deleteCategory` throws on a builtin).

**`augmentSideMenu.js` is the interesting file for DS maintainers.** It contains everything the
consumer had to add because the DS stops short — the row trash, the create button, the pencil wiring,
keyboard operability, and the table's sticky header. It takes any root element rather than a live
shadow root, so it is fully unit-tested. **If the DS closes G4 and G13, this file deletes itself.**

---

## 7. Current state

- **All 8 planned tasks complete.** Design spec → plan → store → discovery → row → panel → dialog →
  wiring → conformance.
- **123 tests passing** across 9 files.
- **DS conformance 100/100** — token 100 · component 100 · philosophy 100 · layout 100, with
  **0 raw controls** and 0 hardcoded colours.
- **`validate_render`: 0 violations.**
- Both pages build (`npm run build`).

### Running it

```bash
npm install
npm run dev            # → http://localhost:5173/report-categories.html   (5174 if 5173 is taken)
npm test               # 123 tests
node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs ./report-categories.html
```

The conformance checker needs `playwright-core` (`npm i -D playwright-core`). It drives the system
Chrome and needs no browser download — but **without it, it exits 2 after one line**, which reads like
a pass.

`index.html` is still the untouched Vite starter; the feature lives on `report-categories.html`.

---

## 8. Known deviations from the product

Deliberate, and each traces to a gap:

| Deviation | Why | Gap |
|---|---|---|
| The reassignment grid is hand-composed, not an `obs-table` | a dropdown cannot live in a DS table cell | G23 |
| DESCRIPTION is plain text, not a link with a doc icon | one column of the original G1 set that has not been revisited | G1 |
| The custom-category marker is a `cog` | the product's real glyph is a wrench, which the DS does not ship | G24 |
| The first delete confirm says No/Yes, not a named verb | the product specifies it; the verb is named on the force-delete step instead | — |

**Deviations that are now gone**, each retired when the DS shipped the fix:

| Was | Now | Gap |
|---|---|---|
| SCHEDULE was an On/Off pill | a real toggle switch (`type: 'switch'`) | G1 ✅ |
| No favourite ★ in the grid | ★ in the NAME cell, `part`-addressable | G1 ✅ / G15 ✅ |
| No DOWNLOAD column | icon buttons (`type: 'button'`) | G1 ✅ |
| The info banner was a reproduction | the real `obs-banner variant="info"` | G2 ✅ |
| The filter bar was hand-composed | the real `obs-filters kind="bar"` | G9 ✅ |
| Public used `globe` | the paired `lockOpen` / `lockAlt` padlocks | G3 ✅ |

---

## 9. Things a DS maintainer should know about how this was built

Useful when judging whether a gap is real or just an unlucky consumer:

1. **Discovery was MCP-first.** `search_components` → `get_component` → `get_recipe` →
   `resolve_token`, then `elements-api.json` for the element-level API. Where that path failed, the
   gap report says so — that failure *is* the finding.
2. **Every visual claim was verified by rendering**, not by reading. Headless Chrome screenshots were
   taken at each step. **Several findings were invisible to jsdom and to static checks** — `unlockAlt`
   drawing an undo arrow, `obs-select` rendering `[object Object]`, `obs-tabs` rendering an empty bar,
   the drawer footer floating mid-panel. A test suite alone would have shipped all four.
3. **Conformance is not sufficient.** The screen scored **100/100 while the grid header was the wrong
   style** (G13b) and while the drawer footer floated in the middle of the panel. Both values were
   legitimate DS styles, so no automated check could object. Worth considering what else scores 100
   while looking wrong.
4. **The costliest failure was not a DS problem.** The design spec cited four reference screenshots at
   a Windows path that were not in the repo; they were never chased, and the screen was first built as
   a bare harness with no app shell. G0 records this honestly so the DS team does not chase it.

---

## 10. A second feature on the same foundation: WAN Link Discovery

Everything above describes the Report / Category RBAC screen, which this document was originally
written for. The repo has since grown into one routed app holding several screens
(§ "Structure" in `CLAUDE.md`). The most involved of them is **WAN Link Discovery**
(`#/settings/wan-link-discovery`), and it is worth its own section because two of its design
decisions look arbitrary until you know why.

### What it is

WAN Link as a category in the Discovery Profile tree. A user picks an already-monitored router,
declares a link on it, pushes the resulting IP SLA operation (or Juniper RPM probe) to the device,
watches it verify, and provisions what came back. Cisco IOS XE, IOS XR and NX-OS, plus Juniper RPM.

Four views live in one screen, swapped in place rather than routed:

| View | What it does |
|---|---|
| Profile list | the saved discovery profiles, their last run, and what each discovered |
| Create form | **Single** (one link, typed) and **CSV** (many links, uploaded) modes |
| Progress panel | one card per link, narrating four stages, on a real timer |
| Provision grid | what verified — select, rename, and add as monitored WAN links |

### Why the monitor comes first

Every other Discovery Profile category starts from an IP or host you **type**. WAN Link starts from
a monitor you **pick**, and the whole form is built around that inversion.

The reason is that the device is *already monitored*. Its vendor, OS, collector, interfaces and
credential are known to the system before the form asks anything. So Vendor, Device OS, Credential
Profiles, Source Interface, the available probe list and even the Operations section's title all
**resolve from the monitor** rather than being asked for. Picking `CORE-NX-01.test.com` fills in
Cisco Systems / NX-OS / NXOS-SSH-Ops and narrows the probe list to the three NX-OS actually
supports, in one step.

That is also why the form is **gated**: until a monitor is chosen there is nothing to configure, and
the screen says so ("Select a **Monitor** to configure the link — the available probes depend on its
Device OS") instead of showing a form whose options it cannot yet know.

Two consequences fall out of the same idea:

- **There is no method field.** Every Device OS has exactly one method — NX-OS and IOS XR speak SSH,
  IOS XE and Juniper RPM speak SNMP — so asking would be a question with one possible answer.
- **The device deep link.** The old in-device "Add WAN Link" drawer is retired. The WAN Link screen's
  `Add WAN Link` button links to `#/settings/wan-link-discovery?monitor=m-nxos`: the same one form,
  entered with the Monitor already decided and **locked** (disabled, hinted "· locked — opened from
  this device"), because the user has already answered that question by being on that device's page.
  Reset clears the form but not the lock.

### Why a provisioned profile is frozen

Pressing **Add Selected Objects** in the provision grid is the point of no return, and afterwards
the profile can no longer be edited or re-run.

That is not a UI convenience — it is what the button *did*. Up to that moment the run has created an
IP SLA operation on a router and confirmed it returns data, but nothing in the product is watching
it. Add Selected Objects turns each verified link into a **monitored instance**: from then on, the
profile does not describe an intention, it describes configuration that exists on a physical device
and is being polled.

Editing it afterwards would change the description without changing the device, and re-running it
would push a second operation for a link that already has one — orphaning the first, which would
keep running on the router with nothing pointing at it. So `profileStore.js` makes provisioning
terminal: a provisioned profile is read-only, and a new link means a new profile. A profile that
discovered nothing, by contrast, provisioned nothing, so it stays editable and re-runnable — the
progress panel says exactly that when a run comes back empty.

### What building it cost the DS report

Six entries: **G37** (conformance flags a disabled `obs-button` as off-reference), **G38** (no
determinate progress bar), **G39** (`obs-table` cannot put a badge and editable text in one cell),
**G41** (`obs-table`'s `change` payload is undocumented, and `selected` reads back as a JSON
string), **G42** (the conformance checker cannot see a dead `var()`) and **G43** ("1 items
selected"). It also **withdrew two**: G40, and — while verifying this screen — G21.

The screen is verified by `scripts/probe-wan-link-discovery.mjs`, which drives all four views in
real Chrome. Three of the findings above were invisible to a green 591-test jsdom suite.

---

## 11. A third feature: the SLO estate and SLO Profile

Two more screens, ported from a **phase-1 canvas** (`docs/superpowers/specs/2026-09-01-redundancy-slo-design.md`,
which owns the model and the copy) into this app's DS-only shell
(`docs/superpowers/specs/2026-09-08-slo-ds-port-design.md`, which owns the port itself).

### What it is

**Redundancy SLO** lets an Availability SLO treat a group of monitors as backing each other up, so
one node flapping no longer breaches the SLO by itself — the group only fails once fewer than a
**quorum** of its members are up. The one sentence the whole feature exists to keep true: *a monitor
is down* is not the same fact as *the SLO is hurt*.

| Screen | Route | What it shows |
|---|---|---|
| **SLO** | `#/slo/list` | The SLO estate as a tile grid — flat, or regrouped under each Business Service, where the service tile takes the **severest status of its own SLOs** (one Breached SLO among three makes the service read Breached, even if the other two are Ok). |
| **SLO Profile** | `#/settings/slo-profile` | Settings → Service Level Objective → SLO Profile: the shipped profile table (Evaluation Logic sits beside Frequency) and, behind its Create button, the Create SLO Profile form. |

### The one invented component, and why

Every other control in this app is a published `obs-*` element, used as documented. **One is not.**
`src/slo-profile/evaluationLogic.js` renders the Create form's Strict/Redundant choice — two rows,
each stating what it tolerates, the selected one expanding to a quorum stepper (`obs-input` with
addons) reading "at least **N** of **M** must stay up."

That shape — a radio option that carries its own consequence text, an expandable body, and an
embedded live control — cannot be built from `obs-radio`. Rendered and inspected live, `obs-radio`'s
shadow root has **zero `<slot>` elements**: a light-DOM child placed inside it is real DOM (it is
never rejected) and paints at 0×0, invisible. So this control exists because there is no DS
equivalent to reach for, not by choice — it is filed as **G45**, and shipped as a working reference
implementation rather than only a description, on the theory that a control the DS team can read and
adapt is worth more than a paragraph about one they can't.

Everything *inside* that control stays DS: the quorum field is `obs-input type="number"` with
documented `addon-before`/`addon-after`, the full explanatory sentence renders into an `obs-tooltip`
via `textContent`. The consequence is text only: a `shield-check` glyph was carried there briefly
and removed on 2026-09-09 at the designer's direction, with the selected row's tint changed from
`--default-tag-bg` (a blue) to `--neutral-lighter`, so the control signals selection by surface
rather than by colour.

### What building it cost the DS report

Five new gap entries, **G45–G49** — `obs-radio` cannot carry per-option content (G45, above); a
shield glyph exists but was undiscoverable under the names tried, corrected from a capability gap to
a discoverability one after an incomplete first probe (G46); no card/tile component, the second time
this app has hit that wall (G47, after G31); `obs-button` has no pressed/toggled state, so the SLO
list's flat/grouped view toggle co-opts `variant` instead (G48); and `obs-select`/`obs-tags` have no
`label` attribute while `obs-input` does (G49) — which shipped a real bug: four Create-form fields
rendered with **no visible label at all**, past a 661-test suite and a 19-check render probe, caught
only by reading a screenshot. `src/wan-link-discovery/createForm.js` line 28 had already recorded the
same gap once before this build repeated it.

Three corrections to the record, not additional gaps: **OQ5** in the companion spec guessed
`obs-table` had no collapsible group-header rows — it does (`group-by`, `group-collapsible`, plus
`sticky-header`, `max-height`, `sort` and `sortable`); **G46** itself was first filed as "no shield
glyph exists" from a probe of only four names, corrected once the real name (`shield-check`) was
found (see `DS-GAPS.md`); and `DS-GAPS.md`'s own **G10** addendum, which claimed `elements-api.json`
documents no slots for `obs-tooltip`, was wrong and is withdrawn — the manifest's `obs-tooltip` entry
does carry `"slots": ["trigger","default"]`, and 16 components have documented slots in total. The
rendered fact that `obs-tooltip` has those two slots stands; only the claim that the manifest hides
them does not.

### Verified by rendering

`scripts/probe-slo.mjs` drives both screens end to end in real Chrome — the flat and grouped SLO
list, the profile table, and the Create form's Evaluation Logic control, including the *N = M is
unreachable* clamp, that both rows' shield glyphs actually paint (not merely exist in the DOM — the
same discipline that caught G49), and that every field label actually paints (not merely that the
attribute is present in markup, which is exactly what let G49 through once already).

**DS conformance:**

| Route | Score | Measured | Why |
|---|---|---|---|
| `#/slo/list` | **68/100** (token 83 · component 12 · philosophy 100 · layout 100) | 181 colours · 44 spacings · 3 DS components · 0 raw controls · 12 variant checks (2 invalid) · 7 style-match (6 off-ref) | **Expected, not a defect.** Per G47 the DS has no card, so the whole tile grid — five SLO tiles, three grouped service headers — is app markup (`src/slo-list/sloList.css`, following `src/app/cardList.js`'s existing precedent). The few real components on the page (`obs-toolbar`, `obs-input`, two `obs-button`s, two `obs-icon`s, one `obs-severity` per tile) are a small fraction of the screen's DOM, so the component-fidelity dimension cannot score high no matter how correctly those components are used. Two more contributors, both consistent with gaps already on file rather than new defects: the `slo-list-view` button is `disabled` (list view isn't built, only the flat/grouped toggle is), the same shape the checker mishandles per **G37**; and both icon-only toggle buttons carry a `title` but no `aria-label`. |
| `#/settings/slo-profile` | **100/100** (token 100 · component 100 · philosophy 100 · layout 100) | 34 colours · 4 spacings · 2 DS components · 0 raw controls · 3 variant checks (0 invalid) | This route's first (and only-scored) view is the profile table — `obs-toolbar` + `obs-input` + `obs-button` + `obs-table`, all used as documented — confirmed actually mounted (not a sampling artifact) by `docs/shots/slo-profile-table.png`, which shows the real 5-row grid. The Create form behind the "Create SLO Profile" button, where the one invented control and the label-fix live, is a second view and conformance never scores it — the same trap noted in `CLAUDE.md`'s "Adding a screen" section. |

Both routes were confirmed to have actually mounted before trusting either number, per the standing
trap that dynamic `import()` lets Chromium sample an almost-empty page and still score it highly.

---

## 12. Where to look

| File | What it is |
|---|---|
| [`DS-GAPS.md`](./DS-GAPS.md) | **The gap report — G0–G49, start here.** G21 and G40 are withdrawn, kept in place with the evidence that disproved them; OQ5 (a companion-spec guess) is corrected the same way |
| `superpowers/specs/2026-08-06-report-category-rbac-design.md` | The original Report / Category RBAC design spec |
| `superpowers/plans/2026-08-06-report-category-rbac.md` | The 8-task Report / Category RBAC implementation plan |
| `superpowers/plans/2026-08-06-ds-component-reference.md` | Full API reference gathered during the build — every tag, event, option shape and token used, with the corrections found along the way |
| `superpowers/specs/2026-09-01-redundancy-slo-design.md` | The phase-1 Redundancy SLO canvas spec — owns the evaluation model and copy |
| `superpowers/specs/2026-09-08-slo-ds-port-design.md` · `superpowers/plans/2026-09-08-slo-ds-port.md` | The DS-only port of that canvas into this app, and its 10-task implementation plan |
| `src/report-categories/augmentSideMenu.js` | Everything the consumer had to add because the DS stops short |
| `scripts/probe-wan-link-discovery.mjs` · `scripts/verify-wan-link.mjs` | The rendering probes for WAN Link / WAN Link Discovery. Conformance is not the verification; these are |
| `scripts/probe-slo.mjs` | The rendering probe for the SLO estate and SLO Profile screens |

The reference doc is the most useful of the three plan files for DS work: it is a consumer's-eye
record of what each component's API *actually* is, versus what the registry says.
