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

## 10. Where to look

| File | What it is |
|---|---|
| [`DS-GAPS.md`](./DS-GAPS.md) | **The gap report — 22 findings (G0–G24), start here** |
| `superpowers/specs/2026-08-06-report-category-rbac-design.md` | The original design spec |
| `superpowers/plans/2026-08-06-report-category-rbac.md` | The 8-task implementation plan |
| `superpowers/plans/2026-08-06-ds-component-reference.md` | Full API reference gathered during the build — every tag, event, option shape and token used, with the corrections found along the way |
| `src/report-categories/augmentSideMenu.js` | Everything the consumer had to add because the DS stops short |

The reference doc is the most useful of the three plan files for DS work: it is a consumer's-eye
record of what each component's API *actually* is, versus what the registry says.
