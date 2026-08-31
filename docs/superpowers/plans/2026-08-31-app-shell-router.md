# App Shell, Screen Registry and Hash Router — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace two standalone pages that each re-paste the app shell with one shell, a registry of screens, and a hash router — so adding a screen costs one module and one registry line.

**Architecture:** `index.html` becomes the shell (sidebar + app header + a content region + one overlay root). `src/app/registry.js` lists modules, each holding an ordered list of screens with a lazy `import()`. `src/app/router.js` turns a hash into a route and resolves it against the registry — both pure, no DOM. `src/app/screenHost.js` owns the mount/unmount lifecycle. `src/app/main.js` wires them together. Each screen exports `meta` and `mount(root)`, returning its own teardown.

**Tech Stack:** Vanilla JS, Vite 8, Vitest + jsdom, `@mtdt/observeops-ds-elements` / `-ds-css` web components.

**Spec:** `docs/superpowers/specs/2026-08-31-app-shell-router-design.md`

## Global Constraints

- **Node 22.22.2+, 24.15+, or 26+.** `jsdom` refuses older versions.
- **No hardcoded colours.** Every colour is a `var(--token)`. No hex, `rgb()`, `rgba()`, `hsl()` or `hsla()` anywhere in `src/`. CI greps for this and fails the build.
- **Never invent a DS component or guess its API.** Look it up in `node_modules/@mtdt/observeops-ds-elements/dist/elements-api.json`, then confirm by rendering.
- **`augmentSideMenu.js` is the only file permitted to touch a component's shadow root.** Do not add another.
- **Verify by rendering, not by reading.** jsdom has hidden real defects in this project before. A green test suite is not evidence that a screen renders.
- **Conformance passing is not proof.** This screen has scored 100/100 while visibly broken. Judge the violations list, not the number.
- **Tests are colocated**: `foo.js` and `foo.test.js` in the same directory. This is the existing convention.
- **DS side-effect imports live in `src/app/main.js` only.** No other module imports `@mtdt/observeops-ds-elements`, so every other module stays testable in jsdom.

### Refinement to the spec, made while planning

The spec's §5.1 gives `shell.js` two jobs: render the chrome *and* mount/unmount screens. This plan splits that into `shell.js` (chrome only) and `screenHost.js` (lifecycle only), because it makes each unit testable without the other — the shell can be tested without a router, and the lifecycle without any DS component. Everything else follows the spec as written.

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/app/registry.js` | Modules → screens. The one file edited to add a screen. Plus pure lookup helpers. |
| `src/app/registry.test.js` | Registry invariants and lookups. |
| `src/app/router.js` | `parse` / `resolve` / `href`. Pure, no DOM, no registry import. |
| `src/app/router.test.js` | Every route form against a fixture registry. |
| `src/app/cardList.js` | Card-grid HTML from registry entries. |
| `src/app/cardList.test.js` | Card count, hrefs, labels. |
| `src/app/pageHeader.js` | `obs-page-header` HTML from `{ heading, icon }`. |
| `src/app/overviewScreen.js` | The default screen. `meta` + `mount`. |
| `src/app/overviewScreen.test.js` | Renders one card per registry screen. |
| `src/app/shell.js` | Renders shell chrome once; exposes regions and `setActive`. |
| `src/app/shell.test.js` | Sidebar items, active state, inert empty modules. |
| `src/app/screenHost.js` | Mount/unmount lifecycle, overlay clearing. |
| `src/app/screenHost.test.js` | Ordering: unmount before mount; overlay cleared. |
| `src/app/shell.css` | Shell layout, lifted from `hostPage.css` and `landing.css`. |
| `src/app/main.js` | Composition root: DS imports, shell, router, screenHost. |
| `src/report-categories/reportCategories.css` | The report-specific half of `hostPage.css`. |

**Modified:**

| File | Change |
|---|---|
| `index.html` | Becomes the shell. |
| `report-categories.html` | Becomes a redirect stub. |
| `lama.html` | Becomes a redirect stub. |
| `vite.config.js` | Inputs: `index.html` + the two stubs. |
| `.github/workflows/deploy.yml` | Colour guard becomes a glob. |
| `CLAUDE.md`, `README.md` | Run instructions and structure. |

**Moved:** `src/lama/main.js` → `src/lama/screen.js`; `src/report-categories/main.js` → `src/report-categories/screen.js`.

**Deleted:** `src/landing/main.js`, `src/landing/landing.css`, `src/report-categories/hostPage.css`.

---

## Task 1: The registry

**Files:**
- Create: `src/app/registry.js`
- Test: `src/app/registry.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `modules` (array), `findModule(modules, key)`, `findScreen(modules, moduleKey, screenKey)`, `allScreens(modules)`. A module is `{ key, label, icon, screens }`. A screen is `{ key, label, description, load }`. `allScreens` returns `[{ module, screen }]` pairs.

Both screens ship with `screens: []` in this task. Tasks 5 and 6 each add one entry — which demonstrates the "one registry line" claim twice during implementation.

- [ ] **Step 1: Write the failing test**

Create `src/app/registry.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { modules, findModule, findScreen, allScreens } from './registry.js'

describe('registry data', () => {
  it('lists the six product modules in sidebar order', () => {
    expect(modules.map((m) => m.key)).toEqual([
      'dashboard', 'monitors', 'alerts', 'topology', 'reports', 'settings',
    ])
  })

  it('gives every module a label and an icon', () => {
    for (const m of modules) {
      expect(m.label, `${m.key} label`).toBeTruthy()
      expect(m.icon, `${m.key} icon`).toBeTruthy()
      expect(Array.isArray(m.screens), `${m.key} screens`).toBe(true)
    }
  })

  it('has no duplicate module keys', () => {
    const keys = modules.map((m) => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('has no duplicate screen keys within a module', () => {
    for (const m of modules) {
      const keys = m.screens.map((s) => s.key)
      expect(new Set(keys).size, `${m.key} screen keys`).toBe(keys.length)
    }
  })

  it('gives every screen a label, a description and a loader', () => {
    for (const { module, screen } of allScreens(modules)) {
      expect(screen.label, `${module.key}/${screen.key} label`).toBeTruthy()
      expect(screen.description, `${module.key}/${screen.key} description`).toBeTruthy()
      expect(typeof screen.load, `${module.key}/${screen.key} load`).toBe('function')
    }
  })
})

const fixture = [
  { key: 'empty', label: 'Empty', icon: 'dashboard', screens: [] },
  {
    key: 'one', label: 'One', icon: 'report',
    screens: [{ key: 'solo', label: 'Solo', description: 'd', load: async () => ({}) }],
  },
]

describe('findModule', () => {
  it('finds a module by key', () => {
    expect(findModule(fixture, 'one').label).toBe('One')
  })

  it('returns undefined for an unknown key', () => {
    expect(findModule(fixture, 'nope')).toBeUndefined()
  })
})

describe('findScreen', () => {
  it('finds a screen inside its module', () => {
    expect(findScreen(fixture, 'one', 'solo').label).toBe('Solo')
  })

  it('returns undefined when the module is unknown', () => {
    expect(findScreen(fixture, 'nope', 'solo')).toBeUndefined()
  })

  it('returns undefined when the screen is unknown', () => {
    expect(findScreen(fixture, 'one', 'nope')).toBeUndefined()
  })

  it('returns undefined when the module has no screens', () => {
    expect(findScreen(fixture, 'empty', 'anything')).toBeUndefined()
  })
})

describe('allScreens', () => {
  it('pairs each screen with its module, skipping empty modules', () => {
    expect(allScreens(fixture)).toEqual([
      { module: fixture[1], screen: fixture[1].screens[0] },
    ])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/registry.test.js`
