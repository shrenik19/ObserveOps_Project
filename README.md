# ObserveOps — Report / Category RBAC

A reference implementation of the ObserveOps **Report module** screen, built entirely from the
published `@mtdt/observeops-ds-*` packages, with a category-level Public/Private RBAC feature on the
left-nav category list.

**New here? Read these two first:**

| File | What it is |
|---|---|
| [`docs/PROJECT-CONTEXT.md`](docs/PROJECT-CONTEXT.md) | What this is, what it does, how it's built |
| [`docs/DS-GAPS.md`](docs/DS-GAPS.md) | Design-system findings raised from building it |

---

## Setup

**Requires Node 22.22.2+, 24.15+, or 26+** (`jsdom` refuses older). Check with `node -v`.

```bash
npm install
npm run dev
```

`npm install` restores dependencies already declared in `package.json`, and `package-lock.json`
pins the exact DS versions this was built and verified against — elements `0.1.159`, css `0.1.4`,
spec `0.1.197`. You get the same build, not "whatever is latest".

**If Claude Code refuses to run the install:** that is what blocked this project once before, on a
machine where the permission classifier denied `npm install` for these packages. Two things now
guard against it — `.claude/settings.json` pre-approves the npm commands, and the packages are
already declared, so it is a plain `npm install` rather than installing new scoped packages. If it
still refuses, just run `npm install` in a terminal yourself; the packages are public on npm and
need no auth.

Then open the URL Vite prints — just the root, e.g. <http://localhost:5173/>.

> The app is a single page. `/` lands on an Overview listing every screen; the screens themselves
> are routes inside it — `#/reports/categories` and `#/settings/lama`. The sidebar navigates
> between them.
> If port 5173 is taken, Vite picks another and prints it — use whatever it says.

```bash
npm test         # the full suite
npm run build    # builds the app and the two redirect stubs
```

### Adding a screen

1. Write `src/<name>/screen.js` exporting `meta` and `mount(root)`. `mount` receives the content
   region and returns its own teardown function.
2. Add one entry to the right module's `screens` array in `src/app/registry.js`.

That is the whole procedure. The sidebar entry, the route and the Overview card are all generated
from the registry — there is no `.html` file to add and no build config to touch.

### ⚠️ Do not copy `node_modules` between machines

Install it fresh on each machine. Vite 8 bundles with **rolldown**, which ships a **platform-specific
native binary** — `@rolldown/binding-darwin-arm64` on an Apple Mac,
`@rolldown/binding-win32-x64-msvc` on Windows. Copying the folder across gives:

```
Error: Cannot find native binding … Please try `npm i` again after removing
both package-lock.json and node_modules
```

If you hit that, delete `node_modules` and re-run `npm install`.

Copying `node_modules` out of a zip on macOS/Linux can also strip the executable bit, producing
`sh: vite: Permission denied`. Fix with `chmod +x node_modules/.bin/*` — or just reinstall.

---

## DS conformance check (optional)

The checker takes a URL as well as a file, which is what it now needs: the screens are routes, so
there is no static `.html` holding one. Run the dev server first, then point it at a route:

```bash
npm install -D playwright-core
npm run dev
node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs \
  http://localhost:5173/#/reports/categories
```

Expected: **100/100** on token / component / philosophy / layout.

**Three traps:**

0. **The score alone is not evidence, and now less than ever.** Screens load by dynamic `import()`,
   so Chromium can sample before the screen has mounted — which scores an almost-empty page very
   highly. Compare the element count against a known-good run before believing the number, and read
   the violations list.

1. **Without `playwright-core` it exits 2 after printing one line** — which reads like a pass. Make
   sure you installed it.
2. **It looks for Chrome at a macOS path by default.** On Windows, either point it at your Chrome:

   ```powershell
   $env:CHROME = "C:\Program Files\Google\Chrome\Application\chrome.exe"
   ```

   …or let it fall back to Playwright's bundled Chromium, which needs a one-off download:

   ```bash
   npx playwright install chromium
   ```

---

## After a DS package update

The DS packages move fast. After `npm update @mtdt/observeops-ds-elements @mtdt/observeops-ds-css
@mtdt/observeops-ds-spec`, **clear Vite's cache before judging anything**:

```bash
rm -rf node_modules/.vite     # Windows: rmdir /s /q node_modules\.vite
npm run dev -- --force
```

Vite serves a cached pre-bundle otherwise, and the app will convincingly show the *old* component
behaviour. This has produced false "still broken" readings more than once — see the MCP/cache note in
`docs/DS-GAPS.md`.

---

## Layout

```
index.html                      the app — an empty shell the router fills
report-categories.html          redirect stub -> #/reports/categories
lama.html                       redirect stub -> #/settings/lama
src/app/
  registry.js                   modules -> screens. The one file you edit to add a screen
  router.js                     parse / resolve / href — pure, no DOM
  shell.js                      the chrome: sidebar, app header, user menu
  screenHost.js                 the mount/unmount lifecycle
  overviewScreen.js             the default route, generated from the registry
  cardList.js · pageHeader.js   shared markup helpers
  main.js                       composition root, and the only DS import in the app
  shell.css                     shell layout + the Overview grid
src/report-categories/
  screen.js                     wiring: store ↔ side-menu ↔ table ↔ drawer ↔ dialog
  store.js                      pure data store — no DOM, no DS
  categorySettingsPanel.js      the three-mode settings drawer
  deleteCategoryFlow.js         the four-state delete flow
  augmentSideMenu.js            the one remaining DS extension
  *.css                         token-only styling — no hex/rgb/hsl anywhere
src/lama/
  screen.js                     the LAMA list and its Create Profile drawer
vite.config.js                  index.html + the two redirect stubs
docs/                           project context + the DS gap report
```

`augmentSideMenu.js` is the only place that reaches into a component's shadow DOM — it wires the
category row's edit pencil, which `obs-side-menu` renders but does not report. If the DS ever emits a
distinct edit event, **delete that file**.
