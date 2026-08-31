# Design — one app shell, a registry of screens, and a hash router

**Date:** 2026-08-31
**Status:** approved design, ready for an implementation plan
**Supersedes nothing.** Restructures how the screens designed in
`2026-08-06-report-category-rbac-design.md` and `2026-08-18-lama-custom-fields-design.md` are
hosted. Neither feature's behaviour changes.

---

## 1. What we are building

Today the project has two screens, each a standalone page with its own copy of the app shell. This
replaces that with **one shell and a registry**: `index.html` holds the sidebar and header, a hash
router swaps screens into the content region, and a screen is added by writing one module and one
registry line.

The goal is stated as a test: **adding the third screen must not require touching the shell, the
build config, or any existing screen.**

Nothing about the Report/Category RBAC or LAMA features changes. This is a hosting change.

---

## 2. Why the present shape does not scale

Concretely, adding a screen today costs five edits, three of them copy-paste:

1. A new `.html` file — into which the entire app shell is **re-pasted**. `report-categories.html`
   and `lama.html` both carry their own `obs-sidebar`, their own `obs-app-header` with the brand
   and user-menu slots, and their own `obs-page-header`.
2. A new entry in `vite.config.js` `rollupOptions.input`.
3. A new `main.js` — into which the **shell wiring is re-pasted**: the six-item `module-nav` items
   array, the `app-header` actions array, and the `user-menu` items array appear verbatim in both
   `src/lama/main.js` and `src/report-categories/main.js`.
4. A new card in `index.html`, by hand.
5. A new path in the CI colour-guard's hardcoded file list.

`index.html` is already a landing page, but it is a launcher, not a shell: it links out to two
pages that then rebuild the chrome from scratch. The duplication is the problem; a better launcher
does not touch it.

---

## 3. Decisions taken during design

| # | Question | Decision |
|---|---|---|
| 1 | Single page, or a shared shell across separate pages? | **True single-page shell.** Screens mount into one persistent shell; the sidebar and header render once and never re-render on navigation. |
| 2 | How do screens map onto sidebar modules? | **A module holds many screens.** The registry is two-level, so the seventh screen never forces a nav redesign. |
| 3 | What does clicking a module with no screens do? | **Nothing.** No placeholder screen, no disabled state. |
| 4 | URL scheme, and the two existing links? | **Hash routes**, plus `report-categories.html` and `lama.html` kept as **redirect stubs** so every published link survives. |
| 5 | What becomes of the landing page? | **An Overview screen inside the shell**, generated from the registry, serving as the default route. |

Decision 4 rejected pretty paths (`/settings/lama`) deliberately: they need a dev-server history
fallback *and* the GitHub Pages `404.html` copy trick, and this repo's Pages setup has neither. A
hash needs no server co-operation and behaves identically on the dev server and under the
`/ObserveOps_Project/` base path.

---

## 4. DS facts verified while designing this

Per the standing rule — never guess a component's API — both were read out of the installed
package, not assumed.

**`obs-sidebar` is a fully controlled component.** It emits `navigate` with `{ key, label }` and
never writes its own `active` prop:

```
observeops-elements.js:10874   emits: ["navigate"],
observeops-elements.js:10881   p = (u) => c("navigate", { key: u.key, label: u.label });
```

`active` is declared a plain `String` prop driven from outside. This makes **decision 3 free**: to
make an empty module inert we ignore its `navigate` event, and the highlight does not move because
nothing but us can move it. No disabled state is needed, and none is exposed.

**The conformance checker accepts a URL.** Its header reads *"it renders ANY page (a URL or an HTML
file)"*, and its usage line is `ds-conformance.mjs <url-or-file.html>`. It boots Chromium against a
tiny static server, so it can score a route on the dev server. See §14.1 for the caveat.

**`obs-page-header`** exposes `heading`, `subtitle`, `count`, `meta`, `accent`, `back`,
`no-divider`, and the slots `breadcrumb | back | before | title | default`. That breadth is the
reason §7 leaves the page header to the screen rather than hoisting it into shell metadata.