Expected: FAIL — `Failed to resolve import "./registry.js"`.

- [ ] **Step 3: Write the implementation**

Create `src/app/registry.js`:

```js
// The single source of truth for what this app contains.
//
// To add a screen: write `src/<name>/screen.js` exporting `meta` and `mount(root)`, then add one
// entry to the right module's `screens` array below. It gets a sidebar module, a route, and a card
// on the Overview — all generated from this file. Nothing else needs editing.
//
// The module list is the product's own taxonomy, and is deliberately kept even where a module has
// no screens yet: those render in the sidebar and do nothing when clicked.

export const modules = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', screens: [] },
  { key: 'monitors', label: 'Monitors', icon: 'monitor', screens: [] },
  { key: 'alerts', label: 'Alerts', icon: 'alert', screens: [] },
  { key: 'topology', label: 'Topology', icon: 'networkTopology', screens: [] },
  { key: 'reports', label: 'Reports', icon: 'report', screens: [] },
  { key: 'settings', label: 'Settings', icon: 'settings', screens: [] },
]

export const findModule = (mods, key) => mods.find((m) => m.key === key)

export const findScreen = (mods, moduleKey, screenKey) =>
  findModule(mods, moduleKey)?.screens.find((s) => s.key === screenKey)

// Flattened [{ module, screen }] pairs, in registry order — what the card grids are built from.
export const allScreens = (mods) =>
  mods.flatMap((module) => module.screens.map((screen) => ({ module, screen })))
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/registry.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/registry.js src/app/registry.test.js
git commit -m "feat(app): add the screen registry

The module list currently exists verbatim in both screens' main.js. It now
exists once, and the sidebar, the routes and the Overview cards are all
generated from it."
```

---

## Task 2: The router

**Files:**
- Create: `src/app/router.js`
- Test: `src/app/router.test.js`

**Interfaces:**
- Consumes: nothing. It takes a modules array as an argument rather than importing the registry, so it stays pure and testable against fixtures.
- Produces:
  - `parse(hash)` → `{ module: string|null, screen: string|null }`
  - `href(moduleKey, screenKey?)` → `'#/reports/categories'` or `'#/reports'`; `href()` → `'#/'`
  - `resolve(route, modules)` → one of:
    - `{ kind: 'overview' }`
    - `{ kind: 'screen', module, screen }`
    - `{ kind: 'moduleIndex', module }`
    - `{ kind: 'ignore' }`

- [ ] **Step 1: Write the failing test**

Create `src/app/router.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { parse, resolve, href } from './router.js'

const screen = (key) => ({ key, label: key, description: 'd', load: async () => ({}) })

const fixture = [
  { key: 'empty', label: 'Empty', icon: 'dashboard', screens: [] },
  { key: 'one', label: 'One', icon: 'report', screens: [screen('solo')] },
  { key: 'many', label: 'Many', icon: 'settings', screens: [screen('a'), screen('b')] },
]

describe('parse', () => {
  it('reads an empty hash as no route', () => {
    expect(parse('')).toEqual({ module: null, screen: null })
  })

  it('reads a bare hash as no route', () => {
    expect(parse('#')).toEqual({ module: null, screen: null })
  })

  it('reads the root route as no route', () => {
    expect(parse('#/')).toEqual({ module: null, screen: null })
  })

  it('reads a module-only route', () => {
    expect(parse('#/reports')).toEqual({ module: 'reports', screen: null })
  })

  it('reads a module and screen route', () => {
    expect(parse('#/reports/categories')).toEqual({ module: 'reports', screen: 'categories' })
  })

  it('tolerates a trailing slash', () => {
    expect(parse('#/reports/')).toEqual({ module: 'reports', screen: null })
  })

  it('ignores segments beyond the second', () => {
    expect(parse('#/reports/categories/extra')).toEqual({ module: 'reports', screen: 'categories' })
  })
})

describe('href', () => {
  it('builds the root href with no arguments', () => {
    expect(href()).toBe('#/')
  })

  it('builds a module href', () => {
    expect(href('reports')).toBe('#/reports')
  })

  it('builds a module and screen href', () => {
    expect(href('reports', 'categories')).toBe('#/reports/categories')
  })

  it('round-trips through parse', () => {
    expect(parse(href('reports', 'categories'))).toEqual({ module: 'reports', screen: 'categories' })
  })
})

describe('resolve', () => {
  it('sends no route to the overview', () => {
    expect(resolve({ module: null, screen: null }, fixture)).toEqual({ kind: 'overview' })
  })

  it('sends an unknown module to the overview', () => {
    expect(resolve({ module: 'nope', screen: null }, fixture)).toEqual({ kind: 'overview' })
  })

  it('ignores a module with no screens', () => {
    expect(resolve({ module: 'empty', screen: null }, fixture)).toEqual({ kind: 'ignore' })
  })

  it('ignores a module with no screens even when a screen is named', () => {
    expect(resolve({ module: 'empty', screen: 'ghost' }, fixture)).toEqual({ kind: 'ignore' })
  })

  it('opens the only screen of a single-screen module', () => {
    expect(resolve({ module: 'one', screen: null }, fixture)).toEqual({
      kind: 'screen', module: fixture[1], screen: fixture[1].screens[0],
    })
  })

  it('shows a module index for a multi-screen module', () => {
    expect(resolve({ module: 'many', screen: null }, fixture)).toEqual({
      kind: 'moduleIndex', module: fixture[2],
    })
  })

  it('opens a named screen', () => {
    expect(resolve({ module: 'many', screen: 'b' }, fixture)).toEqual({
      kind: 'screen', module: fixture[2], screen: fixture[2].screens[1],
    })
  })

  it('falls back to the module rules when the named screen is unknown', () => {
    expect(resolve({ module: 'one', screen: 'nope' }, fixture)).toEqual({
      kind: 'screen', module: fixture[1], screen: fixture[1].screens[0],
    })
    expect(resolve({ module: 'many', screen: 'nope' }, fixture)).toEqual({
      kind: 'moduleIndex', module: fixture[2],
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/router.test.js`
Expected: FAIL — `Failed to resolve import "./router.js"`.

- [ ] **Step 3: Write the implementation**

Create `src/app/router.js`:

```js
// Hash routing, chosen over history routing because it needs no server co-operation: it behaves
// identically on the Vite dev server and on GitHub Pages under the /<repo>/ base path, with no
// history fallback and no 404.html copy trick.
//
// Pure by design — `resolve` takes the modules array rather than importing the registry, so the
// rules can be tested against fixtures and the registry can grow without touching this file.

/** '#/reports/categories' -> { module: 'reports', screen: 'categories' } */
export function parse(hash) {
  const [module = null, screen = null] = String(hash || '')
    .replace(/^#/, '')
    .split('/')
    .filter(Boolean)
  return { module, screen }
}

/** href() -> '#/'  ·  href('reports') -> '#/reports'  ·  href('r', 'c') -> '#/r/c' */
export function href(moduleKey, screenKey) {
  if (!moduleKey) return '#/'
  return screenKey ? `#/${moduleKey}/${screenKey}` : `#/${moduleKey}`
}

