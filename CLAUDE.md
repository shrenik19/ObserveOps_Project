**On session start:** If `HANDOFF.md` exists in this directory, read it before anything else for the
latest state of the work.

# ObserveOps — Report / Category RBAC

## What this is

A reference implementation of the ObserveOps **Report module** screen, built entirely from the
published `@mtdt/observeops-ds-*` design-system packages. It adds category-level **Public/Private
visibility & sharing (RBAC)** to the Report module's left-nav category list.

It serves two purposes at once:

1. **Ship the feature** — per-category visibility, a three-mode settings drawer, create/delete.
2. **Exercise the DS as an outside consumer would** — discover everything through the MCP server and
   the published packages only, with a hard rule of *no hardcoded colours, no invented components*.

Purpose 2 is why `docs/DS-GAPS.md` exists and matters as much as the code.

**It is not production code.** Data is seeded in-memory; there is no backend.

## Tech stack

- **Vanilla JS + Vite 8** — no framework. The DS ships web components, so the app is plain DOM. This
  is deliberate: it keeps the DS's components on the critical path so anything awkward about them
  surfaces immediately instead of being smoothed over by a wrapper.
- **Vitest + jsdom** — 123 tests across 9 files.
- `@mtdt/observeops-ds-elements` · `-ds-css` · `-ds-spec` (public on npm, no auth).
- The **`observeops-ds` MCP server** for component discovery and token resolution — registered by
  the project's own `.mcp.json`.

## Structure

```
report-categories.html          the screen: app-shell regions + mount points
src/report-categories/
  main.js                       wiring: store ↔ side-menu ↔ table ↔ drawer ↔ dialog
  store.js                      categories + reports — no DOM, no DS   (24 tests)
  categorySettingsPanel.js      the three-mode settings drawer         (23 tests)
  deleteCategoryFlow.js         the four-state category delete flow    (10 tests)
  reassignReportsDialog.js      reassign reports before deleting       (13 tests)
  forceDeleteDialog.js          typed-name force delete                (13 tests)
  deleteConfirmDialog.js        the confirm modal                      (9 tests)
  augmentSideMenu.js            the ONE remaining DS extension         (17 tests)
  categoryRow.js                superseded — kept, unused by the page  (13 tests)
  *.css                         token-only styling — no hex/rgb/hsl anywhere
vite.config.js                  registers report-categories.html as a 2nd entry point
.mcp.json                       registers the observeops-ds MCP server
.claude/settings.json           pre-approves the npm commands
docs/                           see "Key context" below
```

## How to run

**Requires Node 22.22.2+, 24.15+, or 26+** (`jsdom` refuses older).

```bash
npm install
npm run dev            # then open /report-categories.html — NOT /
npm test               # 123 tests
npm run build          # builds both pages
```

`index.html` is still the untouched Vite starter. The feature lives on `report-categories.html`.

DS conformance (expects **100/100**):

```bash
npm install -D playwright-core
node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs ./report-categories.html
```

## Key context

### The docs are the deliverable as much as the code

| File | Job |
|---|---|
| `docs/DS-GAPS.md` | **The DS gap report — 22 findings (G0–G24).** Written to be handed to the DS team on its own. Kept current: fixed items are marked ✅ with evidence, and the original report is preserved beneath. |
| `docs/PROJECT-CONTEXT.md` | What was built and why, for someone who has never seen the app. Companion to the gap report. |
| `docs/superpowers/plans/…-ds-component-reference.md` | A consumer's-eye record of what each `obs-*` element's API *actually* is, versus what the registry says. The raw material behind the gap report. |
| `docs/superpowers/specs/…-design.md` | The original design spec. |
| `docs/superpowers/plans/…-report-category-rbac.md` | The original 8-task implementation plan. All 8 tasks are complete. |

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

## Handoff

Latest session state is in [HANDOFF.md](HANDOFF.md) — read it first.
