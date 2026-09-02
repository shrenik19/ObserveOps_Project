**On session start:** If `HANDOFF.md` exists in this directory, read it before anything else for the
latest state of the work.

# ObserveOps — DS reference app

## What this is

A reference implementation of several ObserveOps screens, built entirely from the published
`@mtdt/observeops-ds-*` design-system packages and served as **one routed single-page app**.

| Screen | What it is |
|---|---|
| **Report / Category RBAC** | Category-level Public/Private visibility & sharing on the Report module's left-nav category list. |
| **LAMA** | The LAMA list and its Create LAMA Profile drawer. |
| **WAN Link** | Cisco NX-OS WAN Link monitoring — ICMP Echo, UDP Echo and UDP Jitter probes, each with a detail drawer. |

It serves two purposes at once:

1. **Ship the features** — each screen is a real, working flow, not a mockup.
2. **Exercise the DS as an outside consumer would** — discover everything through the MCP server and
   the published packages only, with a hard rule of *no hardcoded colours, no invented components*.

Purpose 2 is why `docs/DS-GAPS.md` exists and matters as much as the code.

**It is not production code.** Data is seeded in-memory; there is no backend.

## Tech stack

- **Vanilla JS + Vite 8** — no framework. The DS ships web components, so the app is plain DOM. This
  is deliberate: it keeps the DS's components on the critical path so anything awkward about them
  surfaces immediately instead of being smoothed over by a wrapper.
- **Vitest + jsdom** — 458 tests across 26 files.
- `@mtdt/observeops-ds-elements` · `-ds-css` · `-ds-spec` (public on npm, no auth).
- The **`observeops-ds` MCP server** for component discovery and token resolution — registered by
  the project's own `.mcp.json`.

## Structure

```
index.html                      the app — an empty shell the router fills
report-categories.html          redirect stub -> #/reports/categories
lama.html                       redirect stub -> #/settings/lama
src/app/
  registry.js                   modules -> screens. THE file you edit to add a screen
  router.js                     parse / resolve / href — pure, no DOM, no registry import
  shell.js                      the chrome, rendered once: sidebar, app header, user menu
  screenHost.js                 the mount/unmount lifecycle, and overlay clearing
  overviewScreen.js             the default route, generated from the registry
  cardList.js · pageHeader.js   shared markup helpers
  main.js                       composition root, and the ONLY DS import in the app
  shell.css                     shell layout + the Overview grid
src/report-categories/
  screen.js                     wiring: store ↔ side-menu ↔ table ↔ drawer ↔ dialog
  store.js                      categories + reports — no DOM, no DS   (24 tests)
  categorySettingsPanel.js      the three-mode settings drawer         (23 tests)
  deleteCategoryFlow.js         the four-state category delete flow    (10 tests)
  reassignReportsDialog.js      reassign reports before deleting       (13 tests)
  forceDeleteDialog.js          typed-name force delete                (13 tests)
  deleteConfirmDialog.js        the confirm modal                      (9 tests)
  augmentSideMenu.js            the ONE remaining DS extension         (17 tests)
  categoryRow.js                superseded — kept, unused by the page  (13 tests)
  *.css                         token-only styling — no hex/rgb/hsl anywhere
src/lama/
  screen.js                     the LAMA list and its Create LAMA Profile drawer
src/wan-link/
  screen.js                     the WAN Link list, toolbar, filter bar and probe drawers
                                — plus an SVG chart renderer coloured from DS --chart-* tokens
vite.config.js                  index.html + the two redirect stubs
.mcp.json                       registers the observeops-ds MCP server
.claude/settings.json           pre-approves the npm commands
docs/                           see "Key context" below
```

## How to run

**Requires Node 22.22.2+, 24.15+, or 26+** (`jsdom` refuses older).

```bash
npm install
npm run dev            # then open / — the app is one page
npm test               # 458 tests across 26 files
npm run build          # builds the app and the two redirect stubs
```

**The app is a single page.** `/` is the Overview; the screens are routes inside the shell —
`#/reports/categories`, `#/settings/lama` and `#/monitors/wan-link` — and the sidebar navigates
between them.
The two `.html` files are redirect stubs kept only so already-published URLs keep working.

### Adding a screen

1. Write `src/<name>/screen.js` exporting `meta` and `mount(root)`. `mount` gets the content region
   and returns its own teardown.
2. Add one entry to the right module's `screens` array in `src/app/registry.js`.

That is all. The sidebar entry, the route and the Overview card are generated from the registry.
A module with no screens renders in the rail and does nothing when clicked, by design.

DS conformance (expects **100/100**) — it takes a URL as well as a file, which is what it now needs,
since no static `.html` holds a screen any more:

```bash
npm install -D playwright-core
npm run dev
node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs \
  http://localhost:5173/#/reports/categories
```

**Screens load by dynamic `import()`, so Chromium can sample before the screen has mounted** — which
scores an almost-empty page very highly. Check the element count against a known-good run before
believing the number.

## Key context

### The docs are the deliverable as much as the code

| File | Job |
|---|---|
| `docs/DS-GAPS.md` | **The DS gap report — 22 findings (G0–G24).** Written to be handed to the DS team on its own. Kept current: fixed items are marked ✅ with evidence, and the original report is preserved beneath. |
| `docs/PROJECT-CONTEXT.md` | What was built and why, for someone who has never seen the app. Companion to the gap report. |
| `docs/superpowers/plans/…-ds-component-reference.md` | A consumer's-eye record of what each `obs-*` element's API *actually* is, versus what the registry says. The raw material behind the gap report. |
| `docs/superpowers/specs/…-design.md` | The original design spec. |
| `docs/superpowers/plans/…-report-category-rbac.md` | The original 8-task implementation plan. All 8 tasks are complete. |