/**
 * A parsed route + the registry -> what to render.
 *
 *   overview     the default screen; also the fallback for anything unrecognised, so a stale
 *                shared link lands somewhere useful instead of erroring
 *   screen       mount this screen
 *   moduleIndex  the module holds several screens: show its card grid
 *   ignore       the module holds none: do nothing at all, leaving the URL and the sidebar
 *                highlight exactly as they were
 */
export function resolve({ module: moduleKey, screen: screenKey }, modules) {
  if (!moduleKey) return { kind: 'overview' }

  const module = modules.find((m) => m.key === moduleKey)
  if (!module) return { kind: 'overview' }
  if (module.screens.length === 0) return { kind: 'ignore' }

  const named = screenKey && module.screens.find((s) => s.key === screenKey)
  if (named) return { kind: 'screen', module, screen: named }

  // No screen named, or one named that does not exist: fall back to the module's own rules.
  return module.screens.length === 1
    ? { kind: 'screen', module, screen: module.screens[0] }
    : { kind: 'moduleIndex', module }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/router.test.js`
Expected: PASS, 20 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/router.js src/app/router.test.js
git commit -m "feat(app): add the hash router

parse/href/resolve, all pure. resolve takes the modules array rather than
importing the registry, so the routing rules are testable against fixtures."
```

---

## Task 3: The card grid and the Overview screen

**Files:**
- Create: `src/app/cardList.js`, `src/app/cardList.test.js`, `src/app/pageHeader.js`, `src/app/overviewScreen.js`, `src/app/overviewScreen.test.js`

**Interfaces:**
- Consumes: `href` from `router.js`; `allScreens` and `modules` from `registry.js`.
- Produces:
  - `cardListHTML(entries)` → HTML string. `entries` is `[{ module, screen }]`.
  - `pageHeaderHTML({ heading, icon })` → HTML string.
  - `overviewScreen.js` exports `meta` and `mount(root)` — the screen contract every screen follows.

The card markup and classes are lifted from today's `index.html` so `landing.css` transfers unchanged in Task 4.

- [ ] **Step 1: Write the failing test**

Create `src/app/cardList.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { cardListHTML } from './cardList.js'

const entries = [
  {
    module: { key: 'reports', label: 'Reports', icon: 'report' },
    screen: { key: 'categories', label: 'Report module', description: 'Visibility and sharing.' },
  },
  {
    module: { key: 'settings', label: 'Settings', icon: 'settings' },
    screen: { key: 'lama', label: 'LAMA integration', description: 'The profile drawer.' },
  },
]

const render = (html) => {
  const host = document.createElement('div')
  host.innerHTML = html
  return host
}

describe('cardListHTML', () => {
  it('renders one card per entry', () => {
    expect(render(cardListHTML(entries)).querySelectorAll('.card')).toHaveLength(2)
  })

  it('links each card at its route', () => {
    const hrefs = [...render(cardListHTML(entries)).querySelectorAll('.card')].map((a) =>
      a.getAttribute('href'),
    )
    expect(hrefs).toEqual(['#/reports/categories', '#/settings/lama'])
  })

  it('shows the screen label and description', () => {
    const first = render(cardListHTML(entries)).querySelector('.card')
    expect(first.querySelector('.card__title').textContent).toBe('Report module')
    expect(first.querySelector('.card__text').textContent).toBe('Visibility and sharing.')
  })

  it('takes the icon from the module', () => {
    const icon = render(cardListHTML(entries)).querySelector('.card obs-icon')
    expect(icon.getAttribute('name')).toBe('report')
  })

  it('renders an empty grid for no entries', () => {
    expect(render(cardListHTML([])).querySelectorAll('.card')).toHaveLength(0)
  })
})
```

Create `src/app/overviewScreen.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { meta, mount } from './overviewScreen.js'
import { modules, allScreens } from './registry.js'

describe('overviewScreen', () => {
  it('declares a page header', () => {
    expect(meta.pageHeader.heading).toBeTruthy()
    expect(meta.pageHeader.icon).toBeTruthy()
  })

  it('renders one card per registered screen', () => {
    const root = document.createElement('div')
    mount(root)
    expect(root.querySelectorAll('.card')).toHaveLength(allScreens(modules).length)
  })

  it('returns a teardown function', () => {
    const root = document.createElement('div')
    expect(typeof mount(root)).toBe('function')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/cardList.test.js src/app/overviewScreen.test.js`
Expected: FAIL — `Failed to resolve import "./cardList.js"`.

- [ ] **Step 3: Write the implementations**

Create `src/app/pageHeader.js`:

```js
// obs-page-header also exposes subtitle / count / meta / accent / back and five slots. A screen
// that needs any of those writes its own element; this helper only covers the common case, which
// is why the page header belongs to the screen rather than to shell metadata.
export const pageHeaderHTML = ({ heading, icon }) => `
  <obs-page-header heading="${heading}">
    <obs-icon slot="before" name="${icon}" size="20"></obs-icon>
  </obs-page-header>
`
```

Create `src/app/cardList.js`:

```js
import { href } from './router.js'

// The card grid, used by the Overview and by a module index. Markup and class names are the ones
// the landing page already used, so landing.css transfers unchanged.
export const cardListHTML = (entries) => `
  <div class="landing__cards">
    ${entries
      .map(
        ({ module, screen }) => `
      <a class="card" href="${href(module.key, screen.key)}">
        <obs-icon name="${module.icon}" size="22"></obs-icon>
        <h2 class="card__title">${screen.label}</h2>
        <p class="card__text">${screen.description}</p>
        <span class="card__go">Open screen</span>
      </a>`,
      )
      .join('')}
  </div>
`
```

Create `src/app/overviewScreen.js`:

```js
import { modules, allScreens } from './registry.js'
import { cardListHTML } from './cardList.js'
import { pageHeaderHTML } from './pageHeader.js'

export const meta = { pageHeader: { heading: 'Overview', icon: 'dashboard' } }

// The default route. Every card here is generated from the registry, so a new screen appears the
// moment its registry line exists — there is no list to keep in step by hand.
export function mount(root) {
  root.innerHTML = `
    ${pageHeaderHTML(meta.pageHeader)}
    <main class="app-shell__content landing">
      <p class="landing__blurb">
        Product screens rebuilt entirely from the published
        <code>@mtdt/observeops-ds-*</code> packages, as an outside consumer would. No hardcoded
        colours, no invented components. The design-system gap report these screens produced is in
        <code>docs/DS-GAPS.md</code>.
      </p>
      ${cardListHTML(allScreens(modules))}
    </main>
  `
  return function unmount() {}
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/cardList.test.js src/app/overviewScreen.test.js`
Expected: PASS, 8 tests. The overview card-count test passes trivially at zero right now; Tasks 5 and 6 give it real work.

- [ ] **Step 5: Commit**

```bash
git add src/app/cardList.js src/app/cardList.test.js src/app/pageHeader.js \
        src/app/overviewScreen.js src/app/overviewScreen.test.js
git commit -m "feat(app): add the card grid, the page-header helper and the Overview screen

Overview is the first screen written to the mount(root) contract, and its
cards come from the registry rather than from hand-maintained markup."
```

---

## Task 4: The shell, the screen host, and index.html

**Files:**
- Create: `src/app/shell.js`, `src/app/shell.test.js`, `src/app/screenHost.js`, `src/app/screenHost.test.js`, `src/app/shell.css`, `src/app/main.js`
- Modify: `index.html` (replace entirely)
- Delete: `src/landing/main.js`, `src/landing/landing.css`

**Interfaces:**
- Consumes: `modules` from `registry.js`; `parse` / `resolve` from `router.js`; `overviewScreen` and `cardListHTML` for the two built-in views.
- Produces:
  - `createShell({ host, modules })` → `{ content, overlay, setActive(key), onNavigate(fn) }`
  - `createScreenHost({ content, overlay })` → `{ show(loader), teardown() }`, where `loader` is `() => Promise<{ mount }>`

At the end of this task the app runs: `/` shows the Overview inside the shell, the sidebar renders all six modules, and clicking any of them does nothing (no screens exist yet). The two old pages still work standalone — they are converted in Tasks 5 and 6.

- [ ] **Step 1: Write the failing tests**

Create `src/app/screenHost.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { createScreenHost } from './screenHost.js'

const setup = () => {
  const content = document.createElement('div')
  const overlay = document.createElement('div')
  return { content, overlay, host: createScreenHost({ content, overlay }) }
}

describe('createScreenHost', () => {
  it('mounts a screen into the content region', async () => {
    const { content, host } = setup()
    await host.show(async () => ({ mount: (root) => { root.innerHTML = '<p>hi</p>' } }))
    expect(content.textContent).toBe('hi')
  })

  it('runs the previous screen’s teardown before mounting the next', async () => {
    const { host } = setup()
    const order = []
    await host.show(async () => ({ mount: () => () => order.push('unmount-a') }))
    await host.show(async () => ({ mount: () => { order.push('mount-b') } }))
    expect(order).toEqual(['unmount-a', 'mount-b'])
  })

  it('clears the overlay root between screens', async () => {
    const { overlay, host } = setup()
    await host.show(async () => ({ mount: () => { overlay.innerHTML = '<dialog></dialog>' } }))
    expect(overlay.children).toHaveLength(1)
    await host.show(async () => ({ mount: () => {} }))
    expect(overlay.children).toHaveLength(0)
  })

  it('empties the content region before mounting', async () => {
    const { content, host } = setup()
    await host.show(async () => ({ mount: (root) => { root.innerHTML = '<p>first</p>' } }))
    await host.show(async () => ({ mount: (root) => { root.innerHTML = '<p>second</p>' } }))
    expect(content.querySelectorAll('p')).toHaveLength(1)
    expect(content.textContent).toBe('second')
  })

  it('tolerates a screen that returns no teardown', async () => {
    const { host } = setup()
    await host.show(async () => ({ mount: () => undefined }))
    await expect(host.show(async () => ({ mount: () => {} }))).resolves.not.toThrow()
  })

  it('teardown() unmounts the current screen and clears both regions', async () => {
    const { content, overlay, host } = setup()
    const unmount = vi.fn()
    await host.show(async () => ({
      mount: (root) => { root.innerHTML = '<p>x</p>'; overlay.innerHTML = '<b></b>'; return unmount },
    }))
    host.teardown()
    expect(unmount).toHaveBeenCalledTimes(1)
    expect(content.children).toHaveLength(0)
    expect(overlay.children).toHaveLength(0)
  })
})
```

Create `src/app/shell.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { createShell } from './shell.js'

const fixture = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', screens: [] },
  { key: 'reports', label: 'Reports', icon: 'report', screens: [{ key: 'c', label: 'C', description: 'd', load: async () => ({}) }] },
]

const build = () => {
  const host = document.createElement('div')
  return { host, shell: createShell({ host, modules: fixture }) }
}

describe('createShell', () => {
  it('builds the sidebar items from the registry, dropping the screens', () => {
    const { host } = build()
    expect(host.querySelector('#module-nav').items).toEqual([
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'reports', label: 'Reports', icon: 'report' },
    ])
  })

  it('exposes the content region and the overlay root', () => {
    const { host, shell } = build()
    expect(shell.content).toBe(host.querySelector('#screen-root'))
    expect(shell.overlay).toBe(host.querySelector('#overlay-root'))
  })

  it('wires the header actions and the user menu', () => {
    const { host } = build()
    expect(host.querySelector('#app-header').actions).toHaveLength(2)
    expect(host.querySelector('#user-menu').items).toHaveLength(3)
  })

  it('links the brand at the overview route', () => {
    const { host } = build()
    expect(host.querySelector('.app-brand').getAttribute('href')).toBe('#/')
  })

  it('setActive highlights a module', () => {
    const { host, shell } = build()
    shell.setActive('reports')
    expect(host.querySelector('#module-nav').getAttribute('active')).toBe('reports')
  })

  it('setActive with no key clears the highlight, because Overview is not a module', () => {
    const { host, shell } = build()
    shell.setActive('reports')
    shell.setActive(null)
    expect(host.querySelector('#module-nav').getAttribute('active')).toBe('')
  })

  it('reports a navigate event as the module key', () => {
    const { host, shell } = build()
    const seen = vi.fn()
    shell.onNavigate(seen)
    host.querySelector('#module-nav').dispatchEvent(
      new CustomEvent('navigate', { detail: { key: 'reports', label: 'Reports' } }),
    )
    expect(seen).toHaveBeenCalledWith('reports')
  })

  it('unwraps a navigate detail delivered as an array, as some DS events do', () => {
    const { host, shell } = build()
    const seen = vi.fn()
    shell.onNavigate(seen)
    host.querySelector('#module-nav').dispatchEvent(
      new CustomEvent('navigate', { detail: [{ key: 'reports' }] }),
    )
    expect(seen).toHaveBeenCalledWith('reports')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/shell.test.js src/app/screenHost.test.js`
Expected: FAIL — `Failed to resolve import "./shell.js"`.

- [ ] **Step 3: Write the implementations**

Create `src/app/screenHost.js`:

```js
// Owns one screen at a time. Separated from shell.js so the lifecycle can be tested with plain
// objects, and the shell tested without a router — neither needs the other to be exercised.
export function createScreenHost({ content, overlay }) {
  let unmount = null

  function teardown() {
    if (typeof unmount === 'function') unmount()
    unmount = null
    content.replaceChildren()
    // Dialogs and drawers outlive their trigger, so a screen can leave one open. Clearing here
    // means no screen has to remember to close itself on the way out.
    overlay.replaceChildren()
  }

  async function show(loader) {
    teardown()
    const screen = await loader()
    unmount = screen.mount(content) ?? null
  }

  return { show, teardown }
}
```

Create `src/app/shell.js`:

```js
// The chrome that survives navigation: rendered once, never re-rendered. Screens mount into
// #screen-root; dialogs and drawers go in #overlay-root.
//
// Deliberately imports no DS module. The custom elements are registered once by main.js, which
// keeps this file testable in jsdom, where they are inert unknown elements.

// The header's build number differs between the two old pages (8.2.6 and 8.2.7). One shell means
// one value; the later wins.
const TEMPLATE = `
  <div class="app-shell">
    <obs-sidebar id="module-nav" brand="ObserveOps" active=""></obs-sidebar>

    <div class="app-shell__main">
      <!-- The `brand` and `user` SLOTS, not the same-named text attributes. obs-app-header has no
           logo fallback, so the mark only appears if it is slotted; and the `user` attribute
           renders initials that look clickable but emit nothing (gap G22). -->
      <obs-app-header id="app-header" build="8.2.7">
        <!-- Our own markup, so making it a link needs no DS co-operation. obs-sidebar's logo is an
             <a> with @click.prevent that emits nothing, so it cannot be the way home. -->
        <a slot="brand" class="app-brand" href="#/">
          <obs-logo name="motadata" size="26"></obs-logo>
          ObserveOps
        </a>

        <obs-user-menu
          slot="user"
          id="user-menu"
          name="Motadata Admin"
          subtitle="admin@motadata.com"
          initials="MA"
          theme-toggle
          theme="light"
          manage-theme
          logout
        ></obs-user-menu>
      </obs-app-header>

      <div id="screen-root" class="app-shell__screen"></div>
    </div>
  </div>

  <div id="overlay-root"></div>
`

// DS events deliver the value in event.detail, sometimes wrapped in an array — unwrap.
const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

export function createShell({ host, modules }) {
  host.innerHTML = TEMPLATE

  const sidebar = host.querySelector('#module-nav')
  // The registry entry minus its screens: obs-sidebar wants { key, label, icon }.
  sidebar.items = modules.map(({ key, label, icon }) => ({ key, label, icon }))

  host.querySelector('#app-header').actions = [
    { icon: 'search', label: 'Search' },
    { icon: 'bell', label: 'Notifications', badge: 3 },
  ]

  host.querySelector('#user-menu').items = [
    { key: 'profile', label: 'My Profile', icon: 'userCircle' },
    { key: 'preferences', label: 'Preferences', icon: 'settings' },
    { key: 'about', label: 'About', icon: 'infoCircle', divider: true },
  ]

  return {
    content: host.querySelector('#screen-root'),
    overlay: host.querySelector('#overlay-root'),

    // obs-sidebar never writes its own `active` — it is a plain prop driven from here. That is why
    // an empty module needs no disabled state: ignore its navigate event and nothing moves.
    setActive(key) {
      sidebar.setAttribute('active', key || '')
    },

    onNavigate(fn) {
      sidebar.addEventListener('navigate', (event) => {
        const key = detailValue(event)?.key
        if (key) fn(key)
      })
    },
  }
}
```

Create `src/app/shell.css` by moving, verbatim, lines 1–50 and the `.app-shell__body` / `.app-shell__content` rules out of `src/report-categories/hostPage.css`, plus all of `src/landing/landing.css`, then appending the one new rule:

```css
/* The region a screen mounts into: a flex column filling what is left under the app header, so a
   screen's own obs-page-header sits at the top and its content area takes the remainder. */
.app-shell__screen {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
```

Create `src/app/main.js`:

```js
// The composition root, and the ONLY module that imports the design system. Everything else stays
// free of it, so every other unit is testable in jsdom.
import '@mtdt/observeops-ds-elements'
// NOT '@mtdt/observeops-ds-css/dist/observeops-ds.css' — that path is absent from the package's
// exports map and throws under Vite. See the reference doc, correction 7.
import '@mtdt/observeops-ds-css/observeops-ds.css'
// Populates globalThis.__OBS_LOGOS__, which obs-logo reads; the elements bundle does not import it.
// Without it every <obs-logo> renders "?", including obs-sidebar's default.
import '@mtdt/observeops-ds-elements/logos'

import './shell.css'
import { modules } from './registry.js'
import { parse, resolve } from './router.js'
import { createShell } from './shell.js'
import { createScreenHost } from './screenHost.js'
import { cardListHTML } from './cardList.js'
import { pageHeaderHTML } from './pageHeader.js'

const shell = createShell({ host: document.body, modules })
const host = createScreenHost({ content: shell.content, overlay: shell.overlay })

// A module holding several screens shows its own card grid. No new component: it is the Overview's
// grid with a filter, which is what makes the two-level registry affordable.
const moduleIndex = (module) => ({
  mount(root) {
    root.innerHTML = `
      ${pageHeaderHTML({ heading: module.label, icon: module.icon })}
      <main class="app-shell__content landing">
        ${cardListHTML(module.screens.map((screen) => ({ module, screen })))}
      </main>
    `
    return () => {}
  },
})

async function route() {
  const target = resolve(parse(window.location.hash), modules)

  // A module with no screens behind it: leave the URL and the highlight exactly as they are.
  if (target.kind === 'ignore') return

  if (target.kind === 'overview') {
    shell.setActive(null)
    await host.show(() => import('./overviewScreen.js'))
    return
  }

  shell.setActive(target.module.key)

  if (target.kind === 'moduleIndex') {
    await host.show(async () => moduleIndex(target.module))
    return
  }

  await host.show(target.screen.load)
}

// Clicking a sidebar module sets the hash; `hashchange` does the rest, so navigation has exactly
// one path through the code whether it came from a click, a link, the back button or a pasted URL.
shell.onNavigate((key) => {
  const target = resolve({ module: key, screen: null }, modules)
  if (target.kind === 'ignore') return
  window.location.hash = `#/${key}`
})

