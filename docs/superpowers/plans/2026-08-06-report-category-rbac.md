# Report Category RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add category-level Public/Private visibility & sharing to the Report module's left-nav category list: lock icons per row, a mode-driven Category-Settings side panel (create / edit-builtin / edit-custom), and a delete-confirmation dialog for custom categories.

**Architecture:** A pure-JS data store (`store.js`) holds category state (`visibility`, `sharedWith`, `type`). A row renderer draws the lock icon plus hover pencil/trash. A mode-driven panel component and a small delete-confirmation dialog are composed from ObserveOps DS atoms (both are organisms per the DS rules, so they're hand-composed and declared via `list_gaps`, not assumed to exist as single tags). A wiring module connects clicks to store updates and re-renders. Everything renders into a standalone host page (`report-categories.html`) for MCP `validate_render` / conformance checking.

**Tech Stack:** Vanilla JS + Vite (existing scaffold), Vitest + jsdom for tests, `@mtdt/observeops-ds-elements` (web components) + `@mtdt/observeops-ds-css` (tokens).

## Global Constraints

- Build with `<obs-*>` DS web components + `var(--token)` colors only. Never hardcode a hex/rgb/hsl — resolve every color via the MCP `resolve_token` tool.
- Before writing any screen, call the MCP `search_components` / `get_component` / `get_recipe` — never guess a component's API.
- `<obs-input>`: read a field's value from `event.detail` (unwrap: `Array.isArray(e.detail) ? e.detail[0] : e.detail`) or `event.target.value`.
- Organisms (table, modal, drawer, menu, page-header, pagination) are **not** single DS components — compose from atoms + tokens + layout, and declare each as a reproduction via the MCP `list_gaps` tool.
- Form section headers ("Visibility & Sharing") are plain headings, not text-dividers.
- `<obs-side-menu>` (used here as the category list container) is a flush WHITE panel with a right border — never a gray or rounded card.
- Don't touch `<obs-sidebar>` or its logo — out of scope for this feature.
- Charts, topology, dashboard grids, or anything not in the DS → stop and ask. (None needed for this feature.)
- When a screen is done: run MCP `validate_render`, then `node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs ./report-categories.html`.
- Project root: `D:\Claude design\observeops-app`. Git is initialized; commit after every task.

---

### Task 0: Verify DS environment is ready

**Files:** none (verification only).

**Interfaces:**
- Consumes: nothing.
- Produces: a go/no-go gate. No later task may run until this passes.

- [ ] **Step 1: Check the DS packages are installed**

Run: `ls "D:/Claude design/observeops-app/node_modules/@mtdt"` (or `dir` on Windows)
Expected: lists `observeops-ds-elements`, `observeops-ds-css`, `observeops-ds-spec`.

- [ ] **Step 2: Check the MCP server is registered and connected**

Run: `claude mcp list`
Expected: an `observeops-ds` entry shown as connected, alongside any other configured servers.

- [ ] **Step 3: Gate**

If either check fails: STOP. Do not proceed to Task 1. Report back to the user that DS setup is still incomplete and name exactly which check failed.

If both pass: proceed to Task 1.

---

### Task 1: Add Vitest test tooling

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/smoke.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` runs Vitest in jsdom mode. Later tasks' `*.test.js` files rely on this.

- [ ] **Step 1: Install Vitest and jsdom**

Run: `npm install -D vitest jsdom`

- [ ] **Step 2: Add the test script**

Edit `package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 4: Write a smoke test**

Create `src/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest'

describe('test tooling', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof document).toBe('object')
    expect(document.createElement('div').tagName).toBe('DIV')
  })
})
```

- [ ] **Step 5: Run it and verify it passes**

Run: `npm test`
Expected: 1 test file, 1 test, PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/smoke.test.js
git commit -m "test: add Vitest + jsdom tooling"
```

---

### Task 2: DS Component Discovery

**Files:**
- Create: `docs/superpowers/plans/2026-08-06-ds-component-reference.md`

**Interfaces:**
- Consumes: the live `observeops-ds` MCP server (verified in Task 0).
- Produces: a reference document recording, for each component below, its exact tag name, required/relevant attributes, events (and `event.detail` shape), and slot structure. Tasks 4, 5, and 6 read this file and substitute its findings for every `⟪...⟫` placeholder in their code blocks.

- [ ] **Step 1: Query `search_components` for each needed component category**

Search for and record the matching component(s) for each of:
- Text input (for the Name field — expect this resolves to `obs-input`, already confirmed in the project's operating rules; confirm exact attribute/event names via `get_component` anyway).
- Segmented control / toggle group (for Public/Private).
- Icon button (for the row-hover pencil, row-hover trash, and the lock display — confirm whether a single icon-button component with an `icon` prop covers all three, or whether lock display should instead be a plain icon element wrapped for accessibility).
- Inline banner / notice (for the "Visible to all users..." / "Only the Users or User Profiles..." messages).
- Multi-select / tag picker (for the Users/User Profile field).
- Button (for Cancel/Save/Delete).

- [ ] **Step 2: Call `get_component` (and `get_recipe` where one exists) for each match**

Record for each: exact tag name, required attributes, value/selection attribute name, relevant events and their `event.detail` shape, slots, and any accessibility requirements (e.g. `aria-label` expectations for icon-only buttons).

- [ ] **Step 3: Call `get_recipe` / `get_layout` for side-panel (drawer) and modal composition**

Since these are organisms, the DS won't hand back a single tag — record whatever recipe/layout guidance the MCP provides for composing a right-side sliding panel and a centered modal from atoms + tokens (e.g. overlay/backdrop pattern, focus-trap expectations, close-button placement).

- [ ] **Step 4: Call `resolve_token` for every color this feature needs**

Resolve tokens for: open-lock icon color, closed-lock icon color, default icon-button color, destructive/delete color (trash icon + Delete button), panel background, panel border (matching the `<obs-side-menu>` right-border rule), overlay/backdrop color, banner background (info-style, used for both Public and Private banners unless the DS distinguishes states — check `search_components`/`resolve_token` for a semantic "info" token). Record the token variable names (e.g. `--obs-color-danger`) — never a resolved hex value.

- [ ] **Step 5: Write the reference document**

Create `docs/superpowers/plans/2026-08-06-ds-component-reference.md` with one section per component from Steps 1-4, each containing: tag name, attributes table, events table, and any recipe/layout notes. Include a final "Resolved Tokens" table mapping each use case above to its `var(--token)` name.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-08-06-ds-component-reference.md
git commit -m "docs: record DS component APIs for category RBAC feature"
```

---

### Task 3: Category data store

**Files:**
- Create: `src/report-categories/store.js`
- Test: `src/report-categories/store.test.js`

**Interfaces:**
- Consumes: nothing (pure module, no DOM, no DS).
- Produces:
  - `createStore(initialCategories)` → store object with `.getCategories()`, `.getCategory(id)`, `.addCategory({ name, visibility, sharedWith })`, `.updateVisibility(id, { visibility, sharedWith })`, `.deleteCategory(id)`, `.subscribe(listener)`.
  - Category shape: `{ id: string, name: string, type: 'builtin' | 'custom', visibility: 'public' | 'private', sharedWith: Array<{ type: 'user' | 'profile', id: string }> }`.
  - `addCategory` always creates `type: 'custom'`, generates its own `id`, appends it, notifies subscribers, and returns the full new category object.
  - `listener` is called with the new categories array on every mutation.

- [ ] **Step 1: Write the failing tests**

Create `src/report-categories/store.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { createStore } from './store.js'

const seed = [
  { id: 'all-reports', name: 'All Reports', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'inventory', name: 'Inventory', type: 'custom', visibility: 'private', sharedWith: [{ type: 'user', id: 'u1' }] },
]

describe('createStore', () => {
  it('returns a copy of the seeded categories', () => {
    const store = createStore(seed)
    expect(store.getCategories()).toEqual(seed)
    expect(store.getCategories()).not.toBe(seed)
  })

  it('gets a single category by id', () => {
    const store = createStore(seed)
    expect(store.getCategory('inventory').name).toBe('Inventory')
    expect(store.getCategory('missing')).toBeUndefined()
  })

  it('updates visibility and sharedWith, notifying subscribers', () => {
    const store = createStore(seed)
    const listener = vi.fn()
    store.subscribe(listener)

    store.updateVisibility('all-reports', { visibility: 'private', sharedWith: [{ type: 'user', id: 'u2' }] })

    const updated = store.getCategory('all-reports')
    expect(updated.visibility).toBe('private')
    expect(updated.sharedWith).toEqual([{ type: 'user', id: 'u2' }])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toEqual(store.getCategories())
  })

  it('throws when updating an unknown category', () => {
    const store = createStore(seed)
    expect(() => store.updateVisibility('missing', { visibility: 'public', sharedWith: [] })).toThrow(
      'Unknown category: missing'
    )
  })

  it('deletes a custom category and notifies subscribers', () => {
    const store = createStore(seed)
    const listener = vi.fn()
    store.subscribe(listener)

    store.deleteCategory('inventory')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getCategories()).toHaveLength(1)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('refuses to delete a builtin category', () => {
    const store = createStore(seed)
    expect(() => store.deleteCategory('all-reports')).toThrow('Cannot delete a builtin category: all-reports')
  })

  it('adds a new custom category with a generated id, notifying subscribers', () => {
    const store = createStore(seed)
    const listener = vi.fn()
    store.subscribe(listener)

    const created = store.addCategory({ name: 'Wireless', visibility: 'public', sharedWith: [] })

    expect(created.type).toBe('custom')
    expect(created.name).toBe('Wireless')
    expect(typeof created.id).toBe('string')
    expect(created.id.length).toBeGreaterThan(0)
    expect(store.getCategory(created.id)).toEqual(created)
    expect(store.getCategories()).toHaveLength(3)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('generates distinct ids for categories added in the same tick', () => {
    const store = createStore(seed)
    const first = store.addCategory({ name: 'Wireless', visibility: 'public', sharedWith: [] })
    const second = store.addCategory({ name: 'Wireless', visibility: 'public', sharedWith: [] })
    expect(first.id).not.toBe(second.id)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- store.test.js`
Expected: FAIL — `store.js` does not exist yet.

- [ ] **Step 3: Implement the store**

Create `src/report-categories/store.js`:

```js
export function createStore(initialCategories) {
  let categories = initialCategories.map((c) => ({ ...c, sharedWith: [...c.sharedWith] }))
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

  function deleteCategory(id) {
    const target = categories.find((c) => c.id === id)
    if (!target) throw new Error(`Unknown category: ${id}`)
    if (target.type === 'builtin') throw new Error(`Cannot delete a builtin category: ${id}`)
    categories = categories.filter((c) => c.id !== id)
    notify()
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return { getCategories, getCategory, addCategory, updateVisibility, deleteCategory, subscribe }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- store.test.js`
Expected: PASS, all 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/report-categories/store.js src/report-categories/store.test.js
git commit -m "feat: add category RBAC data store"
```

---

### Task 4: Category row rendering (lock icon + hover pencil/trash)

**Files:**
- Create: `src/report-categories/categoryRow.js`
- Test: `src/report-categories/categoryRow.test.js`

**Interfaces:**
- Consumes: a category object shaped as in Task 3; the icon-button tag/attributes recorded in `docs/superpowers/plans/2026-08-06-ds-component-reference.md` (Task 2); resolved lock/pencil/trash color tokens from the same file.
- Produces: `renderCategoryRow(category, handlers)` → returns an `HTMLElement` (a `<li>`) for one row. `handlers` is `{ onEdit(categoryId), onDelete(categoryId) }`.

Look up in `docs/superpowers/plans/2026-08-06-ds-component-reference.md`:
- `⟪ICON_BUTTON_TAG⟫` — the icon-button component tag from Task 2.
- `⟪ICON_BUTTON_ICON_ATTR⟫` — the attribute name that sets which icon glyph renders.
- `⟪LOCK_OPEN_ICON⟫` / `⟪LOCK_CLOSED_ICON⟫` / `⟪PENCIL_ICON⟫` / `⟪TRASH_ICON⟫` — the icon glyph identifiers for each.
- `⟪ICON_BUTTON_CLICK_EVENT⟫` — the event name the icon-button fires on click (e.g. `click` if it's a native-event-passthrough, or a custom event name).

- [ ] **Step 1: Write the failing tests**

Create `src/report-categories/categoryRow.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { renderCategoryRow } from './categoryRow.js'

const builtinPublic = { id: 'network', name: 'Network', type: 'builtin', visibility: 'public', sharedWith: [] }
const customPrivate = { id: 'inventory', name: 'Inventory', type: 'custom', visibility: 'private', sharedWith: [] }

describe('renderCategoryRow', () => {
  it('renders the category name', () => {
    const row = renderCategoryRow(builtinPublic, {})
    expect(row.textContent).toContain('Network')
  })

  it('shows an open-lock indicator for public categories', () => {
    const row = renderCategoryRow(builtinPublic, {})
    const lock = row.querySelector('[data-role="visibility-lock"]')
    expect(lock.getAttribute('data-visibility')).toBe('public')
  })

  it('shows a closed-lock indicator for private categories', () => {
    const row = renderCategoryRow(customPrivate, {})
    const lock = row.querySelector('[data-role="visibility-lock"]')
    expect(lock.getAttribute('data-visibility')).toBe('private')
  })

  it('always renders a hidden-until-hover edit control for every category', () => {
    const builtinRow = renderCategoryRow(builtinPublic, {})
    const customRow = renderCategoryRow(customPrivate, {})
    expect(builtinRow.querySelector('[data-role="edit-category"]')).not.toBeNull()
    expect(customRow.querySelector('[data-role="edit-category"]')).not.toBeNull()
  })

  it('only renders a delete control for custom categories', () => {
    const builtinRow = renderCategoryRow(builtinPublic, {})
    const customRow = renderCategoryRow(customPrivate, {})
    expect(builtinRow.querySelector('[data-role="delete-category"]')).toBeNull()
    expect(customRow.querySelector('[data-role="delete-category"]')).not.toBeNull()
  })

  it('calls onEdit with the category id when the edit control is activated', () => {
    const onEdit = vi.fn()
    const row = renderCategoryRow(customPrivate, { onEdit, onDelete: vi.fn() })
    row.querySelector('[data-role="edit-category"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onEdit).toHaveBeenCalledWith('inventory')
  })

  it('calls onDelete with the category id when the delete control is activated', () => {
    const onDelete = vi.fn()
    const row = renderCategoryRow(customPrivate, { onEdit: vi.fn(), onDelete })
    row.querySelector('[data-role="delete-category"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onDelete).toHaveBeenCalledWith('inventory')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- categoryRow.test.js`
Expected: FAIL — `categoryRow.js` does not exist yet.

- [ ] **Step 3: Implement the row renderer**

Create `src/report-categories/categoryRow.js`, substituting the `⟪...⟫` placeholders with the values recorded in Task 2's reference doc:

```js
export function renderCategoryRow(category, handlers = {}) {
  const { onEdit, onDelete } = handlers

  const li = document.createElement('li')
  li.className = 'category-row'
  li.dataset.categoryId = category.id

  const name = document.createElement('span')
  name.className = 'category-row__name'
  name.textContent = category.name
  li.appendChild(name)

  const lock = document.createElement('⟪ICON_BUTTON_TAG⟫')
  lock.setAttribute('data-role', 'visibility-lock')
  lock.setAttribute('data-visibility', category.visibility)
  lock.setAttribute(
    '⟪ICON_BUTTON_ICON_ATTR⟫',
    category.visibility === 'public' ? '⟪LOCK_OPEN_ICON⟫' : '⟪LOCK_CLOSED_ICON⟫'
  )
  lock.setAttribute('aria-label', category.visibility === 'public' ? 'Public category' : 'Private category')
  lock.setAttribute('disabled', '')
  li.appendChild(lock)

  const editButton = document.createElement('⟪ICON_BUTTON_TAG⟫')
  editButton.setAttribute('data-role', 'edit-category')
  editButton.className = 'category-row__hover-action'
  editButton.setAttribute('⟪ICON_BUTTON_ICON_ATTR⟫', '⟪PENCIL_ICON⟫')
  editButton.setAttribute('aria-label', `Edit ${category.name}`)
  editButton.addEventListener('⟪ICON_BUTTON_CLICK_EVENT⟫', () => onEdit?.(category.id))
  li.appendChild(editButton)

  if (category.type === 'custom') {
    const deleteButton = document.createElement('⟪ICON_BUTTON_TAG⟫')
    deleteButton.setAttribute('data-role', 'delete-category')
    deleteButton.className = 'category-row__hover-action category-row__hover-action--danger'
    deleteButton.setAttribute('⟪ICON_BUTTON_ICON_ATTR⟫', '⟪TRASH_ICON⟫')
    deleteButton.setAttribute('aria-label', `Delete ${category.name}`)
    deleteButton.addEventListener('⟪ICON_BUTTON_CLICK_EVENT⟫', () => onDelete?.(category.id))
    li.appendChild(deleteButton)
  }

  return li
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- categoryRow.test.js`
Expected: PASS, all 6 tests.

- [ ] **Step 5: Add hover-only visibility styling using resolved tokens**

Create `src/report-categories/categoryRow.css`, using the panel/icon color tokens recorded in Task 2 (substitute `⟪...⟫`):

```css
.category-row__hover-action {
  visibility: hidden;
}

.category-row:hover .category-row__hover-action,
.category-row:focus-within .category-row__hover-action {
  visibility: visible;
}

.category-row__hover-action--danger {
  color: var(⟪DESTRUCTIVE_COLOR_TOKEN⟫);
}
```

Import it once from `src/report-categories/main.js` in Task 7 (not here — this task only creates the file).

- [ ] **Step 6: Commit**

```bash
git add src/report-categories/categoryRow.js src/report-categories/categoryRow.test.js src/report-categories/categoryRow.css
git commit -m "feat: render category rows with visibility lock and hover actions"
```

---

### Task 5: Category-Settings side panel

**Files:**
- Create: `src/report-categories/categorySettingsPanel.js`
- Test: `src/report-categories/categorySettingsPanel.test.js`

**Interfaces:**
- Consumes: a category object (Task 3 shape) or `null` for create mode; DS tag names for input/toggle/banner/multiselect/button from Task 2's reference doc; drawer/side-panel composition + `<obs-side-menu>` border/background token guidance from Task 2.
- Produces: `renderCategorySettingsPanel({ mode, category, onSave, onCancel, onDelete })` → returns an `HTMLElement` for the panel. `mode` is `'create' | 'edit-builtin' | 'edit-custom'`. `onSave(payload)` is called with `{ name, visibility, sharedWith }` (name omitted for `edit-builtin`).

Look up in the Task 2 reference doc: `⟪INPUT_TAG⟫`, `⟪INPUT_VALUE_EVENT⟫` (fires with `event.detail`, per the project's `obs-input` convention), `⟪TOGGLE_TAG⟫`, `⟪TOGGLE_OPTIONS_PATTERN⟫`, `⟪TOGGLE_CHANGE_EVENT⟫`, `⟪BANNER_TAG⟫`, `⟪MULTISELECT_TAG⟫`, `⟪MULTISELECT_VALUE_EVENT⟫`, `⟪BUTTON_TAG⟫`, `⟪BUTTON_VARIANT_ATTR⟫` (for primary/secondary/destructive), and the panel background/border tokens (`⟪PANEL_BG_TOKEN⟫`, `⟪PANEL_BORDER_TOKEN⟫`).

- [ ] **Step 1: Write the failing tests**

Create `src/report-categories/categorySettingsPanel.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { renderCategorySettingsPanel } from './categorySettingsPanel.js'

const customCategory = {
  id: 'inventory',
  name: 'Inventory',
  type: 'custom',
  visibility: 'private',
  sharedWith: [{ type: 'user', id: 'u1' }],
}

const builtinCategory = {
  id: 'network',
  name: 'Network',
  type: 'builtin',
  visibility: 'public',
  sharedWith: [],
}

function nameInput(panel) {
  return panel.querySelector('[data-role="category-name"]')
}

function deleteButton(panel) {
  return panel.querySelector('[data-role="delete-category"]')
}

describe('renderCategorySettingsPanel', () => {
  it('shows an editable, empty Name field and Public default in create mode', () => {
    const panel = renderCategorySettingsPanel({ mode: 'create', category: null })
    expect(nameInput(panel).hasAttribute('disabled')).toBe(false)
    expect(panel.querySelector('[data-role="visibility-toggle"]').dataset.selected).toBe('public')
  })

  it('shows a disabled, pre-filled Name field in edit-builtin mode', () => {
    const panel = renderCategorySettingsPanel({ mode: 'edit-builtin', category: builtinCategory })
    const input = nameInput(panel)
    expect(input.hasAttribute('disabled')).toBe(true)
    expect(input.getAttribute('value')).toBe('Network')
  })

  it('shows an editable, pre-filled Name field in edit-custom mode', () => {
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory })
    const input = nameInput(panel)
    expect(input.hasAttribute('disabled')).toBe(false)
    expect(input.getAttribute('value')).toBe('Inventory')
  })

  it('only shows the Delete button in edit-custom mode', () => {
    expect(deleteButton(renderCategorySettingsPanel({ mode: 'create', category: null }))).toBeNull()
    expect(deleteButton(renderCategorySettingsPanel({ mode: 'edit-builtin', category: builtinCategory }))).toBeNull()
    expect(deleteButton(renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory }))).not.toBeNull()
  })

  it('shows the sharing picker pre-selected to Private, hides it after switching to Public', () => {
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory })
    expect(panel.querySelector('[data-role="sharing-picker"]')).not.toBeNull()
    expect(panel.querySelector('[data-role="visibility-banner"]').textContent).toContain('Only the Users or User Profiles')

    panel.querySelector('[data-role="visibility-toggle"]').dispatchEvent(
      new CustomEvent('⟪TOGGLE_CHANGE_EVENT⟫', { detail: 'public' })
    )

    expect(panel.querySelector('[data-role="sharing-picker"]')).toBeNull()
    expect(panel.querySelector('[data-role="visibility-banner"]').textContent).toContain(
      'Visible to all users in the organization'
    )
  })

  it('calls onSave with name, visibility, and sharedWith on save', () => {
    const onSave = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory, onSave })
    panel.querySelector('[data-role="save-category"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onSave).toHaveBeenCalledWith({
      name: 'Inventory',
      visibility: 'private',
      sharedWith: [{ type: 'user', id: 'u1' }],
    })
  })

  it('blocks save when Private is selected with no sharedWith entries', () => {
    const onSave = vi.fn()
    const emptyShare = { ...customCategory, sharedWith: [] }
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: emptyShare, onSave })
    panel.querySelector('[data-role="save-category"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onSave).not.toHaveBeenCalled()
    expect(panel.querySelector('[data-role="sharing-error"]')).not.toBeNull()
  })

  it('calls onCancel when Cancel is activated', () => {
    const onCancel = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'create', category: null, onCancel })
    panel.querySelector('[data-role="cancel-category"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onDelete with the category id when Delete is activated', () => {
    const onDelete = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory, onDelete })
    deleteButton(panel).dispatchEvent(new Event('click', { bubbles: true }))
    expect(onDelete).toHaveBeenCalledWith('inventory')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- categorySettingsPanel.test.js`
Expected: FAIL — `categorySettingsPanel.js` does not exist yet.

- [ ] **Step 3: Implement the panel**

Create `src/report-categories/categorySettingsPanel.js`, substituting every `⟪...⟫` with the values recorded in Task 2's reference doc:

```js
export function renderCategorySettingsPanel({ mode, category, onSave, onCancel, onDelete }) {
  const state = {
    name: category?.name ?? '',
    visibility: category?.visibility ?? 'public',
    sharedWith: category ? [...category.sharedWith] : [],
  }

  const panel = document.createElement('div')
  panel.className = 'category-settings-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', mode === 'create' ? 'New Category' : 'Edit Category')

  const title = document.createElement('h2')
  title.textContent = mode === 'create' ? 'New Category' : 'Edit Category'
  panel.appendChild(title)

  const nameInput = document.createElement('⟪INPUT_TAG⟫')
  nameInput.setAttribute('data-role', 'category-name')
  nameInput.setAttribute('label', 'Name')
  nameInput.setAttribute('value', state.name)
  if (mode === 'edit-builtin') nameInput.setAttribute('disabled', '')
  nameInput.addEventListener('⟪INPUT_VALUE_EVENT⟫', (event) => {
    const value = Array.isArray(event.detail) ? event.detail[0] : event.detail
    state.name = value ?? event.target.value
  })
  panel.appendChild(nameInput)

  const sectionHeading = document.createElement('h3')
  sectionHeading.textContent = 'Visibility & Sharing'
  panel.appendChild(sectionHeading)

  const toggle = document.createElement('⟪TOGGLE_TAG⟫')
  toggle.setAttribute('data-role', 'visibility-toggle')
  toggle.dataset.selected = state.visibility
  // ⟪TOGGLE_OPTIONS_PATTERN⟫ — set up Public/Private options per Task 2 findings.

  const banner = document.createElement('⟪BANNER_TAG⟫')
  banner.setAttribute('data-role', 'visibility-banner')

  const shareError = document.createElement('p')
  shareError.setAttribute('data-role', 'sharing-error')
  shareError.hidden = true
  shareError.textContent = 'Add at least one user or user profile.'

  let picker = null

  function renderVisibilityDependent() {
    banner.textContent =
      state.visibility === 'public'
        ? 'Visible to all users in the organization.'
        : 'Only the Users or User Profiles you add can view this dashboard.'

    if (picker) {
      picker.remove()
      picker = null
    }
    if (state.visibility === 'private') {
      picker = document.createElement('⟪MULTISELECT_TAG⟫')
      picker.setAttribute('data-role', 'sharing-picker')
      picker.setAttribute('label', 'Users / User Profile')
      picker.addEventListener('⟪MULTISELECT_VALUE_EVENT⟫', (event) => {
        state.sharedWith = Array.isArray(event.detail) ? event.detail : []
      })
      banner.insertAdjacentElement('afterend', picker)
    }
  }

  toggle.addEventListener('⟪TOGGLE_CHANGE_EVENT⟫', (event) => {
    state.visibility = event.detail
    toggle.dataset.selected = state.visibility
    renderVisibilityDependent()
  })

  panel.appendChild(toggle)
  panel.appendChild(banner)
  panel.appendChild(shareError)
  renderVisibilityDependent()

  const footer = document.createElement('div')
  footer.className = 'category-settings-panel__footer'

  if (mode === 'edit-custom') {
    const deleteButton = document.createElement('⟪BUTTON_TAG⟫')
    deleteButton.setAttribute('data-role', 'delete-category')
    deleteButton.setAttribute('⟪BUTTON_VARIANT_ATTR⟫', 'destructive')
    deleteButton.textContent = 'Delete'
    deleteButton.addEventListener('click', () => onDelete?.(category.id))
    footer.appendChild(deleteButton)
  }

  const cancelButton = document.createElement('⟪BUTTON_TAG⟫')
  cancelButton.setAttribute('data-role', 'cancel-category')
  cancelButton.textContent = 'Cancel'
  cancelButton.addEventListener('click', () => onCancel?.())
  footer.appendChild(cancelButton)

  const saveButton = document.createElement('⟪BUTTON_TAG⟫')
  saveButton.setAttribute('data-role', 'save-category')
  saveButton.setAttribute('⟪BUTTON_VARIANT_ATTR⟫', 'primary')
  saveButton.textContent = 'Save'
  saveButton.addEventListener('click', () => {
    if (state.visibility === 'private' && state.sharedWith.length === 0) {
      shareError.hidden = false
      return
    }
    shareError.hidden = true
    onSave?.({ name: state.name, visibility: state.visibility, sharedWith: state.sharedWith })
  })
  footer.appendChild(saveButton)

  panel.appendChild(footer)

  return panel
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- categorySettingsPanel.test.js`
Expected: PASS, all 9 tests. If the toggle/multiselect event wiring doesn't match Task 2's actual event contract, adjust the listener setup (not the test expectations) to match what the DS actually fires.

- [ ] **Step 5: Style the panel as a flush drawer using resolved tokens**

Create `src/report-categories/categorySettingsPanel.css`, substituting tokens from Task 2:

```css
.category-settings-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  background: var(⟪PANEL_BG_TOKEN⟫);
  border-left: 1px solid var(⟪PANEL_BORDER_TOKEN⟫);
  border-radius: 0;
  overflow-y: auto;
}

.category-settings-panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(⟪SPACING_TOKEN⟫);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/report-categories/categorySettingsPanel.js src/report-categories/categorySettingsPanel.test.js src/report-categories/categorySettingsPanel.css
git commit -m "feat: add mode-driven category settings panel"
```

---

### Task 6: Delete-confirmation dialog

**Files:**
- Create: `src/report-categories/deleteConfirmDialog.js`
- Test: `src/report-categories/deleteConfirmDialog.test.js`

**Interfaces:**
- Consumes: category `{ id, name }`; DS button tag from Task 2; modal composition guidance from Task 2.
- Produces: `renderDeleteConfirmDialog({ categoryName, onConfirm, onCancel })` → returns an `HTMLElement`.

- [ ] **Step 1: Write the failing tests**

Create `src/report-categories/deleteConfirmDialog.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { renderDeleteConfirmDialog } from './deleteConfirmDialog.js'

describe('renderDeleteConfirmDialog', () => {
  it('includes the category name in the warning text', () => {
    const dialog = renderDeleteConfirmDialog({ categoryName: 'Inventory', onConfirm: vi.fn(), onCancel: vi.fn() })
    expect(dialog.textContent).toContain('Inventory')
    expect(dialog.textContent).toContain("can't be undone")
  })

  it('calls onConfirm when Delete is activated', () => {
    const onConfirm = vi.fn()
    const dialog = renderDeleteConfirmDialog({ categoryName: 'Inventory', onConfirm, onCancel: vi.fn() })
    dialog.querySelector('[data-role="confirm-delete"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onCancel when Cancel is activated', () => {
    const onCancel = vi.fn()
    const dialog = renderDeleteConfirmDialog({ categoryName: 'Inventory', onConfirm: vi.fn(), onCancel })
    dialog.querySelector('[data-role="cancel-delete"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onCancel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- deleteConfirmDialog.test.js`
Expected: FAIL — `deleteConfirmDialog.js` does not exist yet.

- [ ] **Step 3: Implement the dialog**

Create `src/report-categories/deleteConfirmDialog.js`, substituting `⟪BUTTON_TAG⟫` and `⟪BUTTON_VARIANT_ATTR⟫` from Task 2's reference doc:

```js
export function renderDeleteConfirmDialog({ categoryName, onConfirm, onCancel }) {
  const dialog = document.createElement('div')
  dialog.className = 'delete-confirm-dialog'
  dialog.setAttribute('role', 'alertdialog')
  dialog.setAttribute('aria-label', `Delete ${categoryName}`)

  const title = document.createElement('h2')
  title.textContent = `Delete '${categoryName}'?`
  dialog.appendChild(title)

  const body = document.createElement('p')
  body.textContent = "This can't be undone."
  dialog.appendChild(body)

  const footer = document.createElement('div')
  footer.className = 'delete-confirm-dialog__footer'

  const cancelButton = document.createElement('⟪BUTTON_TAG⟫')
  cancelButton.setAttribute('data-role', 'cancel-delete')
  cancelButton.textContent = 'Cancel'
  cancelButton.addEventListener('click', () => onCancel?.())
  footer.appendChild(cancelButton)

  const confirmButton = document.createElement('⟪BUTTON_TAG⟫')
  confirmButton.setAttribute('data-role', 'confirm-delete')
  confirmButton.setAttribute('⟪BUTTON_VARIANT_ATTR⟫', 'destructive')
  confirmButton.textContent = 'Delete'
  confirmButton.addEventListener('click', () => onConfirm?.())
  footer.appendChild(confirmButton)

  dialog.appendChild(footer)
  return dialog
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- deleteConfirmDialog.test.js`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/report-categories/deleteConfirmDialog.js src/report-categories/deleteConfirmDialog.test.js
git commit -m "feat: add delete-confirmation dialog for custom categories"
```

---

### Task 7: Wire it together on a host page

**Files:**
- Create: `report-categories.html`
- Create: `src/report-categories/main.js`
- Modify: `vite.config.js` (create if it doesn't exist, to register the extra HTML entry point)

**Interfaces:**
- Consumes: `createStore` (Task 3), `renderCategoryRow` (Task 4), `renderCategorySettingsPanel` (Task 5), `renderDeleteConfirmDialog` (Task 6); DS `<obs-side-menu>` per the project's operating rules, plus DS elements/CSS registration per the project's entry-point convention (`import '@mtdt/observeops-ds-elements'`, `import '@mtdt/observeops-ds-css/dist/observeops-ds.css'`).
- Produces: a standalone page at `report-categories.html` that MCP `validate_render` and the conformance checker can target.

- [ ] **Step 1: Create the host HTML page**

Create `report-categories.html` at the project root:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Report Categories</title>
  </head>
  <body>
    <obs-side-menu id="category-list" aria-label="Report categories">
      <ul class="category-list" data-role="category-list"></ul>
      <button type="button" data-role="new-category">New Category</button>
    </obs-side-menu>
    <div id="panel-root"></div>
    <div id="dialog-root"></div>
    <script type="module" src="/src/report-categories/main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Register the page as a Vite entry point**

Create `vite.config.js` (project root) if it doesn't already exist:

```js
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        reportCategories: resolve(__dirname, 'report-categories.html'),
      },
    },
  },
})
```

- [ ] **Step 3: Write the wiring module**

Create `src/report-categories/main.js`:

```js
import '@mtdt/observeops-ds-elements'
import '@mtdt/observeops-ds-css/dist/observeops-ds.css'
import { createStore } from './store.js'
import { renderCategoryRow } from './categoryRow.js'
import './categoryRow.css'
import { renderCategorySettingsPanel } from './categorySettingsPanel.js'
import './categorySettingsPanel.css'
import { renderDeleteConfirmDialog } from './deleteConfirmDialog.js'

const seedCategories = [
  { id: 'all-reports', name: 'All Reports', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'config', name: 'Config', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'inventory', name: 'Inventory', type: 'custom', visibility: 'private', sharedWith: [{ type: 'user', id: 'u1' }] },
]

const store = createStore(seedCategories)
const listEl = document.querySelector('[data-role="category-list"]')
const panelRoot = document.getElementById('panel-root')
const dialogRoot = document.getElementById('dialog-root')

function closePanel() {
  panelRoot.replaceChildren()
}

function closeDialog() {
  dialogRoot.replaceChildren()
}

function openPanel(mode, category) {
  const panel = renderCategorySettingsPanel({
    mode,
    category,
    onCancel: closePanel,
    onSave: ({ name, visibility, sharedWith }) => {
      if (mode === 'create') {
        store.addCategory({ name, visibility, sharedWith })
      } else {
        store.updateVisibility(category.id, { visibility, sharedWith })
      }
      closePanel()
    },
    onDelete:
      mode === 'edit-custom'
        ? () => {
            closePanel()
            openDeleteDialog(category)
          }
        : undefined,
  })
  panelRoot.replaceChildren(panel)
}

function openDeleteDialog(category) {
  const dialog = renderDeleteConfirmDialog({
    categoryName: category.name,
    onCancel: closeDialog,
    onConfirm: () => {
      store.deleteCategory(category.id)
      closeDialog()
    },
  })
  dialogRoot.replaceChildren(dialog)
}

function render(categories) {
  listEl.replaceChildren(
    ...categories.map((category) =>
      renderCategoryRow(category, {
        onEdit: (id) => {
          const found = categories.find((c) => c.id === id)
          openPanel(found.type === 'builtin' ? 'edit-builtin' : 'edit-custom', found)
        },
        onDelete: (id) => {
          const found = categories.find((c) => c.id === id)
          openDeleteDialog(found)
        },
      })
    )
  )
}

store.subscribe(render)
render(store.getCategories())

document.querySelector('[data-role="new-category"]').addEventListener('click', () => {
  openPanel('create', null)
})
```

- [ ] **Step 4: Manually verify in the dev server**

Run: `npm run dev`, open `report-categories.html` in the browser.
Expected: category rows render with lock icons; hovering a row shows the pencil (and trash for Inventory); clicking pencil opens the panel pre-filled correctly per mode; toggling Public/Private swaps the banner and picker; Save updates the row's lock icon; Delete on the custom row asks for confirmation and removes the row.

- [ ] **Step 5: Commit**

```bash
git add report-categories.html vite.config.js src/report-categories/main.js
git commit -m "feat: wire category RBAC feature into a host page"
```

---

### Task 8: DS conformance validation

**Files:**
- Modify: any file flagged by validation (fixes only, no new features).

**Interfaces:**
- Consumes: the completed `report-categories.html` and its DS component usage.
- Produces: a passing MCP `validate_render` result and a passing `ds-conformance.mjs` run, plus recorded `list_gaps` declarations for the two organism reproductions (Category-Settings panel, Delete-confirmation dialog).

- [ ] **Step 1: Declare the organism reproductions**

Call the MCP `list_gaps` tool, declaring: (a) the Category-Settings side panel as a drawer/side-panel organism reproduction composed from `⟪INPUT_TAG⟫`, `⟪TOGGLE_TAG⟫`, `⟪BANNER_TAG⟫`, `⟪MULTISELECT_TAG⟫`, `⟪BUTTON_TAG⟫`; (b) the Delete-confirmation dialog as a modal organism reproduction composed from `⟪BUTTON_TAG⟫`. Record the tool's response.

- [ ] **Step 2: Run `validate_render`**

Call the MCP `validate_render` tool against `report-categories.html`. If it reports violations (e.g. a hardcoded color, a disallowed component, an accessibility gap), fix them in the relevant Task 4-7 file and re-run.

- [ ] **Step 3: Run the conformance checker**

Run: `node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs ./report-categories.html`
Expected: PASS. If it fails, fix the reported file and re-run — do not edit the checker or the spec package.

- [ ] **Step 4: Run the full test suite one more time**

Run: `npm test`
Expected: all tests across all files still PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: resolve DS conformance findings for category RBAC feature"
```

(If Step 2/3 required no fixes, skip this commit — nothing to commit.)
