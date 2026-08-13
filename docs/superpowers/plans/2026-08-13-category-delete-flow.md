# Category Delete Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visibility globe with paired padlocks, mark custom categories on hover, and build a four-state delete flow that never orphans a report.

**Architecture:** `store.js` grows to own reports as well as categories, so the "no report points at a deleted category" invariant is enforced in one DOM-free place. Three new dialog modules each render one `obs-modal` and expose `data-role` hooks; `deleteCategoryFlow.js` composes them into a state machine so `main.js` only wires. Every dialog is a pure function returning a detached element, matching the three dialogs already in the codebase.

**Tech Stack:** Vanilla JS (ES modules), Vite 8, Vitest + jsdom, `@mtdt/observeops-ds-elements` web components, token-only CSS.

**Source spec:** `docs/superpowers/specs/2026-08-13-category-delete-flow-design.md`

## Global Constraints

- **No hardcoded colours.** Every colour is `var(--token)`. Not one hex, rgb or hsl in application CSS. Tokens available and already used in this project: `--page-text-color`, `--page-background-color`, `--border-color`, `--neutral-light`, `--neutral-lighter`, `--neutral-lightest`, `--primary`, `--secondary-red`, `--severity-warning`, `--grid-header-bg`, `--font-family`, `--font-size-base`.
- **Never invent a component.** Use `obs-*` elements only. No raw `<input>`, `<button>` or `<select>` anywhere — conformance counts these as "raw controls" and the score must stay at 0.
- **Only `augmentSideMenu.js` may touch a shadow root.** No other file pierces shadow DOM.
- **Public icon is `lockOpen`. Private icon is `lockAlt`.** Never `unlockAlt` — gap G3 records that it draws an undo arrow despite the name.
- **Custom-category marker icon is `cog`** (an agreed placeholder standing in for a wrench, which the DS does not ship).
- **Force-delete warning icon is `exclamationTriangle`.**
- **Do not guess an icon name.** There is no published icon inventory — `components/registry/icon.json` is prose about the component, not a list of glyphs, and it does not mention `trash` or `timesCircle` even though both render. This is gap G14. Every icon name in this plan was verified by mounting an `obs-icon` in a real browser and checking that its shadow root contains an SVG with shapes:
  - **Render correctly:** `lockOpen`, `lockOpenAlt`, `lockAltOpen`, `unlock`, `lockAlt`, `globe`, `cog`, `settings`, `tag`, `pencil`, `star`, `plusCircle`, `user`, `users`, `exclamationTriangle`, `exclamationCircle`, `timesCircle`, `infoCircle`, `trash`, `alert`.
  - **Do not exist** (render as a placeholder): `wrench`, `tool`, `lock`, `padlock`, `sliders`, `bookmark`, `userCog`, `edit`, `puzzle`, `layers`, `folder`, `folderPlus`, `warning`, `alertTriangle`.
- **DS events deliver their value in `event.detail` as an ARRAY** — always unwrap via the existing `detailValue` helper pattern.
- **Object-valued props must be assigned AFTER the element is inserted into the DOM.** Setting `.options` / `.value` on a not-yet-upgraded custom element leaves own-properties that shadow the element's accessors. This already caused a defect (`obs-select` rendering raw keys).
- **`obs-select` options are `{ value, text }`** — not `{ key, text }`. The element resolves display as `text ?? value` and matches selection on `.value`.
- Node 22.22.2+, 24.15+ or 26+. Run `npm test` from `observeops-app/`.
- Commit after every task. The repo is initialised; `HEAD` is the approved spec commit.

---

### Task 1: Store owns reports

**Files:**
- Modify: `src/report-categories/store.js`
- Test: `src/report-categories/store.test.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `createStore(categories | { categories, reports })`
  - `getReports() -> Report[]`
  - `getReportsByCategory(categoryId) -> Report[]`
  - `countReportsInCategory(categoryId) -> number`
  - `moveReportsAndDeleteCategory(categoryId, assignments) -> void` where `assignments` is `{ [reportId]: destCategoryId }`
  - `deleteCategoryWithReports(categoryId) -> void`
  - `deleteCategory(categoryId)` now also throws when the category still holds reports.
  - A `Report` is `{ id, category, title, ...rest }`. The store never inspects fields beyond `id` and `category`.

- [ ] **Step 1: Write the failing tests**

Append to `src/report-categories/store.test.js`:

```js
const reportSeed = [
  { id: 'r1', category: 'inventory', title: 'Switch Inventory' },
  { id: 'r2', category: 'inventory', title: 'Firmware Compliance' },
  { id: 'r3', category: 'config', title: '3rd August Training' },
]

const withReports = () => createStore({ categories: seed, reports: reportSeed })