### Design source material lives outside the repo

Screens here are built from sketches and product screenshots that are **not** in git. They sit on
this machine under `D:\Claude design\`:

| Path | What it holds |
|---|---|
| `Create SLO Profile (standalone) (1).html` | The Create SLO Profile sketch — a **Claude Design canvas**, bundled. Its real markup is base64+gzip inside a `<script type="__bundler/template">` tag; extract with `JSON.parse` on that tag's text before reading it. |
| `Screenshots\SLO\SLO_1…5.png` | The **existing, shipped** SLO screens: list, detail Overview, monitor drawer, SLO History, historical instance. The source of truth for anything SLO-shaped. |
| `Screenshots\`, `*.html` at the root | Sketches for earlier work — Reports, Policy/Notification, Topology, LAMA. |

When a task says "use the existing design", it means those screenshots — read them before proposing
anything, and change only what the feature actually requires.

### How we work — the method that produced all of this

1. **Verify by rendering, never by reading.** Every visual or behavioural claim is checked with a
   headless-Chrome screenshot or a live DOM probe. **Multiple findings were invisible to jsdom and
   to static checks** — `unlockAlt` drawing an undo arrow, `obs-select` rendering `[object Object]`,
   `obs-tabs` rendering an empty bar, the drawer footer floating mid-panel. A test suite alone would
   have shipped every one of them.
2. **Conformance passing is not proof.** The screen has scored 100/100 while the grid header was the
   wrong style and while the drawer footer floated in the middle of the panel. Both were legitimate
   DS values, so nothing could object.
3. **When something looks wrong, first ask: DS or ours?** Then answer it with evidence from the
   package source, not a guess. Roughly half turned out to be ours (`no-divider`, `use-padding`,
   attribute-instead-of-slot) and half the DS's.
4. **Every DS finding goes in `docs/DS-GAPS.md`** with: a repro, the evidence (source lines or probe
   output), the consumer workaround used, and a concrete ask. Classed as *DS — capability*,
   *DS — discoverability*, *DS — packaging*, or *consumer*.
5. **When the DS ships a fix, re-verify and delete the workaround.** Four shadow-DOM patches have
   been retired this way; one remains.
6. **Prefer slots and tokens over patching.** Where the DS exposes a custom property or a slot, use
   it — those restyle a component from outside with no shadow-DOM piercing and no conformance cost.

### Standing constraints

- **No hardcoded colours.** Every colour is a `var(--token)` resolved via the MCP `resolve_token`.
  There is not one hex/rgb/hsl in the application CSS.
- **Never guess a component's API** — look it up (`search_components` / `get_component`, or
  `elements-api.json`), then confirm by rendering.
- **`augmentSideMenu.js` is the only file that reaches into a component's shadow DOM.** It wires the
  category row's edit pencil, which `obs-side-menu` renders but does not report. If the DS ever emits
  a distinct edit event, **delete that file.**

### Environment gotchas

- **The project root is this folder, not the folder above it.** Sessions are often launched from
  `D:\Claude design\observeops-app-share\`, which is just a container — it holds `observeops-app/`
  (this repo), `nxos-wan-link/` and `metric-explorer-instance-columns/`, and has no git, no
  `CLAUDE.md` and no `HANDOFF.md`. **`cd observeops-app` first**, or you will read no project
  context at all.
- **Never copy `node_modules` between machines.** Vite 8 bundles with rolldown, which ships a
  per-platform native binary. A copied folder fails with *"Cannot find native binding."*
- **After any DS package update, clear Vite's cache** (`rm -rf node_modules/.vite`, then
  `npm run dev -- --force`) before judging anything. It serves a stale pre-bundle otherwise and will
  convincingly show the *old* component behaviour. This has caused false "still broken" readings.
- **The MCP server is spawned at session start**, so a running session keeps the build it began with.
  Anything MCP-side must be re-checked in a **fresh session**.
- **The conformance checker exits 2 after one line if `playwright-core` is missing** — which reads
  like a pass. On Windows it also looks for Chrome at a macOS path; set `CHROME`, or
  `npx playwright install chromium`.

## Deployment

Repo: https://github.com/shrenik19/ObserveOps_Project
Live URL: https://shrenik19.github.io/ObserveOps_Project/

Published from **master** by `.github/workflows/deploy.yml`, which runs the tests, the build and the
no-hardcoded-colours guard before it publishes — a red suite blocks the deploy. Pages is a PROJECT
site, so it serves from `/ObserveOps_Project/`; `vite.config.js` takes that prefix from
`BASE_PATH` rather than hardcoding it, so the same build works locally and live.

One page, three URLs — the last two are redirect stubs into the shell's routes, kept so links
published before the refactor keep working:

| Screen | Live |
|---|---|
| Overview | https://shrenik19.github.io/ObserveOps_Project/ |
| LAMA | https://shrenik19.github.io/ObserveOps_Project/#/settings/lama |
| Report / Category RBAC | https://shrenik19.github.io/ObserveOps_Project/#/reports/categories |
| WAN Link (NX-OS) | https://shrenik19.github.io/ObserveOps_Project/#/monitors/wan-link |
| ↳ old LAMA link | `…/lama.html` → redirects to `#/settings/lama` |
| ↳ old Report link | `…/report-categories.html` → redirects to `#/reports/categories` |

Both redirects are **relative**, so they hold under the `/ObserveOps_Project/` base path as well as
at a domain root. Verified against a `BASE_PATH` build, not assumed.

## Handoff

Latest session state is in [HANDOFF.md](HANDOFF.md) — read it first.