---

## 5. Architecture

### 5.1 New — `src/app/`

| File | Job |
|---|---|
| `registry.js` | Modules, each with an ordered list of screens. **The only file edited to add a screen.** |
| `router.js` | Hash ⇄ route. Pure: `parse(hash)`, `resolve(route, registry)`, `href(module, screen)`. No DOM. |
| `shell.js` | Renders the shell chrome once; wires sidebar items, header actions and user-menu items; drives `active` from the route; mounts and unmounts screens. |
| `pageHeader.js` | Builds an `obs-page-header` from `{ heading, icon }`. A helper screens *call*, not a schema they must satisfy. |
| `cardList.js` | The card grid, generated from registry entries. Used by both Overview and the module index. |
| `overviewScreen.js` | The default route. Today's landing cards, registry-driven. |
| `shell.css` | Shell layout, lifted out of `hostPage.css`. |
| `main.js` | The single entry point: DS imports, boot shell, start router. |

### 5.2 Moves

- `src/report-categories/main.js` → `src/report-categories/screen.js`
- `src/lama/main.js` → `src/lama/screen.js`

In both, the markup currently in the `.html` file is folded into the module as a template string —
**HTML comments included**, since in these two files the comments are half the documentation. All
module-scope state (`profiles` in LAMA, the store and seed data in report-categories) moves inside
`mount` so a screen re-mounts clean on every visit.

`hostPage.css` splits along a line it already has:

- **to `app/shell.css`** — the `:root` Inter override, `html, body`, `.app-shell`,
  `.app-shell__main`, `.app-brand`, `.app-shell__body`, `.app-shell__content`
- **to `report-categories/reportCategories.css`** — `.module-tabs`, `.content-toolbar__search`,
  `.category-side-menu`, `.category-favorites`, `.category-list`, `.category-row`

`.app-shell__body` and `.app-shell__content` go to the shell because both screens use them; they
are the content region's contract, not report-specific styling.

### 5.3 Deleted

`src/landing/main.js` and `src/landing/landing.css` — absorbed into `overviewScreen.js`,
`cardList.js` and `shell.css`.

---

## 6. The registry

```js
export const modules = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard',       screens: [] },
  { key: 'monitors',  label: 'Monitors',  icon: 'monitor',         screens: [] },
  { key: 'alerts',    label: 'Alerts',    icon: 'alert',           screens: [] },
  { key: 'topology',  label: 'Topology',  icon: 'networkTopology', screens: [] },
  {
    key: 'reports', label: 'Reports', icon: 'report',
    screens: [
      {
        key: 'categories',
        label: 'Report module',
        description: 'Category-level Public/Private visibility and sharing…',
        load: () => import('../report-categories/screen.js'),
      },
    ],
  },
  {
    key: 'settings', label: 'Settings', icon: 'settings',
    screens: [
      {
        key: 'lama',
        label: 'LAMA integration',
        description: 'The Create LAMA Profile drawer…',
        load: () => import('../lama/screen.js'),
      },
    ],
  },
]
```

The module list is exactly today's `module-nav` items array, which both `main.js` files carry
identically — it now exists once, and the sidebar is built from it. The two `description` strings
are not new copy: they are lifted verbatim from the existing cards in `index.html`, which is where
the screens currently explain themselves.

`load` is a dynamic `import()`, so Vite emits each screen as its own chunk and the shell boots
without pulling every screen's code. This is what keeps the cost of screen #10 near zero.

---

## 7. The screen contract

```js
export const meta = {
  pageHeader: { heading: 'Settings', icon: 'settings' },
}

export function mount(root) {
  root.innerHTML = TEMPLATE
  // …query, wire, seed — all state local to this call…
  return function unmount() {
    // drop document-level listeners; the shell clears `root` and `#overlay-root`
  }
}
```

`mount` receives the content region and returns its own teardown function. That is the whole
contract: **one function in, one function out.** A screen can be understood without reading the
shell, and the shell without reading any screen.

**The shell owns** `obs-sidebar`, `obs-app-header` (its brand slot, user menu and actions), and one
`#overlay-root`.