describe('createStore — reports', () => {
  it('accepts the legacy bare-array form and reports no reports', () => {
    const store = createStore(seed)
    expect(store.getReports()).toEqual([])
    expect(store.countReportsInCategory('inventory')).toBe(0)
  })

  it('returns copies of reports, not the seeded objects', () => {
    const store = withReports()
    expect(store.getReports()).toEqual(reportSeed)
    expect(store.getReports()).not.toBe(reportSeed)
    expect(store.getReports()[0]).not.toBe(reportSeed[0])
  })

  it('lists and counts the reports in a category', () => {
    const store = withReports()
    expect(store.getReportsByCategory('inventory').map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(store.countReportsInCategory('inventory')).toBe(2)
    expect(store.countReportsInCategory('all-reports')).toBe(0)
  })

  it('refuses a plain delete while the category still holds reports', () => {
    const store = withReports()
    expect(() => store.deleteCategory('inventory')).toThrow(
      'Category still holds 2 report(s): inventory'
    )
    expect(store.getCategory('inventory')).toBeDefined()
  })

  it('allows a plain delete once the category is empty', () => {
    const store = createStore({ categories: seed, reports: [] })
    store.deleteCategory('inventory')
    expect(store.getCategory('inventory')).toBeUndefined()
  })
})

describe('moveReportsAndDeleteCategory', () => {
  it('moves every report then deletes the category, notifying once', () => {
    const store = withReports()
    const listener = vi.fn()
    store.subscribe(listener)

    store.moveReportsAndDeleteCategory('inventory', { r1: 'config', r2: 'config' })

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getReportsByCategory('config').map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('preserves every other field on a moved report', () => {
    const store = createStore({
      categories: seed,
      reports: [{ id: 'r1', category: 'inventory', title: 'Switch Inventory', favorite: true, schedule: true }],
    })
    store.moveReportsAndDeleteCategory('inventory', { r1: 'all-reports' })
    const moved = store.getReports()[0]
    expect(moved).toEqual({ id: 'r1', category: 'all-reports', title: 'Switch Inventory', favorite: true, schedule: true })
  })

  it('throws and changes nothing when a report has no destination', () => {
    const store = withReports()
    expect(() => store.moveReportsAndDeleteCategory('inventory', { r1: 'config' })).toThrow(
      'No destination for report(s): r2'
    )
    expect(store.getCategory('inventory')).toBeDefined()
    expect(store.getReportsByCategory('inventory')).toHaveLength(2)
  })

  it('throws when a destination is the category being deleted', () => {
    const store = withReports()
    expect(() => store.moveReportsAndDeleteCategory('inventory', { r1: 'inventory', r2: 'config' })).toThrow(
      'Cannot move report r1 into the category being deleted'
    )
  })

  it('throws when a destination does not exist', () => {
    const store = withReports()
    expect(() => store.moveReportsAndDeleteCategory('inventory', { r1: 'nope', r2: 'config' })).toThrow(
      'Unknown category: nope'
    )
  })

  it('refuses to move out of a builtin category', () => {
    const store = createStore({
      categories: seed,
      reports: [{ id: 'r9', category: 'all-reports', title: 'X' }],
    })
    expect(() => store.moveReportsAndDeleteCategory('all-reports', { r9: 'inventory' })).toThrow(
      'Cannot delete a builtin category: all-reports'
    )
  })
})

describe('deleteCategoryWithReports', () => {
  it('removes the category and exactly its own reports, notifying once', () => {
    const store = withReports()
    const listener = vi.fn()
    store.subscribe(listener)

    store.deleteCategoryWithReports('inventory')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getReports().map((r) => r.id)).toEqual(['r3'])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('refuses to force-delete a builtin category', () => {
    const store = withReports()
    expect(() => store.deleteCategoryWithReports('all-reports')).toThrow(
      'Cannot delete a builtin category: all-reports'
    )
  })

  it('throws on an unknown category', () => {
    const store = withReports()
    expect(() => store.deleteCategoryWithReports('missing')).toThrow('Unknown category: missing')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- store`
Expected: FAIL — `store.getReports is not a function`.

- [ ] **Step 3: Implement**

Replace the top of `src/report-categories/store.js` (the `createStore` signature and `categories` init) and add the new functions. The complete new file:

```js
// The store owns BOTH categories and reports, because the invariant this module protects —
// no report points at a category that no longer exists — spans the two. Keeping reports in the
// host page would put that rule in a file that cannot be tested without a DOM.
//
// Accepts either the legacy bare category array or { categories, reports }, so the original
// callers and tests keep working unchanged.
export function createStore(initial) {
  const isBareArray = Array.isArray(initial)
  let categories = (isBareArray ? initial : initial.categories).map((c) => ({
    ...c,
    sharedWith: [...c.sharedWith],
  }))
  let reports = (isBareArray ? [] : (initial.reports ?? [])).map((r) => ({ ...r }))
  const listeners = new Set()

  function notify() {
    const snapshot = getCategories()
    listeners.forEach((listener) => listener(snapshot))
  }

  function getCategories() {
    return categories.map((c) => ({ ...c, sharedWith: [...c.sharedWith] }))
  }

  function getCategory(id) {
    const found = categories.find((c) => c.id === id)
    return found ? { ...found, sharedWith: [...found.sharedWith] } : undefined
  }

  function getReports() {
    return reports.map((r) => ({ ...r }))
  }

  function getReportsByCategory(categoryId) {
    return reports.filter((r) => r.category === categoryId).map((r) => ({ ...r }))
  }

  function countReportsInCategory(categoryId) {
    return reports.reduce((n, r) => (r.category === categoryId ? n + 1 : n), 0)
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function addCategory({ name, visibility, sharedWith }) {
    const category = { id: generateId(), name, type: 'custom', visibility, sharedWith: [...sharedWith] }
    categories = [...categories, category]
    notify()
    return { ...category, sharedWith: [...category.sharedWith] }
  }

  function updateVisibility(id, { visibility, sharedWith }) {
    const index = categories.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Unknown category: ${id}`)
    categories[index] = { ...categories[index], visibility, sharedWith: [...sharedWith] }
    notify()
  }

  /** Throws unless the category exists and is deletable. Returns it. */
  function assertDeletable(id) {
    const target = categories.find((c) => c.id === id)
    if (!target) throw new Error(`Unknown category: ${id}`)
    if (target.type === 'builtin') throw new Error(`Cannot delete a builtin category: ${id}`)
    return target
  }

  function removeCategory(id) {
    categories = categories.filter((c) => c.id !== id)
  }

  function deleteCategory(id) {
    assertDeletable(id)
    // Guarded so no caller can orphan a report by reaching for the simplest method. The two
    // explicit paths below are the only ways to delete a category that still holds reports.
    const held = countReportsInCategory(id)
    if (held > 0) throw new Error(`Category still holds ${held} report(s): ${id}`)
    removeCategory(id)
    notify()
  }

  /**
   * Reassign every report out of a category, then delete it. All-or-nothing: it validates the
   * whole assignment map before mutating anything, so a rejected call leaves the store untouched.
   * @param {string} id
   * @param {Record<string,string>} assignments  reportId -> destination categoryId
   */
  function moveReportsAndDeleteCategory(id, assignments = {}) {
    assertDeletable(id)

    const held = reports.filter((r) => r.category === id)
    const missing = held.filter((r) => !assignments[r.id]).map((r) => r.id)
    if (missing.length) throw new Error(`No destination for report(s): ${missing.join(', ')}`)

    for (const report of held) {
      const destination = assignments[report.id]
      if (destination === id) throw new Error(`Cannot move report ${report.id} into the category being deleted`)
      if (!categories.some((c) => c.id === destination)) throw new Error(`Unknown category: ${destination}`)
    }

    reports = reports.map((r) => (r.category === id ? { ...r, category: assignments[r.id] } : r))
    removeCategory(id)
    notify()
  }

  /** Delete a category AND every report inside it. The force path. */
  function deleteCategoryWithReports(id) {
    assertDeletable(id)
    reports = reports.filter((r) => r.category !== id)
    removeCategory(id)
    notify()
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return {
    getCategories,
    getCategory,
    addCategory,
    updateVisibility,
    deleteCategory,
    getReports,
    getReportsByCategory,
    countReportsInCategory,
    moveReportsAndDeleteCategory,
    deleteCategoryWithReports,
    subscribe,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- store`
Expected: PASS — the 8 original tests plus 15 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/report-categories/store.js src/report-categories/store.test.js
git commit -m "feat(store): own reports and add the two explicit category-delete paths"
```

---

### Task 2: Padlock icons, `title` on reports, and the new seed data

**Files:**
- Modify: `src/report-categories/main.js`

**Interfaces:**
- Consumes: `createStore({ categories, reports })` from Task 1.
- Produces:
  - Every report object now carries a plain `title` string alongside the DS-shaped `name` link object.
  - `toMenuItems` maps `visibility === 'public'` to `lockOpen` and `private` to `lockAlt`.
  - The store is constructed with both categories and reports; `rowsFor` reads `store.getReports()`.

- [ ] **Step 1: Add `title` to the report factory**

In `src/report-categories/main.js`, modify the `report` factory to carry a plain title. The DS-shaped `name` object is what `obs-table`'s `type: 'link'` cell needs; `title` is the plain string every other consumer (the reassignment dialog) reads.

```js
const report = (id, name, category, description, type, reportType, on = false, favorite = false) => ({
  id,
  category,
  description,
  type,
  reportType,
  schedule: on,
  favorite,
  // The plain name. `name` below is the DS link-cell shape and is awkward to read from anywhere
  // that is not obs-table, so keep the string itself available.
  title: name,
  name: { text: name, icon: favorite ? 'filledStar' : 'star', href: '#' },
  download: { icon: 'download', variant: 'transparent' },
})
```

- [ ] **Step 2: Replace the seed categories**

Replace the `seedCategories` array. `builtin` and the inline custom objects stay as they are; only the composition changes. Note `capacity-planning` is Private, so it needs a non-empty `sharedWith` to satisfy the drawer's existing validation rule.

```js
const custom = (id, name, visibility = 'public', sharedWith = []) => ({
  id,
  name,
  type: 'custom',
  visibility,
  sharedWith,
})

const seedCategories = [
  builtin('all-reports', 'All Reports'),
  builtin('config', 'Config'),
  custom('windows', 'Windows', 'public'),
  custom('inventory', 'Inventory', 'private', [{ type: 'user', id: 'u1' }]),
  builtin('flow-reports', 'Flow Reports', 'private', [{ type: 'profile', id: 'p1' }]),
  custom('wireless', 'Wireless', 'private', [{ type: 'user', id: 'u2' }]),
  custom('wan-link', 'WAN Link', 'public'),
  // Deliberately holds no reports, so the "delete an empty category" path is reachable in the app.
  custom('capacity-planning', 'Capacity Planning', 'private', [{ type: 'profile', id: 'p2' }]),
  builtin('network', 'Network', 'private', [{ type: 'profile', id: 'p2' }]),
  builtin('alert', 'Alert'),
  builtin('availability', 'Availability', 'private', [{ type: 'user', id: 'u3' }]),
  builtin('performance', 'Performance'),
  builtin('virtualization', 'Virtualization'),
  builtin('server', 'Server', 'private', [{ type: 'user', id: 'u1' }]),
  builtin('service-check', 'Service Check'),
]
```

- [ ] **Step 3: Move reports into the store and read them back from it**

Replace the store construction and `rowsFor`:

```js
const store = createStore({ categories: seedCategories, reports })
```

```js
/** Which reports belong to a rail selection. Reads the store, so a move or delete re-renders. */
function rowsFor(id) {
  const all = store.getReports()
  if (id === FAVORITES_ID) return all.filter((r) => r.favorite)
  if (id === 'all-reports') return all
  return all.filter((r) => r.category === id)
}
```

The `cellaction` handler currently mutates the module-level `reports` array in place. Leave that array as the seed source but have the handler mutate the store's copy instead — replace the handler body's lookup:

```js
table.addEventListener('cellaction', (event) => {
  const action = detailValue(event)
  if (!action) return
  // The store holds the live rows now; mutate the seed array so the change survives a re-render,
  // since the store hands out copies.
  const row = reports.find((r) => r.id === action.id)
  if (!row) return

  if (action.key === 'schedule') row.schedule = !row.schedule

  if (action.key === 'name' && action.part === 'icon') {
    row.favorite = !row.favorite
    row.name = { ...row.name, icon: row.favorite ? 'filledStar' : 'star' }
  }

  render(store.getCategories())
})
```

**Important:** because `rowsFor` now reads `store.getReports()`, the seed-array mutation above would be invisible. Change the handler to mutate through the store instead by adding a small setter. Add to `store.js` (and a test in `store.test.js`):

```js
  /** Replace one report's mutable display state in place. Used by the grid's typed cells. */
  function updateReport(id, patch) {
    const index = reports.findIndex((r) => r.id === id)
    if (index === -1) throw new Error(`Unknown report: ${id}`)
    reports[index] = { ...reports[index], ...patch }
    notify()
  }
```

Export `updateReport` from the returned object, and rewrite the handler:

```js
table.addEventListener('cellaction', (event) => {
  const action = detailValue(event)
  if (!action) return
  const row = store.getReports().find((r) => r.id === action.id)
  if (!row) return

  if (action.key === 'schedule') {
    store.updateReport(row.id, { schedule: !row.schedule })
  }

  // The name cell holds two controls: the ★ favourites, the text opens the report. `part` tells
  // them apart — added in elements@0.1.159 (G15).
  if (action.key === 'name' && action.part === 'icon') {
    const favorite = !row.favorite
    store.updateReport(row.id, { favorite, name: { ...row.name, icon: favorite ? 'filledStar' : 'star' } })
  }
})
```

`store.updateReport` notifies, which re-renders, so the explicit `render(...)` call at the end of the handler is removed.

Add this test to `store.test.js`:

```js
describe('updateReport', () => {
  it('patches a report and notifies', () => {
    const store = withReports()
    const listener = vi.fn()
    store.subscribe(listener)
    store.updateReport('r1', { favorite: true })
    expect(store.getReports().find((r) => r.id === 'r1').favorite).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('throws on an unknown report', () => {
    expect(() => withReports().updateReport('nope', {})).toThrow('Unknown report: nope')
  })
})
```

- [ ] **Step 4: Swap the visibility icons**

In `toMenuItems`, replace the icon expression:

```js
    ...categories.map((c) => ({
      label: c.name,
      // Paired padlocks: open = Public, closed = Private. NOT `unlockAlt`, which draws an undo
      // arrow despite its name (gap G3).
      icon: c.visibility === 'public' ? 'lockOpen' : 'lockAlt',
      edit: true,
    })),
```

- [ ] **Step 5: Verify**

Run: `npm test`
Expected: PASS — all existing tests plus the two new `updateReport` tests.

Then run the app and confirm by eye that the rail shows open padlocks on Config / Windows / WAN Link / Alert / Performance / Virtualization / Service Check / All Reports, closed padlocks on Inventory / Flow Reports / Wireless / Capacity Planning / Network / Availability / Server, and that Capacity Planning appears with no reports.

```bash
npm run dev
```

- [ ] **Step 6: Commit**

```bash
git add src/report-categories/main.js src/report-categories/store.js src/report-categories/store.test.js
git commit -m "feat: paired padlock visibility icons and the agreed category seed data"
```

---

### Task 3: Custom-category marker on hover

**Files:**
- Modify: `src/report-categories/augmentSideMenu.js`
- Test: `src/report-categories/augmentSideMenu.test.js`

**Interfaces:**
- Consumes: `augmentCategoryRows({ root, categories, onEdit, iconSize })` as it exists.
- Produces: same signature. Each custom category's row gains one `<obs-icon class="rbac-type-marker" name="cog">` before the pencil. Default rows gain nothing.

- [ ] **Step 1: Write the failing tests**

Add to `src/report-categories/augmentSideMenu.test.js`:

```js
describe('custom-category marker', () => {
  it('marks a custom category row', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    const marker = rowFor(root, 'Inventory').querySelector('.rbac-type-marker')
    expect(marker).not.toBeNull()
    expect(marker.getAttribute('name')).toBe('cog')
  })

  it('leaves a default category row unmarked', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    expect(rowFor(root, 'All Reports').querySelector('.rbac-type-marker')).toBeNull()
  })

  it('hides the marker from assistive tech and keeps it unfocusable', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    const marker = rowFor(root, 'Inventory').querySelector('.rbac-type-marker')
    expect(marker.getAttribute('aria-hidden')).toBe('true')
    expect(marker.hasAttribute('tabindex')).toBe(false)
    expect(marker.getAttribute('role')).toBeNull()
  })

  it('places the marker before the edit pencil', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    const row = rowFor(root, 'Inventory')
    const children = [...row.children]
    expect(children.indexOf(row.querySelector('.rbac-type-marker'))).toBeLessThan(
      children.indexOf(row.querySelector('.pencil'))
    )
  })

  it('reveals the marker on hover only, like the pencil', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    const css = root.querySelector('style[data-role="rbac-augment"]').textContent
    expect(css).toMatch(/\.rbac-type-marker \{[^}]*visibility: hidden/)
    expect(css).toMatch(/\.row:hover \.rbac-type-marker/)
  })

  it('does not add a second marker when re-run over the same rows', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    augmentCategoryRows({ root, categories })
    expect(rowFor(root, 'Inventory').querySelectorAll('.rbac-type-marker')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- augmentSideMenu`
Expected: FAIL — `expect(received).not.toBeNull()` on the first test.

- [ ] **Step 3: Implement**

In `src/report-categories/augmentSideMenu.js`, extend `AUGMENT_CSS` by adding these rules before the closing backtick:

```css
  /* The custom/default marker. Decorative only — it states a fact about the row, it does not act,
     so it carries no role and no tabindex (adding those would repeat gap G22's mistake). Hidden
     until hover, matching the pencil's behaviour. */
  .rbac-type-marker {
    flex-shrink: 0;
    visibility: hidden;
    color: var(--neutral-light);
  }
  .row:hover .rbac-type-marker {
    visibility: visible;
  }
```

Then inside the `for (const row of ...)` loop in `augmentCategoryRows`, after the `indicator` block and before the `pencil` block:

```js
    // Mark custom categories so a user can tell them from the built-in ones without opening the
    // drawer. Default categories get nothing, which is the distinction.
    if (category.type === 'custom' && !row.querySelector('.rbac-type-marker')) {
      const marker = document.createElement('obs-icon')
      marker.className = 'rbac-type-marker'
      marker.setAttribute('name', 'cog')
      marker.setAttribute('size', String(iconSize))
      marker.setAttribute('aria-hidden', 'true')
      const pencil = row.querySelector('.pencil')
      if (pencil) row.insertBefore(marker, pencil)
      else row.appendChild(marker)
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- augmentSideMenu`
Expected: PASS — 13 original tests plus 6 new.

- [ ] **Step 5: Commit**

```bash
git add src/report-categories/augmentSideMenu.js src/report-categories/augmentSideMenu.test.js
git commit -m "feat(rail): mark custom categories with a hover-only icon"
```

---

### Task 4: Rewrite the confirm dialog

**Files:**
- Modify: `src/report-categories/deleteConfirmDialog.js`
- Modify: `src/report-categories/deleteConfirmDialog.css`
- Test: `src/report-categories/deleteConfirmDialog.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `renderDeleteConfirmDialog({ categoryName, onConfirm, onCancel }) -> HTMLElement` — an `obs-modal variant="confirm"` with **no title**, a trash icon, the question as its body, and **No / Yes** buttons.

- [ ] **Step 1: Rewrite the tests**

Replace the whole of `src/report-categories/deleteConfirmDialog.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { renderDeleteConfirmDialog } from './deleteConfirmDialog.js'

const build = (overrides = {}) =>
  renderDeleteConfirmDialog({ categoryName: 'Inventory', onConfirm: vi.fn(), onCancel: vi.fn(), ...overrides })

describe('renderDeleteConfirmDialog', () => {
  it('asks the question naming the category, with no separate heading', () => {
    const dialog = build()
    expect(dialog.querySelector('[data-role="delete-confirm-message"]').textContent).toBe(
      'Are you sure you want to delete Inventory Category?'
    )
    expect(dialog.getAttribute('title')).toBe('')
  })

  it('offers No and Yes', () => {
    const dialog = build()
    expect(dialog.getAttribute('cancel-text')).toBe('No')
    expect(dialog.getAttribute('confirm-text')).toBe('Yes')
  })

  it('marks the action destructive and uses the trash icon', () => {
    const dialog = build()
    expect(dialog.getAttribute('confirm-variant')).toBe('error')
    expect(dialog.getAttribute('icon')).toBe('trash')
  })

  it('is an open obs-modal using the confirm variant', () => {
    const dialog = build()
    expect(dialog.tagName.toLowerCase()).toBe('obs-modal')
    expect(dialog.getAttribute('variant')).toBe('confirm')
    expect(dialog.hasAttribute('open')).toBe(true)
  })

  it('calls onConfirm when the modal confirms', () => {
    const onConfirm = vi.fn()
    build({ onConfirm }).dispatchEvent(new CustomEvent('confirm'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onCancel when the modal cancels', () => {
    const onCancel = vi.fn()
    build({ onCancel }).dispatchEvent(new CustomEvent('cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('treats a dismiss (Escape, close) as a cancel', () => {
    const onCancel = vi.fn()
    build({ onCancel }).dispatchEvent(new CustomEvent('close'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not throw when handlers are omitted', () => {
    const dialog = renderDeleteConfirmDialog({ categoryName: 'Inventory' })
    expect(() => {
      dialog.dispatchEvent(new CustomEvent('confirm'))
      dialog.dispatchEvent(new CustomEvent('cancel'))
    }).not.toThrow()
  })

  it('carries the name verbatim, including quotes', () => {
    const dialog = renderDeleteConfirmDialog({ categoryName: `Ravi's "Reports"` })
    expect(dialog.querySelector('[data-role="delete-confirm-message"]').textContent).toBe(
      `Are you sure you want to delete Ravi's "Reports" Category?`
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- deleteConfirmDialog`
Expected: FAIL — the message still reads "This can't be undone."

- [ ] **Step 3: Implement**

Replace `src/report-categories/deleteConfirmDialog.js`:

```js
// obs-modal ships a purpose-built `confirm` variant (icon + message + Cancel/action footer), so
// this is configuration rather than a hand-composed modal.
//
// The variant renders its footer inside the shadow root and reports back via `confirm` / `cancel`
// events — there are no light-DOM buttons to attach data-role hooks to.
//
// NOTE ON THE BUTTON LABELS. The DS's own guidance is that a confirm action should name its verb
// rather than say Yes/OK. This dialog deliberately says No/Yes because the product's confirm step
// is specified that way, and the destructive verb is named a moment later on the force-delete
// step. The deviation is intentional and recorded in the design spec.

export function renderDeleteConfirmDialog({ categoryName, onConfirm, onCancel } = {}) {
  const dialog = document.createElement('obs-modal')
  dialog.setAttribute('data-role', 'delete-confirm-dialog')
  dialog.setAttribute('open', '')
  dialog.setAttribute('variant', 'confirm')
  // No heading: the question IS the content, per the product's confirm step.
  dialog.setAttribute('title', '')
  dialog.setAttribute('icon', 'trash')
  dialog.setAttribute('confirm-text', 'Yes')
  dialog.setAttribute('cancel-text', 'No')
  dialog.setAttribute('confirm-variant', 'error')
  dialog.setAttribute('width', '450')

  const message = document.createElement('p')
  message.setAttribute('data-role', 'delete-confirm-message')
  message.className = 'delete-confirm-dialog__message'
  message.textContent = `Are you sure you want to delete ${categoryName} Category?`

  dialog.appendChild(message)

  dialog.addEventListener('confirm', () => onConfirm?.())
  dialog.addEventListener('cancel', () => onCancel?.())
  // The modal has no × and no backdrop-close, but Escape still dismisses it — treat that as a
  // cancel so the host always gets told to tear the dialog down.
  dialog.addEventListener('close', () => onCancel?.())

  return dialog
}
```

In `src/report-categories/deleteConfirmDialog.css`, delete the now-unused `.delete-confirm-dialog__title` rule and make the message the primary text colour, since it is no longer secondary to a heading:

```css
/* Colours are var(--token), resolved per the reference doc. The dialog chrome — backdrop, centring,
   icon, footer — belongs to obs-modal variant="confirm"; only its content is styled here. */

.delete-confirm-dialog__message {
  margin: 0;
  color: var(--page-text-color);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- deleteConfirmDialog`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/report-categories/deleteConfirmDialog.js src/report-categories/deleteConfirmDialog.css src/report-categories/deleteConfirmDialog.test.js
git commit -m "feat(delete): restate the confirm step as a No/Yes question"
```

---

### Task 5: The reassign-reports dialog

**Files:**
- Create: `src/report-categories/reassignReportsDialog.js`
- Create: `src/report-categories/reassignReportsDialog.css`
- Test: `src/report-categories/reassignReportsDialog.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks — it is a pure render function.
- Produces:
  ```js
  renderReassignReportsDialog({
    categoryName,        // string, for the heading
    reports,             // [{ id, name }]  — plain display names
    categories,          // [{ id, name }]  — selectable destinations, already filtered
    onCancel,            // () => void
    onMoveAndDelete,     // (assignments: Record<reportId, categoryId>) => void
    onProceedAnyway,     // () => void
  }) -> HTMLElement
  ```
  Query hooks: `[data-role="reassign-dialog"]`, `[data-role="reassign-search"]`, `[data-role="reassign-summary-error"]`, `[data-role="reassign-row"]` (each carries `data-report-id`), `[data-role="reassign-select"]`, `[data-role="reassign-cancel"]`, `[data-role="reassign-move"]`, `[data-role="reassign-force"]`.

- [ ] **Step 1: Write the failing tests**

Create `src/report-categories/reassignReportsDialog.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { renderReassignReportsDialog } from './reassignReportsDialog.js'

const reports = [
  { id: 'r1', name: 'Switch Inventory' },
  { id: 'r2', name: 'Firmware Compliance' },
]

const categories = [
  { id: 'config', name: 'Config' },
  { id: 'network', name: 'Network' },
]

const build = (overrides = {}) =>
  renderReassignReportsDialog({
    categoryName: 'Inventory',
    reports,
    categories,
    onCancel: vi.fn(),
    onMoveAndDelete: vi.fn(),
    onProceedAnyway: vi.fn(),
    ...overrides,
  })

const rows = (el) => [...el.querySelectorAll('[data-role="reassign-row"]')]
const rowFor = (el, id) => rows(el).find((r) => r.dataset.reportId === id)
const selectIn = (row) => row.querySelector('[data-role="reassign-select"]')
const click = (el, role) => el.querySelector(`[data-role="${role}"]`).dispatchEvent(new Event('click', { bubbles: true }))

/** DS selects report through `change` with the value wrapped in an array. */
const choose = (row, value) => {
  const select = selectIn(row)
  select.value = value
  select.dispatchEvent(new CustomEvent('change', { detail: [value] }))
}

describe('renderReassignReportsDialog', () => {
  it('is an open obs-modal that does not close on its backdrop', () => {
    const dialog = build()
    expect(dialog.tagName.toLowerCase()).toBe('obs-modal')
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(dialog.getAttribute('mask-closable')).toBe('false')
  })

  it('renders one row per report, naming each', () => {
    const dialog = build()
    expect(rows(dialog)).toHaveLength(2)
    expect(rowFor(dialog, 'r1').textContent).toContain('Switch Inventory')
    expect(rowFor(dialog, 'r2').textContent).toContain('Firmware Compliance')
  })

  it('offers every supplied category as a destination, using the DS option shape', () => {
    const dialog = build()
    expect(selectIn(rowFor(dialog, 'r1')).options).toEqual([
      { value: 'config', text: 'Config' },
      { value: 'network', text: 'Network' },
    ])
  })

  it('starts with nothing selected and no error showing', () => {
    const dialog = build()
    expect(selectIn(rowFor(dialog, 'r1')).value).toBe('')
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(true)
  })

  it('blocks Move and Delete while any report is unmapped, showing both errors', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })

    choose(rowFor(dialog, 'r1'), 'config')
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).not.toHaveBeenCalled()
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(false)
    expect(selectIn(rowFor(dialog, 'r2')).hasAttribute('error')).toBe(true)
    expect(selectIn(rowFor(dialog, 'r1')).hasAttribute('error')).toBe(false)
  })

  it('clears a row error as soon as that row is given a destination', () => {
    const dialog = build()
    click(dialog, 'reassign-move')
    expect(selectIn(rowFor(dialog, 'r2')).hasAttribute('error')).toBe(true)

    choose(rowFor(dialog, 'r2'), 'network')
    expect(selectIn(rowFor(dialog, 'r2')).hasAttribute('error')).toBe(false)
  })

  it('clears the summary error once every row has a destination', () => {
    const dialog = build()
    click(dialog, 'reassign-move')
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(false)

    choose(rowFor(dialog, 'r1'), 'config')
    choose(rowFor(dialog, 'r2'), 'network')
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(true)
  })

  it('reports the full assignment map when every report is mapped', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })

    choose(rowFor(dialog, 'r1'), 'config')
    choose(rowFor(dialog, 'r2'), 'network')
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).toHaveBeenCalledWith({ r1: 'config', r2: 'network' })
  })

  it('validates rows hidden by the search filter, not just the visible ones', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })

    choose(rowFor(dialog, 'r1'), 'config')
    const search = dialog.querySelector('[data-role="reassign-search"]')
    search.dispatchEvent(new CustomEvent('input', { detail: ['Switch'] }))

    expect(rowFor(dialog, 'r2').hidden).toBe(true)
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).not.toHaveBeenCalled()
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(false)
  })

  it('filters rows by name, case-insensitively', () => {
    const dialog = build()
    const search = dialog.querySelector('[data-role="reassign-search"]')

    search.dispatchEvent(new CustomEvent('input', { detail: ['firmware'] }))
    expect(rowFor(dialog, 'r1').hidden).toBe(true)
    expect(rowFor(dialog, 'r2').hidden).toBe(false)

    search.dispatchEvent(new CustomEvent('input', { detail: [''] }))
    expect(rowFor(dialog, 'r1').hidden).toBe(false)
    expect(rowFor(dialog, 'r2').hidden).toBe(false)
  })

  it('routes Cancel, Proceed Anyway and dismissal to their handlers', () => {
    const onCancel = vi.fn()
    const onProceedAnyway = vi.fn()
    const dialog = build({ onCancel, onProceedAnyway })

    click(dialog, 'reassign-cancel')
    expect(onCancel).toHaveBeenCalled()

    click(dialog, 'reassign-force')
    expect(onProceedAnyway).toHaveBeenCalled()

    dialog.dispatchEvent(new CustomEvent('close'))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('names the doomed category in its title', () => {
    expect(build().getAttribute('title')).toBe("Delete 'Inventory'")
  })

  it('does not throw when handlers are omitted', () => {
    const dialog = renderReassignReportsDialog({ categoryName: 'X', reports, categories })
    expect(() => {
      click(dialog, 'reassign-cancel')
      click(dialog, 'reassign-force')
    }).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- reassignReportsDialog`
Expected: FAIL — `Failed to resolve import "./reassignReportsDialog.js"`.

- [ ] **Step 3: Implement the module**

Create `src/report-categories/reassignReportsDialog.js`:

```js
// The "this category still holds reports" step. Every report in the doomed category is listed with
// a destination picker, so nothing is silently orphaned.
//
// WHY THIS IS NOT AN obs-table. A per-row dropdown cannot live in a DS table cell: obs-table
// reports `slots: []` (no per-cell slot), its column `type` enum has no `select` member, and its
// `editable` mode turns editable columns into obs-inputs — text fields, not selects. So the grid is
// composed here from real DS elements instead. See docs/DS-GAPS.md, the G1 addendum.

/** DS events wrap their value in an array — unwrap, tolerating a bare value. */
function detailValue(event) {
  const { detail } = event
  if (Array.isArray(detail)) return detail[0]
  if (detail !== undefined && detail !== null) return detail
  return event.target?.value
}

function button({ role, label, variant }) {
  const el = document.createElement('obs-button')
  el.setAttribute('data-role', role)
  el.setAttribute('variant', variant)
  el.textContent = label
  return el
}

export function renderReassignReportsDialog({
  categoryName,
  reports = [],
  categories = [],
  onCancel,
  onMoveAndDelete,
  onProceedAnyway,
} = {}) {
  // reportId -> destination categoryId. The single source of truth for what the user has chosen.
  const assignments = Object.create(null)
  /** @type {Map<string, {row: HTMLElement, select: HTMLElement}>} */
  const controls = new Map()

  const dialog = document.createElement('obs-modal')
  dialog.setAttribute('data-role', 'reassign-dialog')
  dialog.setAttribute('open', '')
  dialog.setAttribute('title', `Delete '${categoryName}'`)
  dialog.setAttribute('width', '720')
  dialog.setAttribute('scrollable', '')
  // Match the product default: a destructive decision must not be dismissed by a stray backdrop
  // click. Escape still works and is treated as a cancel.
  dialog.setAttribute('mask-closable', 'false')

  const body = document.createElement('div')
  body.className = 'reassign-dialog'
  dialog.appendChild(body)

  // --- Summary error ----------------------------------------------------
  const summaryError = document.createElement('p')
  summaryError.setAttribute('data-role', 'reassign-summary-error')
  summaryError.className = 'reassign-dialog__error'
  summaryError.textContent = 'New category not selected for all reports.'
  summaryError.hidden = true
  body.appendChild(summaryError)

  // --- Search -----------------------------------------------------------
  const search = document.createElement('obs-input')
  search.setAttribute('data-role', 'reassign-search')
  search.setAttribute('type', 'search')
  search.setAttribute('placeholder', 'Search')
  search.setAttribute('block', '')
  search.addEventListener('input', (event) => applyFilter(String(detailValue(event) ?? '')))
  body.appendChild(search)

  // --- Header -----------------------------------------------------------
  const grid = document.createElement('div')
  grid.className = 'reassign-dialog__grid'
  body.appendChild(grid)

  const header = document.createElement('div')
  header.className = 'reassign-dialog__head'
  for (const title of ['Reports', 'New Category']) {
    const cell = document.createElement('span')
    cell.className = 'reassign-dialog__head-cell'
    cell.textContent = title
    header.appendChild(cell)
  }
  grid.appendChild(header)

  // --- One row per report -----------------------------------------------
  for (const report of reports) {
    const row = document.createElement('div')
    row.setAttribute('data-role', 'reassign-row')
    row.dataset.reportId = report.id
    row.className = 'reassign-dialog__row'

    const name = document.createElement('span')
    name.className = 'reassign-dialog__name'
    name.textContent = report.name
    row.appendChild(name)

    const select = document.createElement('obs-select')
    select.setAttribute('data-role', 'reassign-select')
    select.setAttribute('placeholder', 'Select a category')
    select.setAttribute('block', '')
    select.setAttribute('aria-label', `New category for ${report.name}`)
    select.addEventListener('change', (event) => {
      const next = detailValue(event)
      if (!next) return
      assignments[report.id] = next
      select.removeAttribute('error')
      if (isComplete()) summaryError.hidden = true
    })
    row.appendChild(select)

    grid.appendChild(row)
    controls.set(report.id, { row, select })

    // Object-valued props are assigned only AFTER insertion: setting them on a not-yet-upgraded
    // custom element leaves own-properties that shadow the element's accessors once it upgrades,
    // and the trigger then renders the raw key instead of the option's label.
    // { value, text } is the web element's shape — NOT the catalogue's { key, text }.
    select.options = categories.map((c) => ({ value: c.id, text: c.name }))
    select.value = ''
  }

  /** Every report has a destination — including any hidden by the search filter. */
  const isComplete = () => reports.every((r) => Boolean(assignments[r.id]))

  function applyFilter(term) {
    const needle = term.trim().toLowerCase()
    for (const report of reports) {
      const { row } = controls.get(report.id)
      row.hidden = needle.length > 0 && !report.name.toLowerCase().includes(needle)
    }
  }

  function validate() {
    let ok = true
    for (const report of reports) {
      const { select } = controls.get(report.id)
      if (assignments[report.id]) {
        select.removeAttribute('error')
      } else {
        // Marked even when the row is filtered out of view, so the error is not hidden by a search.
        select.setAttribute('error', '')
        ok = false
      }
    }
    summaryError.hidden = ok
    return ok
  }

  // --- Footer -----------------------------------------------------------
  const footer = document.createElement('div')
  footer.setAttribute('slot', 'footer')
  footer.className = 'reassign-dialog__footer'

  const cancel = button({ role: 'reassign-cancel', label: 'Cancel', variant: 'default' })
  cancel.addEventListener('click', () => onCancel?.())
  footer.appendChild(cancel)

  const spacer = document.createElement('span')
  spacer.className = 'reassign-dialog__spacer'
  footer.appendChild(spacer)

  const force = button({ role: 'reassign-force', label: 'Proceed Anyway', variant: 'error' })
  force.addEventListener('click', () => onProceedAnyway?.())
  footer.appendChild(force)

  const move = button({ role: 'reassign-move', label: 'Move and Delete', variant: 'primary' })
  move.addEventListener('click', () => {
    if (!validate()) return
    onMoveAndDelete?.({ ...assignments })
  })
  footer.appendChild(move)

  // A slotted child must be a direct child of the host.
  dialog.appendChild(footer)

  dialog.addEventListener('close', () => onCancel?.())
  dialog.addEventListener('cancel', () => onCancel?.())

  return dialog
}
```

- [ ] **Step 4: Write the stylesheet**

Create `src/report-categories/reassignReportsDialog.css`:

```css
/* Colours are var(--token) — no hex/rgb/hsl. The modal chrome (backdrop, surface, header, footer
   rail) belongs to obs-modal; only the content is styled here.

   The two-column grid is hand-composed because a dropdown cannot live in an obs-table cell — no
   per-cell slot, no `select` column type, and `editable` yields obs-inputs. See docs/DS-GAPS.md. */

.reassign-dialog {
  display: flex;
  flex-direction: column;
  /* 8px matches obs-toolbar's internal gap; the DS publishes no spacing scale to derive it from
     (gap G21). */
  gap: 12px;
  color: var(--page-text-color);
}

.reassign-dialog__error {
  margin: 0;
  color: var(--secondary-red);
}

.reassign-dialog__grid {
  display: flex;
  flex-direction: column;
}

.reassign-dialog__head,
.reassign-dialog__row {
  display: grid;
  grid-template-columns: 1fr 260px;
  align-items: center;
  gap: 16px;
}

/* Mirrors the DS grid header so this reads as the same kind of surface as the reports table. */
.reassign-dialog__head {
  padding: 10px 12px;
  background: var(--grid-header-bg);
  border-bottom: 1px solid var(--border-color);
}

.reassign-dialog__head-cell {
  font-weight: 500;
  color: var(--neutral-light);
}

.reassign-dialog__row {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}

.reassign-dialog__row[hidden] {
  display: none;
}

.reassign-dialog__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Cancel sits left, the two destructive-ish actions right. The DS modal footer is justify-end with
   no gap, so both the spacer and the gap are ours. */
.reassign-dialog__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.reassign-dialog__spacer {
  flex: 1 1 auto;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- reassignReportsDialog`
Expected: PASS — 14 tests.

- [ ] **Step 6: Commit**

```bash
git add src/report-categories/reassignReportsDialog.js src/report-categories/reassignReportsDialog.css src/report-categories/reassignReportsDialog.test.js
git commit -m "feat(delete): add the reassign-reports step"
```

---

### Task 6: The force-delete dialog

**Files:**
- Create: `src/report-categories/forceDeleteDialog.js`
- Create: `src/report-categories/forceDeleteDialog.css`
- Test: `src/report-categories/forceDeleteDialog.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `renderForceDeleteDialog({ categoryName, onCancel, onConfirm }) -> HTMLElement`. Query hooks: `[data-role="force-delete-dialog"]`, `[data-role="force-delete-warning"]`, `[data-role="force-delete-instruction"]`, `[data-role="force-delete-input"]`, `[data-role="force-delete-cancel"]`, `[data-role="force-delete-confirm"]`.

- [ ] **Step 1: Write the failing tests**

Create `src/report-categories/forceDeleteDialog.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { renderForceDeleteDialog } from './forceDeleteDialog.js'

const build = (overrides = {}) =>
  renderForceDeleteDialog({ categoryName: 'Inventory', onCancel: vi.fn(), onConfirm: vi.fn(), ...overrides })

const input = (el) => el.querySelector('[data-role="force-delete-input"]')
const confirmBtn = (el) => el.querySelector('[data-role="force-delete-confirm"]')
const type = (el, value) => input(el).dispatchEvent(new CustomEvent('input', { detail: [value] }))

describe('renderForceDeleteDialog', () => {
  it('states the consequence', () => {
    const dialog = build()
    expect(dialog.querySelector('[data-role="force-delete-warning"]').textContent).toBe(
      'All reports associated within this category will be permanently deleted. This action cannot be undone.'
    )
  })

  it('instructs the user to type the exact category name', () => {
    const dialog = build()
    expect(dialog.querySelector('[data-role="force-delete-instruction"]').textContent).toBe(
      'To confirm, type the category name Inventory (case-sensitive) below.'
    )
  })

  it('placeholders the input with the category name', () => {
    expect(input(build()).getAttribute('placeholder')).toBe('Inventory')
  })

  it('starts with the confirm button disabled', () => {
    expect(confirmBtn(build()).hasAttribute('disabled')).toBe(true)
  })

  it('keeps the button disabled for a near miss', () => {
    const dialog = build()
    type(dialog, 'Invent')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('keeps the button disabled when only the case differs', () => {
    const dialog = build()
    type(dialog, 'inventory')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('keeps the button disabled when the text is padded with spaces', () => {
    const dialog = build()
    type(dialog, ' Inventory ')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('enables the button on an exact match', () => {
    const dialog = build()
    type(dialog, 'Inventory')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(false)
  })

  it('re-disables the button if the text stops matching', () => {
    const dialog = build()
    type(dialog, 'Inventory')
    type(dialog, 'Inventor')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('reports a confirmation only once the name matches', () => {
    const onConfirm = vi.fn()
    const dialog = build({ onConfirm })

    confirmBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    expect(onConfirm).not.toHaveBeenCalled()

    type(dialog, 'Inventory')
    confirmBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('routes Cancel and dismissal to onCancel', () => {
    const onCancel = vi.fn()
    const dialog = build({ onCancel })

    dialog.querySelector('[data-role="force-delete-cancel"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    dialog.dispatchEvent(new CustomEvent('close'))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('is an open obs-modal that does not close on its backdrop', () => {
    const dialog = build()
    expect(dialog.tagName.toLowerCase()).toBe('obs-modal')
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(dialog.getAttribute('mask-closable')).toBe('false')
  })

  it('does not throw when handlers are omitted', () => {
    const dialog = renderForceDeleteDialog({ categoryName: 'X' })
    expect(() => {
      type(dialog, 'X')
      confirmBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    }).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- forceDeleteDialog`
Expected: FAIL — `Failed to resolve import "./forceDeleteDialog.js"`.

- [ ] **Step 3: Implement the module**

Create `src/report-categories/forceDeleteDialog.js`:

```js
// The last step of the delete flow: destroy the category AND every report in it.
//
// The typed-name gate is the whole point of this dialog — it makes an irreversible, data-losing
// action impossible to trigger by muscle memory. The comparison is exact and case-sensitive, and
// the confirm button stays disabled until it passes.

/** DS events wrap their value in an array — unwrap, tolerating a bare value. */
function detailValue(event) {
  const { detail } = event
  if (Array.isArray(detail)) return detail[0]
  if (detail !== undefined && detail !== null) return detail
  return event.target?.value
}

export function renderForceDeleteDialog({ categoryName, onCancel, onConfirm } = {}) {
  let matches = false

  const dialog = document.createElement('obs-modal')
  dialog.setAttribute('data-role', 'force-delete-dialog')
  dialog.setAttribute('open', '')
  dialog.setAttribute('title', '')
  dialog.setAttribute('width', '520')
  dialog.setAttribute('mask-closable', 'false')

  const body = document.createElement('div')
  body.className = 'force-delete-dialog'
  dialog.appendChild(body)

  const warningRow = document.createElement('div')
  warningRow.className = 'force-delete-dialog__warning-row'
  body.appendChild(warningRow)

  const icon = document.createElement('obs-icon')
  icon.className = 'force-delete-dialog__icon'
  icon.setAttribute('name', 'exclamationTriangle')
  icon.setAttribute('size', '32')
  icon.setAttribute('aria-hidden', 'true')
  warningRow.appendChild(icon)

  const copy = document.createElement('div')
  copy.className = 'force-delete-dialog__copy'
  warningRow.appendChild(copy)

  const warning = document.createElement('p')
  warning.setAttribute('data-role', 'force-delete-warning')
  warning.className = 'force-delete-dialog__warning'
  warning.textContent =
    'All reports associated within this category will be permanently deleted. This action cannot be undone.'
  copy.appendChild(warning)

  const instruction = document.createElement('p')
  instruction.setAttribute('data-role', 'force-delete-instruction')
  instruction.className = 'force-delete-dialog__instruction'
  instruction.textContent = `To confirm, type the category name ${categoryName} (case-sensitive) below.`
  copy.appendChild(instruction)

  const field = document.createElement('obs-input')
  field.setAttribute('data-role', 'force-delete-input')
  field.setAttribute('placeholder', categoryName)
  field.setAttribute('block', '')
  field.setAttribute('aria-label', `Type ${categoryName} to confirm`)
  copy.appendChild(field)

  // --- Footer -----------------------------------------------------------
  const footer = document.createElement('div')
  footer.setAttribute('slot', 'footer')
  footer.className = 'force-delete-dialog__footer'

  const cancel = document.createElement('obs-button')
  cancel.setAttribute('data-role', 'force-delete-cancel')
  cancel.setAttribute('variant', 'default')
  cancel.textContent = 'Cancel'
  cancel.addEventListener('click', () => onCancel?.())
  footer.appendChild(cancel)

  const confirm = document.createElement('obs-button')
  confirm.setAttribute('data-role', 'force-delete-confirm')
  confirm.setAttribute('variant', 'error')
  confirm.setAttribute('disabled', '')
  confirm.textContent = 'Force Delete'
  confirm.addEventListener('click', () => {
    // Guarded as well as disabled: `disabled` is a rendering concern, this is the actual rule.
    if (!matches) return
    onConfirm?.()
  })
  footer.appendChild(confirm)

  dialog.appendChild(footer)

  field.addEventListener('input', (event) => {
    // Exact and case-sensitive, and no trimming — " Inventory " is not the category's name.
    matches = String(detailValue(event) ?? '') === categoryName
    if (matches) confirm.removeAttribute('disabled')
    else confirm.setAttribute('disabled', '')
  })

  dialog.addEventListener('close', () => onCancel?.())
  dialog.addEventListener('cancel', () => onCancel?.())

  return dialog
}
```

- [ ] **Step 4: Write the stylesheet**

Create `src/report-categories/forceDeleteDialog.css`:

```css
/* Colours are var(--token) — no hex/rgb/hsl. obs-modal owns the surface and footer rail; only the
   content is styled here. */

.force-delete-dialog {
  color: var(--page-text-color);
}

.force-delete-dialog__warning-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.force-delete-dialog__icon {
  flex-shrink: 0;
  color: var(--secondary-red);
}

.force-delete-dialog__copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.force-delete-dialog__warning,
.force-delete-dialog__instruction {
  margin: 0;
}

.force-delete-dialog__instruction {
  color: var(--neutral-light);
}

.force-delete-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- forceDeleteDialog`
Expected: PASS — 14 tests.

- [ ] **Step 6: Commit**

```bash
git add src/report-categories/forceDeleteDialog.js src/report-categories/forceDeleteDialog.css src/report-categories/forceDeleteDialog.test.js
git commit -m "feat(delete): add the typed-confirmation force-delete step"
```

---

### Task 7: The flow orchestrator, wired into the host page

**Files:**
- Create: `src/report-categories/deleteCategoryFlow.js`
- Test: `src/report-categories/deleteCategoryFlow.test.js`
- Modify: `src/report-categories/main.js`

**Interfaces:**
- Consumes: `renderDeleteConfirmDialog` (Task 4), `renderReassignReportsDialog` (Task 5), `renderForceDeleteDialog` (Task 6), and the store from Task 1.
- Produces:
  - `destinationsFor(store, excludeId) -> [{id, name}]`
  - `startDeleteCategoryFlow({ category, store, mount, close, onDeleted }) -> void`
    - `mount(element)` shows one dialog, replacing whatever is showing.
    - `close()` tears every dialog down.
    - `onDeleted(categoryId)` fires after a successful delete of any kind.

- [ ] **Step 1: Write the failing tests**

Create `src/report-categories/deleteCategoryFlow.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { startDeleteCategoryFlow, destinationsFor } from './deleteCategoryFlow.js'
import { createStore } from './store.js'

const categories = [
  { id: 'all-reports', name: 'All Reports', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'config', name: 'Config', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'inventory', name: 'Inventory', type: 'custom', visibility: 'public', sharedWith: [] },
  { id: 'empty', name: 'Capacity Planning', type: 'custom', visibility: 'public', sharedWith: [] },
]

const reports = [
  { id: 'r1', category: 'inventory', title: 'Switch Inventory' },
  { id: 'r2', category: 'inventory', title: 'Firmware Compliance' },
  { id: 'r3', category: 'config', title: '3rd August Training' },
]

function harness(categoryId) {
  const store = createStore({ categories, reports })
  const mount = vi.fn()
  const close = vi.fn()
  const onDeleted = vi.fn()
  startDeleteCategoryFlow({ category: store.getCategory(categoryId), store, mount, close, onDeleted })
  const shown = () => mount.mock.calls.at(-1)[0]
  return { store, mount, close, onDeleted, shown }
}

const click = (el, role) => el.querySelector(`[data-role="${role}"]`).dispatchEvent(new Event('click', { bubbles: true }))
const choose = (dialog, reportId, value) => {
  const select = dialog
    .querySelector(`[data-role="reassign-row"][data-report-id="${reportId}"]`)
    .querySelector('[data-role="reassign-select"]')
  select.dispatchEvent(new CustomEvent('change', { detail: [value] }))
}

describe('destinationsFor', () => {
  it('excludes the doomed category and the virtual All Reports view', () => {
    const store = createStore({ categories, reports })
    expect(destinationsFor(store, 'inventory')).toEqual([
      { id: 'config', name: 'Config' },
      { id: 'empty', name: 'Capacity Planning' },
    ])
  })
})

describe('startDeleteCategoryFlow', () => {
  it('opens the confirm dialog first', () => {
    const { shown } = harness('inventory')
    expect(shown().getAttribute('data-role')).toBe('delete-confirm-dialog')
  })

  it('closes and changes nothing when the confirm is declined', () => {
    const { store, shown, close, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('cancel'))
    expect(close).toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(store.getCategory('inventory')).toBeDefined()
  })

  it('deletes an empty category outright, without a reassignment step', () => {
    const { store, shown, close, onDeleted, mount } = harness('empty')
    shown().dispatchEvent(new CustomEvent('confirm'))

    expect(store.getCategory('empty')).toBeUndefined()
    expect(onDeleted).toHaveBeenCalledWith('empty')
    expect(close).toHaveBeenCalled()
    expect(mount).toHaveBeenCalledTimes(1)
  })

  it('opens the reassignment step when the category holds reports', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    expect(shown().getAttribute('data-role')).toBe('reassign-dialog')
    expect(shown().querySelectorAll('[data-role="reassign-row"]')).toHaveLength(2)
  })

  it('moves the reports and deletes the category on Move and Delete', () => {
    const { store, shown, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))

    const reassign = shown()
    choose(reassign, 'r1', 'config')
    choose(reassign, 'r2', 'config')
    click(reassign, 'reassign-move')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getReportsByCategory('config').map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
    expect(onDeleted).toHaveBeenCalledWith('inventory')
  })

  it('does not delete anything while a report is unmapped', () => {
    const { store, shown, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))

    const reassign = shown()
    choose(reassign, 'r1', 'config')
    click(reassign, 'reassign-move')

    expect(store.getCategory('inventory')).toBeDefined()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('advances to the force-delete step on Proceed Anyway', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')
    expect(shown().getAttribute('data-role')).toBe('force-delete-dialog')
  })

  it('force-deletes the category and its reports once the name is typed', () => {
    const { store, shown, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')

    const force = shown()
    force
      .querySelector('[data-role="force-delete-input"]')
      .dispatchEvent(new CustomEvent('input', { detail: ['Inventory'] }))
    click(force, 'force-delete-confirm')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getReports().map((r) => r.id)).toEqual(['r3'])
    expect(onDeleted).toHaveBeenCalledWith('inventory')
  })

  it('cancelling the force step tears the whole flow down', () => {
    const { store, shown, close } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')
    click(shown(), 'force-delete-cancel')

    expect(close).toHaveBeenCalled()
    expect(store.getCategory('inventory')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- deleteCategoryFlow`
Expected: FAIL — `Failed to resolve import "./deleteCategoryFlow.js"`.

- [ ] **Step 3: Implement the flow**

Create `src/report-categories/deleteCategoryFlow.js`:

```js
// The four-state category delete flow:
//
//   1. confirm          "Are you sure you want to delete X Category?"   No / Yes
//   2. branch           no reports -> delete outright; otherwise -> 3
//   3. reassign         one destination per report                     Cancel / Move and Delete /
//                                                                      Proceed Anyway
//   4. force delete     type the category name to destroy it and its reports
//
// It owns the transitions only. Every rule about what may be deleted lives in store.js, and every
// pixel lives in the three dialog modules — so this file stays small enough to read at a glance.
//
// `mount` / `close` are injected rather than reaching for a DOM node, which is what makes the whole
// flow testable without a host page.

import { renderDeleteConfirmDialog } from './deleteConfirmDialog.js'
import { renderReassignReportsDialog } from './reassignReportsDialog.js'
import { renderForceDeleteDialog } from './forceDeleteDialog.js'

/**
 * Categories a report can be moved INTO. Excludes the category being deleted and `all-reports`,
 * which is a virtual view over every report rather than a bucket of its own. Favorites never
 * appears here — it is a pinned pseudo-category and is not in the store at all.
 */
export function destinationsFor(store, excludeId) {
  return store
    .getCategories()
    .filter((c) => c.id !== excludeId && c.id !== 'all-reports')
    .map((c) => ({ id: c.id, name: c.name }))
}

/**
 * @param {object}   options
 * @param {object}   options.category   the category to delete
 * @param {object}   options.store
 * @param {Function} options.mount      (element) => void — show one dialog, replacing any other
 * @param {Function} options.close      () => void — tear every dialog down
 * @param {Function} [options.onDeleted] (categoryId) => void — after any successful delete
 */
export function startDeleteCategoryFlow({ category, store, mount, close, onDeleted } = {}) {
  const cancel = () => close?.()

  const finish = () => {
    close?.()
    onDeleted?.(category.id)
  }

  function openForceDelete() {
    mount(
      renderForceDeleteDialog({
        categoryName: category.name,
        onCancel: cancel,
        onConfirm: () => {
          store.deleteCategoryWithReports(category.id)
          finish()
        },
      })
    )
  }

  function openReassign() {
    mount(
      renderReassignReportsDialog({
        categoryName: category.name,
        reports: store.getReportsByCategory(category.id).map((r) => ({ id: r.id, name: r.title })),
        categories: destinationsFor(store, category.id),
        onCancel: cancel,
        onMoveAndDelete: (assignments) => {
          store.moveReportsAndDeleteCategory(category.id, assignments)
          finish()
        },
        onProceedAnyway: openForceDelete,
      })
    )
  }

  mount(
    renderDeleteConfirmDialog({
      categoryName: category.name,
      onCancel: cancel,
      onConfirm: () => {
        if (store.countReportsInCategory(category.id) === 0) {
          store.deleteCategory(category.id)
          return finish()
        }
        openReassign()
      },
    })
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- deleteCategoryFlow`
Expected: PASS — 10 tests.

- [ ] **Step 5: Wire the flow into the host page**

In `src/report-categories/main.js`, add the imports beside the existing dialog imports:

```js
import { startDeleteCategoryFlow } from './deleteCategoryFlow.js'
import './reassignReportsDialog.css'
import './forceDeleteDialog.css'
```

The `renderDeleteConfirmDialog` import and the `openDeleteDialog` function are now superseded. Delete both — remove the `import { renderDeleteConfirmDialog } from './deleteConfirmDialog.js'` line and the whole `openDeleteDialog` function — and replace the call site inside `openPanel`:

```js
    onDelete:
      mode === 'edit-custom'
        ? () => {
            closePanel()
            startDeleteCategoryFlow({
              category,
              store,
              mount: (dialog) => dialogRoot.replaceChildren(dialog),
              close: closeDialog,
              onDeleted: (deletedId) => {
                // If the deleted category was the active filter, fall back to All Reports (spec).
                if (activeId === deletedId) setActive('all-reports')
              },
            })
          }
        : undefined,
```

Keep `import './deleteConfirmDialog.css'` — the flow still renders that dialog.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — every file.

- [ ] **Step 7: Commit**

```bash
git add src/report-categories/deleteCategoryFlow.js src/report-categories/deleteCategoryFlow.test.js src/report-categories/main.js
git commit -m "feat(delete): compose the four-state flow and wire it into the screen"
```

---

### Task 8: Verify by rendering, then update the docs

This project's standing rule is that **a claim is verified by rendering, never by reading** — four
past defects were invisible to jsdom and to static checks. No part of this feature is done until it
has been driven in a real browser.

**Files:**
- Modify: `docs/DS-GAPS.md`
- Modify: `docs/PROJECT-CONTEXT.md`
- Modify: `HANDOFF.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Build and check conformance**

```bash
npm run build
export CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs ./report-categories.html
```

Expected: the build succeeds and conformance still reports **100/100** with **0 raw controls**. If
the raw-control count is above zero, the hand-composed reassignment grid has introduced a bare
element — find it and replace it with the `obs-*` equivalent.

- [ ] **Step 2: Drive every state in a real browser**

Start the dev server, then drive the screen with headless Chrome and screenshot each state. Confirm
by eye, not by assertion:

1. **The rail** — open padlocks on the public categories, closed on the private ones, at a size that
   reads as a quiet state indicator rather than an action.
2. **Hover a custom row** (Inventory, Windows, Wireless, WAN Link, Capacity Planning) — the cog
   marker appears beside the pencil. Hover a default row (Config, Network) — no marker.
3. **Delete Capacity Planning** — confirm dialog shows the trash icon, no heading, the question, and
   No/Yes. Yes removes it immediately with no second step.
4. **Delete Inventory** — the reassignment modal lists both its reports, each dropdown offers every
   category except Inventory and All Reports, and the footer shows all three buttons.
5. **Move and Delete with one row unmapped** — the summary error appears AND the unmapped row's
   select is marked. Filter the list with the search box first and confirm a hidden unmapped row
   still blocks the action.
6. **Move and Delete fully mapped** — the category disappears and its reports appear under their new
   category in the grid.
7. **Proceed Anyway** — the force dialog appears; Force Delete is greyed until the name is typed
   exactly; a lowercase or padded attempt leaves it greyed; the exact name enables it; confirming
   removes the category and its reports from the grid.

Check `console --errors` after each. The only acceptable message is the pre-existing
`/favicon.ico` 404.

- [ ] **Step 3: Record the new DS finding**

Add to `docs/DS-GAPS.md`, in the findings body, and add a row to the status table at the top:

```markdown
### New finding — G23: a dropdown cannot go in a table cell (G1, second instance)

`obs-table` gained `switch` / `icon` / `link` / `button` cell types in 0.1.146, which closed the
original G1. Building the "reassign these reports before deleting the category" screen hit the same
wall again, for a **select**:

- `elements-api.json` reports `obs-table` `slots: []` — there is no per-cell slot.
- The column `type` enum has no `select` member.
- `editable` looks like the way in, but the registry is explicit that editable columns become
  **`obs-input`s** — text fields. There is no editable enum/select cell.

So the two-column *Reports · New Category* grid — a per-row destination picker, which is the whole
content of the dialog — **cannot be an `obs-table`**. It was hand-composed from `obs-select` plus a
CSS grid, reproducing the header style with `--grid-header-bg` by hand.

**Ask:** add a `select` cell type taking `{ options, value }` and reporting through `cellaction`
(the same payload the other typed cells already use), or make `editable` honour a per-column
`control: 'select'`. Either closes this without a new mechanism — `cellaction` already carries
`{id, key, type, value}` and would need nothing added.

*Worth noting the shape of this: G1 was closed for four specific cell types, and the fifth need hit
the same limit. A per-column render hook would have closed the whole class at once.*
```

- [ ] **Step 4: Refresh the stale project docs**

`docs/PROJECT-CONTEXT.md` has drifted and is the document written for the DS team to read cold. Correct it in the same pass:

- "75 tests across 6 files" → the real number from `npm test`, across the real file count.
- The DS versions `0.1.141` / `0.1.0` / `0.1.180` → `0.1.159` / `0.1.4` / `0.1.197`.
- `vite.config.js  two entry points + the logos alias (G12 workaround)` → the alias was deleted when G12 was fixed; it is now just the two entry points.
- "the gap report — 14 findings" → the real count including G23.
- The architecture listing and the "Known deviations" table need the new dialogs and the padlock
  decision (the `globe` deviation row is now obsolete).

Update `CLAUDE.md`'s structure block and test count, and rewrite `HANDOFF.md` for this session:
what was built, that the `globe` vs `lockOpen` question is now closed in favour of `lockOpen`, and
which of its previous "next steps" remain open (G8/G14 fresh-session verification, wiring search and
notifications, the horizontal inset decision).

- [ ] **Step 5: Commit**

```bash
git add docs/DS-GAPS.md docs/PROJECT-CONTEXT.md HANDOFF.md CLAUDE.md
git commit -m "docs: record G23, refresh the stale project context and handoff"
```

---

## Self-Review

**Spec coverage.** Every numbered requirement maps to a task: lock/unlock icons → Task 2; custom
marker on hover → Task 3; confirm-dialog copy and No/Yes → Task 4; empty-category delete → Task 7
(branch) on Task 1's guard; the reassignment modal with its two columns, search and three buttons →
Task 5; Cancel → Tasks 5 and 7; Move and Delete with per-row plus summary validation → Task 5
(dialog) and Task 1 (store); Proceed Anyway and the typed-name force delete → Tasks 6 and 7. The
spec's seed table → Task 2. The G23 finding the spec requires → Task 8.

**Type consistency.** `assignments` is `Record<reportId, categoryId>` in the store (Task 1), the
dialog's `onMoveAndDelete` payload (Task 5) and the flow (Task 7). The reassignment dialog takes
`reports: [{id, name}]`, and Task 7 maps the store's `title` field onto that `name` — which is why
Task 2 adds `title` to the report factory. `destinationsFor` returns `[{id, name}]`, matching the
dialog's `categories` parameter.

**Known risk.** Task 2 changes the `cellaction` handler to mutate through `store.updateReport`
rather than the module-level array, because `rowsFor` now reads the store. Miss that and the
schedule toggle and favourite star will appear to do nothing — the store hands out copies, so a
mutation of the seed array is discarded on the next render.