window.addEventListener('hashchange', route)
route()
```

Replace `index.html` entirely:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <title>ObserveOps</title>
    <!-- Inter, loaded the same way the DS loads Poppins. Matching weights to the DS's own set
         (400/500/600/700) so every component keeps the weight it was designed at. -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <!-- The shell is rendered by src/app/shell.js into <body>, and screens are mounted into it by
         the router. There is deliberately no markup here: a screen is added by writing a module and
         one registry line, never by editing this file. -->
    <script type="module" src="/src/app/main.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/`
Expected: PASS — 14 new tests here, 37 across `src/app/`.

- [ ] **Step 5: Delete the old landing page**

```bash
git rm src/landing/main.js src/landing/landing.css
```

- [ ] **Step 6: Verify by rendering — the shell actually boots**

Run `npm run dev`, open `http://localhost:5173/`, and confirm **in the browser**:

- The sidebar renders all six modules with icons, and the logo is a mark, not a `?`.
- The app header shows the brand, the two actions and the user menu.
- The Overview heading and blurb render; the card grid is empty (no screens registered yet).
- Clicking Dashboard, Monitors, Alerts, Topology, Reports or Settings does nothing — the URL does not change and no highlight moves.
- The theme toggle in the user menu still flips light/dark.

Do not proceed on the test suite alone. jsdom has hidden real defects in this project before.