**The screen owns** everything below the header, *including its own `obs-page-header`*. This is
deliberate. The page header is screen-determined — heading and icon today, and per §4 the DS also
offers `count`, `back`, `meta`, `accent` and five slots. Hoisting it into shell metadata means
extending that schema every time a screen wants one more of them. `pageHeader.js` keeps the common
case to a single call while leaving the uncommon case open.

### 7.1 One deliberate change to existing screen code

`#panel-root`, `#dialog-root` (report-categories) and `#drawer-root` (LAMA) collapse into a single
shell-provided `#overlay-root`, cleared by the router on every navigation. This is a one-line
change in each screen's lookup. The dialog, drawer and panel modules themselves are untouched, and
none of their tests reference these ids.

---

## 8. The router

Routes are `#/<moduleKey>/<screenKey>` — `#/reports/categories`, `#/settings/lama`.

| Route | Behaviour |
|---|---|
| `#/`, empty, or unrecognised | Overview |
| `#/<module>` where the module has exactly 1 screen | Opens that screen |
| `#/<module>` where the module has 2+ screens | Module index — the card grid filtered to that module |
| `#/<module>` where the module has 0 screens | Ignored: URL unchanged, `active` unchanged, nothing redraws |
| `#/<module>/<screen>` | Opens that screen |

Navigation, on `hashchange`:

1. `unmount()` the outgoing screen
2. clear the content region and `#overlay-root`
3. `await entry.load()`
4. `mount(contentRegion)`, keep the returned teardown
5. set `obs-sidebar.active` to the module key

`active` is the module key on a screen route and on a module index, and the **empty string on
Overview** — Overview is not a module, so no rail item is highlighted there.

An unrecognised route falls back to Overview rather than erroring — a shared link that has gone
stale should land somewhere useful.

The module index costs no new UI: it is `cardList.js` with a filter. That is why decision 2's
two-level registry is affordable while no module yet has two screens.

---

## 9. Overview, and getting back to it

`overviewScreen.js` renders the intro block and a `cardList` of every screen in the registry, so a
new screen appears there the moment its registry line exists. It is the default route.

**Overview is reached by clicking the brand in the app header.** That `<span class="app-brand">` is
our own slotted markup, so it becomes an `<a href="#/">` — no DS behaviour is relied on. Two
alternatives were rejected: `obs-sidebar`'s own logo is an `<a>` with `@click.prevent` that emits
nothing, so it cannot be made to navigate without reaching into the shadow root; and adding an
"Overview" item to the sidebar would put a non-module in a module rail whose faithfulness to the
product is the point of decision 2.

---

## 10. URLs and back-compat

`report-categories.html` and `lama.html` become redirect stubs:

```html
<meta http-equiv="refresh" content="0; url=./#/reports/categories" />
<script>location.replace('./#/reports/categories')</script>
```

Both forms are **relative**, so they resolve correctly at the root on the dev server and under
`/ObserveOps_Project/` on Pages. The `<meta>` is the no-JS fallback.

They remain `vite.config.js` inputs so the build emits them into `dist/`. This keeps working:
every link in `CLAUDE.md`, the `README.md`, `HANDOFF.md`, and anything already shared.

`vite.config.js` `rollupOptions.input` therefore becomes `index.html` plus the two stubs — a list
that grows only when a *published URL* needs preserving, never when a screen is added.

---

## 11. Existing files that change

| File | Change |
|---|---|
| `index.html` | Becomes the shell: sidebar, header, content region, `#overlay-root`. Loads `/src/app/main.js`. |
| `vite.config.js` | Inputs: `index.html` + the two redirect stubs. |
| `.github/workflows/deploy.yml` | The colour guard greps a hardcoded file list that includes `src/landing/*.css`, which is about to not exist — a CI break if left. It becomes a glob over `src/**/*.css` and `src/**/*.js` so it never goes stale again. The "Build all three pages" step name is reworded. |
| `CLAUDE.md` | "How to run" says *open `/report-categories.html` — NOT `/`*. That inverts: `/` is now the front door. The Structure section and the three-page deployment table are updated. |
| `README.md` | Same run instructions. |