- [ ] **Step 7: Commit**

```bash
git add src/app/ index.html
git rm --cached -r --ignore-unmatch src/landing
git commit -m "feat(app): render one shell and route screens into it

index.html is now the shell: the sidebar, header and user menu are built once
from the registry rather than re-pasted per page. shell.js owns the chrome,
screenHost.js the mount/unmount lifecycle, main.js wires them to the router.

The landing page becomes the Overview screen; src/landing is removed."
```

---

## Task 5: Convert LAMA to a screen module

**Files:**
- Create: `src/lama/screen.js` (from `src/lama/main.js`)
- Delete: `src/lama/main.js`
- Modify: `src/app/registry.js` (one entry)

**Interfaces:**
- Consumes: the `mount(root)` contract from Task 4; `pageHeaderHTML` from Task 3.
- Produces: a `settings` module entry `{ key: 'lama', label: 'LAMA integration', description, load }`.

LAMA is converted first because it is the simpler of the two: no shadow-DOM observer, one overlay root, one module-scope array.

- [ ] **Step 1: Create `src/lama/screen.js`**

Start from `src/lama/main.js` and make exactly these changes:

1. **Delete the three DS side-effect imports** (`@mtdt/observeops-ds-elements`, `-ds-css`, `/logos`) — `src/app/main.js` owns them now.
2. **Delete `import '../report-categories/hostPage.css'`** — the shell owns that CSS; keep `import './lama.css'`.
3. **Delete the `module-nav`, `app-header` and `user-menu` wiring blocks entirely** — that is the shell's job now.
4. **Add `export const meta`** and wrap everything else in `export function mount(root)`.
5. **Move the markup** from `lama.html`'s `<main class="app-shell__content lama-page">` into a `TEMPLATE` string, comments included, prefixed by `pageHeaderHTML`.
6. **Resolve elements from `root`, not `document`** — except the overlay root.
7. **Return a teardown.** Nothing here outlives the DOM, so it only clears the overlay.

```js
import { pageHeaderHTML } from '../app/pageHeader.js'
import { renderLamaProfileDrawer } from './lamaProfileDrawer.js'
import './lama.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Settings', icon: 'settings' })}

  <main class="app-shell__content lama-page">
    <!-- The LAMA intro strip: mark, title, and the framework blurb the product shows. -->
    <header class="lama-page__intro">
      <div class="lama-page__heading">
        <h2 class="lama-page__title">LAMA</h2>
        <p class="lama-page__blurb">
          Accelerate regulatory compliance under SEBI's LAMA framework with Motadata
          ObserveOps. For more information:
          <span class="lama-page__link">LAMA Framework</span>
        </p>
      </div>
    </header>

    <obs-toolbar data-role="lama-toolbar">
      <obs-input
        slot="start"
        class="lama-page__search"
        type="search"
        placeholder="Search"
        data-role="lama-search"
      ></obs-input>

      <obs-button variant="transparent" squared aria-label="Preview">
        <obs-icon name="eye" size="16"></obs-icon>
      </obs-button>
      <obs-button variant="transparent" squared aria-label="Export PDF">
        <obs-icon name="filePdf" size="16"></obs-icon>
      </obs-button>
      <obs-button variant="transparent" squared aria-label="Export XLS">
        <obs-icon name="fileExcel" size="16"></obs-icon>
      </obs-button>
      <obs-button variant="primary" id="create-lama-profile">Create LAMA Profile</obs-button>
    </obs-toolbar>

    <obs-table
      id="lama-table"
      sticky-header
      empty-text="No records available"
      page-size="50"
    ></obs-table>
  </main>
`

export function mount(root) {
  root.innerHTML = TEMPLATE

  const overlay = document.getElementById('overlay-root')
  const table = root.querySelector('#lama-table')

  // The LAMA list. Starts empty, as the product does before a profile exists. Declared inside
  // mount, so revisiting the screen starts from the product's real initial state.
  const profiles = []

  table.columns = [
    { key: 'name', title: 'NAME', sortable: true },
    { key: 'description', title: 'DESCRIPTION' },
    { key: 'exchange', title: 'EXCHANGE', width: 130 },
    { key: 'application', title: 'APPLICATION', width: 150 },
    { key: 'dataInterval', title: 'DATA INTERVAL', width: 140 },
    { key: 'monitoringHours', title: 'MONITORING HOURS', width: 170 },
    { key: 'lastSyncAt', title: 'LAST SYNC AT', width: 150 },
    { key: 'status', title: 'STATUS', type: 'status', width: 110 },
  ]
  table.rowActions = [
    { key: 'edit', label: 'Edit', icon: 'pencil' },
    { key: 'delete', label: 'Delete', icon: 'trash', danger: true },
  ]
  table.rows = profiles

  const closeDrawer = () => overlay.replaceChildren()

  function openDrawer() {
    const { element } = renderLamaProfileDrawer({
      onCancel: closeDrawer,
      onCreate: ({ metadataFields, counters }) => {
        // No backend: show the result by adding the profile to the grid, so the flow is visible.
        profiles.push({
          id: `lama-${profiles.length + 1}`,
          name: document.querySelector('[data-role="lama-name"]')?.getAttribute('value') || 'Untitled Profile',
          description: `${counters.counters.length} counter(s), ${metadataFields.length} metadata field(s)`,
          exchange: 'NSE',
          application: 'Trading',
          dataInterval: '5 Minute(s)',
          monitoringHours: 'Market Hours',
          lastSyncAt: '—',
          status: 'Active',
        })
        table.rows = [...profiles]
        closeDrawer()
      },
    })
    overlay.replaceChildren(element)
    // Object-valued props must be assigned after the elements are in the document.
    requestAnimationFrame(() => element.upgradeSelects())
  }

  root.querySelector('#create-lama-profile').addEventListener('click', openDrawer)

  // Every listener is on a node inside `root`, so clearing it drops them all. The screen host
  // clears the overlay too; closing here keeps the teardown honest on its own.
  return function unmount() {
    closeDrawer()
  }
}
```

- [ ] **Step 2: Delete the old entry point**

```bash
git rm src/lama/main.js
```

- [ ] **Step 3: Register the screen — the one-line change**

In `src/app/registry.js`, replace the `settings` module entry with:

```js
  {
    key: 'settings', label: 'Settings', icon: 'settings',
    screens: [
      {
        key: 'lama',
        label: 'LAMA integration',
        description:
          'The Create LAMA Profile drawer: interval or fixed-time scheduling, a counter catalogue ' +
          'driven by the chosen Trading API with per-counter aggregation, and repeating metadata fields.',
        load: () => import('../lama/screen.js'),
      },
    ],
  },
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`
Expected: PASS. The registry suite now exercises a real screen entry, and `overviewScreen.test.js` asserts one card.

- [ ] **Step 5: Verify by rendering**

Run `npm run dev` and confirm **in the browser**:

- `http://localhost:5173/` shows one card, "LAMA integration". Clicking it goes to `#/settings/lama`.
- `http://localhost:5173/#/settings/lama` loads the screen directly on a hard refresh.
- Settings is highlighted in the sidebar; the page header reads Settings.
- **Open the Create LAMA Profile drawer and drive it fully**: interval and fixed-time scheduling, the counter catalogue with per-counter aggregation, and adding and removing metadata fields. Create a profile and confirm the row appears in the grid.
- Navigate to `#/` and back to `#/settings/lama` **twice**, then create a profile again — confirm the drawer still opens once, not two or three times, and that the grid starts empty each visit.

- [ ] **Step 6: Commit**

```bash
git add src/lama/screen.js src/app/registry.js
git rm --cached --ignore-unmatch src/lama/main.js
git commit -m "feat(lama): become a screen module on the shell

The shell wiring and the DS imports are gone — main.js owns those now. The
markup moves out of lama.html into the module, and #drawer-root becomes the
shell's #overlay-root. Registering it took one registry entry."
```

---

## Task 6: Convert Report / Category RBAC to a screen module

**Files:**
- Create: `src/report-categories/screen.js` (from `src/report-categories/main.js`), `src/report-categories/reportCategories.css`
- Delete: `src/report-categories/main.js`, `src/report-categories/hostPage.css`
- Modify: `src/app/registry.js` (one entry)

**Interfaces:**
- Consumes: the `mount(root)` contract; `pageHeaderHTML`.
- Produces: a `reports` module entry `{ key: 'categories', label: 'Report module', description, load }`.

**This is the delicate one.** It holds the only thing in the codebase that outlives the screen's DOM: `menuObserver`, a `MutationObserver` watching `obs-side-menu`'s shadow root (`main.js:334-349`). If it is not disconnected in the teardown, every revisit stacks another observer, each re-running `augmentCategoryRows` — the rail will duplicate pencils or thrash.

- [ ] **Step 1: Split `hostPage.css`**