---

## 12. Testing

The existing **123 tests across 9 files** cover `store`, `categorySettingsPanel`,
`deleteCategoryFlow`, `reassignReportsDialog`, `forceDeleteDialog`, `deleteConfirmDialog`,
`augmentSideMenu`, `categoryRow`, and the LAMA sections. Every one is an independent module that
this design does not touch. **Neither `main.js` has tests today**, so converting them to `screen.js`
breaks nothing — which is also why the conversion must be verified by rendering (§14).

New tests, written first:

- **`router.test.js`** — `parse` on each route form; `resolve` for 0-, 1- and 2-screen modules;
  empty-module ignore; unknown-route fallback; `href` round-trips with `parse`.
- **`registry.test.js`** — no duplicate module or screen keys; every screen has a `load`; lookup
  helpers return the right entry and `undefined` for misses.
- **`shell.test.js`** — sidebar items come from the registry; `active` follows the route; a
  `navigate` event for an empty module changes nothing; the outgoing screen's `unmount` runs before
  the incoming `mount`; `#overlay-root` is cleared between screens.
- **`cardList.test.js`** — one card per screen, correct `href`, label and description.

---

## 13. Out of scope

No breadcrumbs, no route transitions, no scroll restoration, no query-param state, no route guards,
no secondary nav component for multi-screen modules (the card grid covers it), no placeholder
screens for empty modules (decision 3), no pretty paths (decision 4).

---

## 14. Risks, and how each is settled

### 14.1 Conformance may score the shell before the screen mounts

The checker renders in Chromium and extracts computed styles. With screens loaded by dynamic
`import()`, it may sample before `mount` has run — which would produce a **high score for an almost
empty page**. That is precisely the failure CLAUDE.md warns about: *"conformance passing is not
proof."*

Settled by reading the violations list and the element count, not the number. If the count is far
below the current run's, the sample was early, and the fix is to score the built page or add a
settle delay. **This must not be reported as a pass on the score alone.**

### 14.2 The overlay-root move

The three dialogs, the settings panel and the LAMA drawer work today as children of a plain `div`
at body level; `#overlay-root` is the same position. Still, per the project's method, all of them
get driven and screenshotted rather than reasoned about — the delete flow's four states, the
reassign modal, the force-delete gate, the settings drawer's three modes, and the Create LAMA
Profile drawer.

### 14.3 `augmentSideMenu.js` and re-mounting

It reaches into `obs-side-menu`'s shadow root, and it now runs on every visit to the report screen
rather than once per page load. Its teardown must be part of the screen's `unmount`, or repeat
visits accumulate listeners or duplicate injected nodes. Verified by navigating away and back
twice, then checking the rail's DOM.

### 14.4 Screen state resets on navigation

`mount` re-seeds, so a category created on the report screen is lost when you visit LAMA and come
back. This is correct for a reference app with in-memory data and no backend, and matches today's
full-page-reload behaviour. Recorded here so it is a decision, not a surprise.

---

## 15. Success criteria

1. `/` shows the Overview inside the shell; the sidebar and header are present.
2. `#/reports/categories` and `#/settings/lama` render the two screens with every behaviour intact.
3. `report-categories.html` and `lama.html` redirect to those routes, at the root and under a base
   path.
4. Clicking Dashboard, Monitors, Alerts or Topology does nothing visible.
5. Clicking the brand returns to Overview.
6. Adding a screen requires exactly one new module and one registry line — demonstrated by writing
   a throwaway third entry, confirming it appears in the sidebar and on Overview, then removing it.
7. `npm test` green, with the new suites added.
8. `npm run build` green; CI colour guard green.
9. Conformance re-run per §14.1, judged on violations rather than score alone.