Create `src/report-categories/reportCategories.css` holding, verbatim, the rules `.module-tabs`, `.module-tabs obs-tabs`, `.content-toolbar__search`, `.category-side-menu`, `.category-side-menu obs-side-menu`, `.category-favorites`, `.category-favorites obs-icon` (both rules), `.category-list`, `.category-list .category-row`, `.category-row.is-active`.

Then:

```bash
git rm src/report-categories/hostPage.css
```

The remaining rules — `:root`, `html, body`, `.app-shell`, `.app-shell__main`, `.app-brand`, `.app-shell__body`, `.app-shell__content` — already moved to `src/app/shell.css` in Task 4.

- [ ] **Step 2: Create `src/report-categories/screen.js`**

Start from `src/report-categories/main.js` and make exactly these changes. **The body of the file — the seed data, the store wiring, the filter bar, the panel and dialog flows, `toMenuItems`, `rowsFor`, `augmentMenu`, `setActive`, `render` — moves across unchanged.** Only the frame changes:

1. **Delete the three DS side-effect imports.**
2. **Replace `import './hostPage.css'` with `import './reportCategories.css'`.** Keep the four other CSS imports.
3. **Delete the `module-nav`, `app-header` and `user-menu` wiring blocks** (`main.js:136-157`).
4. **Add `export const meta`** and wrap the rest in `export function mount(root)`.
5. **Move the markup** from `report-categories.html` — everything from `<obs-page-header>` through `</div>` closing `.app-shell__body` — into `TEMPLATE`, comments included, with `pageHeaderHTML` supplying the header.
6. **`document.getElementById(...)` becomes `root.querySelector(...)`** for `category-list`, `reports-table`, `report-tabs`, `filter-bar` and `[data-role="new-category"]`. `panelRoot` and `dialogRoot` both become the shell's `#overlay-root`.
7. **`menuObserver` must be disconnected in the teardown.**

The frame:

```js
import { pageHeaderHTML } from '../app/pageHeader.js'
import { createStore } from './store.js'
import { renderCategorySettingsPanel } from './categorySettingsPanel.js'
import { augmentCategoryRows } from './augmentSideMenu.js'
import { startDeleteCategoryFlow } from './deleteCategoryFlow.js'
import './categorySettingsPanel.css'
import './deleteConfirmDialog.css'
import './reassignReportsDialog.css'
import './forceDeleteDialog.css'
import './reportCategories.css'

export const meta = { pageHeader: { heading: 'Report', icon: 'report' } }

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Report', icon: 'report' })}

  <div class="module-tabs">
    <obs-tabs id="report-tabs" value="metric"></obs-tabs>
    <obs-button variant="primary" data-role="create-custom-report">Create Custom Report</obs-button>
  </div>

  <div class="app-shell__body">
    <!-- …the rest of report-categories.html's body, comments included… -->
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE

  // …every `const`/`function` from the old module scope, moved inside…

  const overlay = document.getElementById('overlay-root')
  const menu = root.querySelector('#category-list')
  const table = root.querySelector('#reports-table')
  const panelRoot = overlay
  const dialogRoot = overlay

  // …unchanged body…

  store.subscribe(render)
  render(store.getCategories())

  // The ONE thing here that outlives the DOM: a MutationObserver on obs-side-menu's shadow root.
  // Without this disconnect, every revisit to this screen stacks another observer, each re-running
  // augmentCategoryRows on every mutation.
  return function unmount() {
    menuObserver?.disconnect()
    menuObserver = null
    overlay.replaceChildren()
  }
}
```

Note that `let menuObserver = null` and `let activeId`, `let conditions`, `let matchMode` all move inside `mount` — which is what makes a revisit start clean.

- [ ] **Step 3: Delete the old entry point**

```bash
git rm src/report-categories/main.js
```

- [ ] **Step 4: Register the screen — the one-line change**

In `src/app/registry.js`, replace the `reports` module entry with:

```js
  {
    key: 'reports', label: 'Reports', icon: 'report',
    screens: [
      {
        key: 'categories',
        label: 'Report module',
        description:
          'Category-level Public/Private visibility and sharing. Paired padlock indicators, a ' +
          'hover-only custom-category marker, and a four-step delete flow that reassigns or ' +
          'force-deletes the reports inside a category.',
        load: () => import('./../report-categories/screen.js'),
      },
    ],
  },
```

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS — the original 123 plus the new `src/app/` tests. Every pre-existing test targets a module this task does not touch; if any of them fails, something moved that should not have.

- [ ] **Step 6: Verify by rendering — every state, in a real browser**

This screen's behaviour was originally established by driving it in headless Chrome, and that is the only acceptable check. Confirm at `#/reports/categories`:

- The rail lists every category with the correct padlock: `lockOpen` for Public, `lockAlt` for Private.
- Hovering a **custom** category reveals the cog; hovering a builtin one does not.
- The pencil opens the settings drawer in all three modes (create, edit-builtin, edit-custom).
- The full delete flow: confirm → delete an empty category (Capacity Planning); confirm → reassign a category's reports to another; confirm → force delete by typing the exact name, and check that a lowercase and a padded attempt are both refused.
- The filter bar adds and clears conditions and switches Match All/Any.
- Favorites, search and the tabs strip behave as before.

Then the re-mount check, which is what Step 2's teardown exists for:

- Go to `#/settings/lama`, back to `#/reports/categories`, and repeat **twice more**.
- Each time, confirm the rail shows exactly one pencil per row and one cog per custom category — not two, not three.
- In DevTools, confirm no duplicated injected nodes accumulate in `obs-side-menu`'s shadow root.

- [ ] **Step 7: Commit**

```bash
git add src/report-categories/screen.js src/report-categories/reportCategories.css src/app/registry.js
git rm --cached --ignore-unmatch src/report-categories/main.js src/report-categories/hostPage.css
git commit -m "feat(report-categories): become a screen module on the shell

The shell wiring and DS imports move to app/main.js, the markup moves out of
report-categories.html, and hostPage.css splits: the shell half to app/shell.css,
the rest to reportCategories.css.

menuObserver is now disconnected on unmount. It watches obs-side-menu's shadow
root and is the one thing here that outlives the screen's DOM; without this,
every revisit stacked another observer."
```

---

## Task 7: Redirect stubs, build config, CI and docs

**Files:**
- Modify: `report-categories.html`, `lama.html`, `vite.config.js`, `.github/workflows/deploy.yml`, `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: the routes established in Tasks 5 and 6.
- Produces: nothing other modules use.

- [ ] **Step 1: Turn `report-categories.html` into a stub**

Replace the file entirely:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Report — ObserveOps</title>
    <!-- This page is now a route inside the app shell. The path is kept as a redirect so the URL
         published in CLAUDE.md, the README and anything already shared keeps working.
         Both redirects are RELATIVE, so they resolve at the root locally and under /<repo>/ on
         GitHub Pages. The <meta> is the no-JS fallback. -->
    <meta http-equiv="refresh" content="0; url=./#/reports/categories" />
    <script>
      location.replace('./#/reports/categories')
    </script>
  </head>
  <body>
    <p>Redirecting to <a href="./#/reports/categories">the Report screen</a>…</p>
  </body>
</html>
```

- [ ] **Step 2: Turn `lama.html` into a stub**

Same shape, with `./#/settings/lama` in all three places and `<title>LAMA — ObserveOps</title>`.

- [ ] **Step 3: Update `vite.config.js`**

Replace the `input` block:

```js
      input: {
        // The app. One page; screens are routes inside it.
        main: resolve(root, 'index.html'),
        // Redirect stubs, kept only so already-published URLs keep working. This list grows when a
        // URL needs preserving — never when a screen is added.
        reportCategories: resolve(root, 'report-categories.html'),
        lama: resolve(root, 'lama.html'),
      },
```

- [ ] **Step 4: Make the CI colour guard a glob**

In `.github/workflows/deploy.yml`, replace the guard's `grep` line. The current one names `src/landing/*.css`, which no longer exists — left alone, CI fails.

```yaml
      - name: Guard the no-hardcoded-colours rule
        run: |
          if grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(' \
               --include='*.css' --include='*.js' src/; then
            echo "::error::Hardcoded colour found. Every colour must be a var(--token)."
            exit 1
          fi
          echo "No hardcoded colours."
```

Also rename the build step from `Build all three pages` to `Build the app and the redirect stubs`.

- [ ] **Step 5: Run the guard locally before trusting CI**

Route literals containing `#` are new to this codebase, so confirm the pattern does not catch them:

```bash
grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(' --include='*.css' --include='*.js' src/
```

Expected: no output. (`#/reports/categories` cannot match — `/` is not a hex digit.) If anything matches, fix the source, not the guard.

- [ ] **Step 6: Update the docs**

In `CLAUDE.md`:
- **How to run** — `npm run dev` then open `/`. Delete "open `/report-categories.html` — NOT `/`", which is now backwards.
- **Structure** — add `src/app/` with a line per file; rename the two `main.js` entries to `screen.js`; note `index.html` is the shell and the two `.html` files are redirect stubs.
- **Deployment** — keep the three-URL table and add that the last two are redirects into `#/reports/categories` and `#/settings/lama`.
- **Add a short "Adding a screen" section**: write `src/<name>/screen.js` exporting `meta` and `mount(root)`, add one entry to the module's `screens` in `src/app/registry.js`. Nothing else.
- **Conformance** — the command now takes a URL: `node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs http://localhost:5173/#/reports/categories`, with the §14.1 caveat that the violations list is the evidence, not the score.

In `README.md`, make the same run-instruction change.

- [ ] **Step 7: Build, and verify the stubs redirect under a base path**

```bash
npm run build
BASE_PATH=/ObserveOps_Project/ npm run build && npm run preview
```

Open `http://localhost:4173/ObserveOps_Project/report-categories.html` and `…/lama.html` and confirm each lands on its route with the screen rendered — not a blank page and not a 404. This is the check that the *relative* redirect was the right call; an absolute one breaks here.

- [ ] **Step 8: Commit**

```bash
git add report-categories.html lama.html vite.config.js .github/workflows/deploy.yml CLAUDE.md README.md
git commit -m "build: keep the two published URLs as redirect stubs, and fix the CI guard

report-categories.html and lama.html now redirect into the shell's routes, so
every link already published keeps working. Both redirects are relative, so
they hold under the /ObserveOps_Project/ base path.

The colour guard named src/landing/*.css, which no longer exists; it is now a
glob over src/ so it cannot go stale again."
```

---

## Task 8: Whole-app verification

**Files:** none — this task changes nothing. It exists because the project's rule is that a claim is only true once it has been rendered.

- [ ] **Step 1: Run the full suite**

Run: `npm test`
Expected: PASS. Record the total; it should be the original 123 plus the `src/app/` additions.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success, emitting `index.html`, `report-categories.html`, `lama.html`, and a separate JS chunk per screen. Confirm the per-screen chunks exist — that is the evidence the lazy `import()` actually split.

- [ ] **Step 3: Walk the success criteria in a real browser**

Against `npm run dev`, confirm each of the spec's §15 criteria:

1. `/` shows the Overview inside the shell.
2. `#/reports/categories` and `#/settings/lama` render fully, on hard refresh as well as by navigation.
3. Both `.html` stubs redirect, at the root and under `BASE_PATH`.
4. Dashboard, Monitors, Alerts and Topology do nothing when clicked.
5. Clicking the brand returns to Overview and clears the sidebar highlight.
6. Browser back and forward move between screens correctly.

- [ ] **Step 4: Prove the scaling claim, then undo it**

Add a throwaway screen — a `screen.js` that renders a heading, plus one registry entry under `monitors`. Confirm without any other edit that it appears on the Overview, gets a working route, and highlights Monitors. Then delete both and confirm the app returns to two screens. **Do not commit the throwaway.**

- [ ] **Step 5: Re-run conformance, and judge it honestly**

```bash
node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs \
  http://localhost:5173/#/reports/categories --json /tmp/conformance.json
```

The score alone is not evidence. Compare the **element count** against the pre-refactor run: if it is far lower, Chromium sampled before the screen mounted and the result is meaningless. In that case, score the built page instead, or add a settle delay, and say so in the report. Then read the violations list.

On Windows, set `CHROME` first — the script defaults to a macOS Chrome path, and a missing binary makes it exit after one line in a way that reads like a pass.

- [ ] **Step 6: Update HANDOFF.md**

Rewrite it for this session: what changed, the new file layout, how to add a screen, the conformance caveat from Step 5, and anything that came out of the render checks.

- [ ] **Step 7: Commit**

```bash
git add HANDOFF.md
git commit -m "docs: hand off the app-shell refactor"
```

---

## Self-Review

**Spec coverage** — every section maps to a task:

| Spec § | Task |
|---|---|
| §5.1 `src/app/` files | 1, 2, 3, 4 |
| §5.2 moves, `hostPage.css` split | 4 (shell half), 6 (report half), 5 and 6 (`main.js` → `screen.js`) |
| §5.3 `src/landing/` deleted | 4 |
| §6 the registry | 1, extended in 5 and 6 |
| §7 the screen contract | 3 (first use), 5, 6 |
| §7.1 one `#overlay-root` | 4 (provides), 5 and 6 (adopt) |
| §8 router rules, `active` on Overview | 2 (rules), 4 (`setActive(null)`) |
| §9 Overview, brand as the way home | 3, 4 |
| §10 stubs, relative redirects | 7 |
| §11 vite, CI, CLAUDE.md, README | 7 |
| §12 four new test suites | 1, 2, 3, 4 |
| §14.1 conformance caveat | 8 step 5 |
| §14.2 overlay-root move | 5 step 5, 6 step 6 |
| §14.3 `augmentSideMenu` re-mount | 6 step 2 and step 6 |
| §14.4 state resets | 5 step 5 (grid starts empty each visit) |
| §15 success criteria | 8 steps 3–4 |

**Type consistency** — checked across tasks: `createShell({ host, modules })` → `{ content, overlay, setActive, onNavigate }` is produced in Task 4 and consumed only there. `createScreenHost({ content, overlay })` → `{ show, teardown }`, same. `resolve` returns `kind` values `overview | screen | moduleIndex | ignore`, spelled identically in `router.js`, `router.test.js` and `main.js`. `cardListHTML(entries)` takes `[{ module, screen }]` — the shape `allScreens` returns — in Tasks 3, 4 and both index views. `mount(root)` returns a teardown or `undefined`, and `screenHost` handles both.

**Placeholder scan** — the two `TEMPLATE` bodies in Task 6 use `…` to stand for blocks that are moved verbatim rather than rewritten; each is accompanied by an exact source (`report-categories.html`'s body, `main.js`'s module scope) and an explicit list of the changes to make. No step says "add error handling", "write tests for the above", or "similar to Task N".
