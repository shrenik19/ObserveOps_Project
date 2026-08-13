# Design — category visibility icons, custom marker, and the category delete flow

**Date:** 2026-08-13
**Status:** approved design, ready for an implementation plan
**Supersedes nothing.** Extends `2026-08-06-report-category-rbac-design.md`.

---

## 1. What we are building

Three changes to the Report → Category RBAC feature, in one piece of work because they share the
same data and the same rail:

1. **Visibility icons become locks.** Private shows a closed padlock, Public shows an open padlock,
   for both default and custom categories. This replaces today's `globe` for Public.
2. **A custom-category marker on hover.** Hovering a category row reveals an icon when the category
   is custom. Default categories show nothing.
3. **A real delete flow.** Deleting a custom category now accounts for the reports inside it —
   confirm, then either delete outright, reassign the reports, or force-delete both.

Item 3 is the substance. Items 1 and 2 are small and land first.

---

## 2. Context this design depends on

- **Delete is only offered on custom categories.** Default (builtin) categories can change
  visibility and sharing, but cannot be renamed or deleted. This is unchanged.
- **Delete lives in the settings drawer, not on the rail row.** The row carries only an edit
  affordance so it stays a navigation target. This is unchanged, and was reconfirmed during design.
- **`store.js` is DOM-free and DS-free.** It is the one part that would survive a move to any
  framework, and it is where the builtin/custom rules already live.
- **`augmentSideMenu.js` is the only file permitted to touch a component's shadow root**, sanctioned
  by `obs-side-menu`'s own known-issue, which says create/delete/rename affordances are the
  consumer's job.

---

## 3. A DS constraint discovered while designing this

**A dropdown cannot go inside an `obs-table` cell.**

- `elements-api.json` reports `obs-table` `slots: []` — there are no per-cell slots on the web
  component.
- The column `type` enum is `text | severity | dot | status | type | tags | sparkline | heat | bar`,
  plus `switch | icon | link | button` added in 0.1.146. **No `select`.**
- `obs-table`'s `editable` mode looks like a way in, but the registry is explicit that editable
  columns become **`obs-input`s** — text fields, not selects.

The reassignment grid in the reference screenshot therefore **cannot be an `obs-table`**. It is
hand-composed instead (see §7.3).

This is a new instance of gap **G1** and must be added to `docs/DS-GAPS.md` with the repro above and
the ask: *allow a component in a cell, or add a `select` cell type that takes `{options, value}` and
reports through `cellaction`.*

---

## 4. Data model

### 4.1 Where reports live

Reports currently sit in a module-level array in `main.js`; the store knows only categories. Every
new requirement is a question about the relationship between the two: how many reports are in this
category, which are they, move them, delete them.

**Decision: the store owns reports as well as categories.**

The invariant this feature protects — *no report points at a category that no longer exists* — is a
data rule, so it belongs with the data. The alternatives were rejected:

| Option | Why not |
|---|---|
| A second, separate reports store | The cross-store invariant would live in neither store — exactly the bug class this feature exists to prevent. |
| Leave reports in `main.js` | Puts the substance of the feature in the largest file (341 lines), untestable without a DOM. |

### 4.2 Store API

`createStore` accepts **either** a bare category array (today's shape, so the existing 8 tests keep
passing unchanged) **or** `{ categories, reports }`.

```js
createStore(categories | { categories, reports })

// categories — unchanged
getCategories()
getCategory(id)
addCategory({ name, visibility, sharedWith })
updateVisibility(id, { visibility, sharedWith })
deleteCategory(id)

// reports — new
getReports()
getReportsByCategory(categoryId)
countReportsInCategory(categoryId)

// the two explicit delete paths — new
moveReportsAndDeleteCategory(categoryId, assignments)   // assignments: { [reportId]: destCategoryId }
deleteCategoryWithReports(categoryId)
```

**Rules enforced in the store, not in the UI:**

- `deleteCategory` throws on a builtin category (existing behaviour, unchanged).
- `deleteCategory` **also throws if the category still holds reports.** This forces every caller
  through one of the two explicit paths and makes the invariant impossible to violate by accident.
  The existing tests seed categories only, so no category has reports and all 8 keep passing.
- `moveReportsAndDeleteCategory` throws unless **every** report in the category has a destination in
  `assignments`, and throws if any destination is the category being deleted or does not exist. It
  moves the reports, then deletes the category, then notifies **once**.
- `deleteCategoryWithReports` removes the category and every report in it, notifying once.
- All three notify subscribers exactly once per call, so the rail and the grid re-render together.

### 4.3 Seed data

Visibility and type per the agreed spread. `Capacity Planning` is new, and exists specifically so the
"category with no reports" path is reachable in the running app.

| Category | Visibility | Type | Reports |
|---|---|---|---|
| All Reports | Public | Default | virtual view — shows every report |
| Config | Public | Default | 1 |
| Windows | Public | **Custom** | 1 |
| Inventory | Private | **Custom** | 2 |
| Flow Reports | Private | Default | 0 |
| Wireless | Private | **Custom** | 2 |
| WAN Link | Public | **Custom** | 1 |
| **Capacity Planning** *(new)* | Private | **Custom** | **0** |
| Network | Private | Default | 4 |
| Alert | Public | Default | 2 |
| Availability | Private | Default | 2 |
| Performance | Public | Default | 2 |
| Virtualization | Public | Default | 1 |
| Server | Private | Default | 1 |
| Service Check | Public | Default | 1 |

`Capacity Planning` is Private, so it also needs a non-empty `sharedWith` to satisfy the existing
validation rule (private requires at least one user or profile). Seed it with one user.

This spread gives every combination on screen at once: public/default, public/custom,
private/default, private/custom, plus a custom category with no reports and custom categories with
one and with several.

---

## 5. Visibility icons

| Visibility | Icon | Notes |
|---|---|---|
| Public | `lockOpen` | replaces `globe` |
| Private | `lockAlt` | unchanged |

Both are confirmed present in the DS icon registry. **`unlockAlt` must not be used** — gap G3 records
that it still draws an undo arrow despite the name.

This closes the open question carried in `HANDOFF.md` ("Decide `globe` vs `lockOpen` for Public").
The decision is `lockOpen`, because the paired open/closed padlock reads as one scale, which `globe`
against a padlock did not.

The icon is supplied through `obs-side-menu`'s existing `items[].icon`, so no shadow-DOM work is
needed for this item.

---

## 6. The custom-category marker

- Appears **only on hover**, and **only on custom categories**. Default categories show nothing.
- Placeholder icon: **`wrench`**. Chosen as a stand-in; swap it when the product picks a real glyph.
- **Decorative only** — not focusable, not clickable, `aria-hidden="true"`. Custom/default is already
  conveyed to assistive tech by the drawer, and adding a fake control repeats gap G22's mistake.
- Rendered by `augmentSideMenu.js`, because `obs-side-menu`'s item shape carries only one `icon` and
  that slot is taken by the visibility lock. This extends the file already sanctioned for exactly
  this kind of row-level addition.
- Sits between the label and the edit pencil, and follows the same hover rules the pencil already
  uses.

---

## 7. The delete flow

Entered from the **Delete** button in the settings drawer, which appears only in `edit-custom` mode.
The drawer **closes** as the flow begins, so only one overlay is ever on screen — this is today's
behaviour and is unchanged. Four states follow.

**Dismissal applies to the whole flow, at every state.** `obs-modal` is `esc-closable` by default and
each dialog also reports a `close` event. Escape, the ✕, and every Cancel/No button are all treated
identically: tear down every dialog in the flow and change nothing. A half-finished reassignment is
never retained.

### 7.1 State 1 — confirm

Matches the reference exactly: **no title**, trash icon, one line, two buttons.

- Message: `Are you sure you want to delete <Name> Category?`
- Buttons: **No** · **Yes** (Yes is the destructive variant)

This changes today's dialog, which has a bold `Delete '<Name>'?` heading, the body text
"This can't be undone.", and Cancel/Delete buttons. The heading is dropped and the body becomes the
question.

**No** closes everything and changes nothing. **Yes** advances to state 2.

### 7.2 State 2 — branch on report count

- `countReportsInCategory(id) === 0` → call `deleteCategory(id)`, close, done.
- otherwise → open state 3.

### 7.3 State 3 — reassign reports

An `obs-modal` (default variant, `scrollable`) containing:

- A **search field** (`obs-input type="search"`) filtering the report list by name.
- A two-column list, hand-composed because of §3:
  - **Reports** — the report's name, as text.
  - **New Category** — an `obs-select` per row, `block`, listing **every real category except the one
    being deleted**. "Favorites" is excluded (a pseudo-category with no id in the category space) and
    "All Reports" is excluded (a virtual view that holds no reports of its own).
- Column headers styled to match the DS grid header, using tokens only.

Footer, in `obs-modal`'s `footer` slot, three buttons:

| Button | Variant | Behaviour |
|---|---|---|
| **Cancel** | default | Closes every dialog. Nothing changes. |
| **Move and Delete** | primary | Validates, then moves and deletes. |
| **Proceed Anyway** | error | Opens state 4. |

**Validation on Move and Delete.** If any row has no destination selected, the flow does **not**
proceed and shows both:

- each offending row's `obs-select` in an error state, and
- one summary message at the top of the modal: `New category not selected for all reports.`

Selecting a destination clears that row's error immediately; the summary clears once every row has
one. When all rows are mapped, call `moveReportsAndDeleteCategory(id, assignments)` and close.

Filtering the list with the search box **does not** narrow what gets validated — validation always
covers every report in the category, not just the visible ones. Otherwise a user could search, map
the two rows they can see, and delete a category whose other reports are unmapped.

### 7.4 State 4 — force delete

An `obs-modal` with a warning icon and the exact copy requested:

> All reports associated within this category will be permanently deleted. This action cannot be
> undone.
>
> To confirm, type the category name **`<Name>`** (case-sensitive) below.

- An `obs-input` whose placeholder is the category name.
- Buttons: **Cancel** · **Force Delete** (error variant).
- **Force Delete is disabled until the typed text matches the category name exactly**, including
  case. This is why the button reads as greyed out in the reference screenshot.
- Confirming calls `deleteCategoryWithReports(id)` — removing the category **and every report in
  it** — then closes every dialog.

### 7.5 After any successful delete

If the deleted category was the active rail selection, the rail falls back to **All Reports**. This
is the existing behaviour and is unchanged.

Reports moved by state 3 keep every other property — their favourite flag, schedule state and
description are untouched; only `category` changes. Reports removed by state 4 disappear from the
grid and from the Favorites count.

---

## 8. Files

**New**

| File | Purpose |
|---|---|
| `deleteCategoryFlow.js` | Orchestrates states 1→4 and owns the transitions. Keeps the flow out of `main.js`. |
| `reassignReportsDialog.js` + `.css` | State 3 — search, two-column list, three-button footer, validation. |
| `forceDeleteDialog.js` + `.css` | State 4 — typed-confirmation modal. |

**Modified**

| File | Change |
|---|---|
| `store.js` | Owns reports; adds the three new operations and the two new invariants. |
| `deleteConfirmDialog.js` | New copy, No/Yes buttons, title dropped. |
| `augmentSideMenu.js` | Injects the custom marker on hover. |
| `main.js` | New seed data, `lockOpen`/`lockAlt` mapping, passes reports into the store, wires the flow. |
| `docs/DS-GAPS.md` | Records the new G1 instance from §3. |

Each dialog is one module with one purpose, exposing `data-role` hooks for its tests — the pattern
the three existing dialogs already follow.

---

## 9. Testing

Following the project's existing method: **unit tests for logic, and a rendered check for anything
visual.**

**Store (no DOM).** Zero-report delete succeeds; delete with reports throws; move-and-delete requires
a complete assignment map and rejects a destination that is the doomed category or does not exist;
force delete removes the category and exactly its own reports and leaves others untouched; each
operation notifies once.

**Dialogs (jsdom).** Confirm dialog renders the new copy and reports No/Yes. Reassign dialog lists
one row per report, excludes the doomed category and the two virtual entries from every dropdown,
blocks Move and Delete while any row is unmapped, surfaces both the per-row and summary errors,
clears them on selection, validates hidden rows while a search filter is active, and routes Proceed
Anyway onward. Force-delete dialog keeps its button disabled until an exact case-sensitive match and
reports the confirmation.

**Rendered verification (required, not optional).** The gap report records four defects that were
invisible to jsdom and to static checks. Every state of this flow must be driven in headless Chrome
and screenshotted before it is called done — in particular the hover-only marker, the lock glyphs at
their rendered size, and the three-button modal footer.

**Conformance.** `ds-conformance.mjs` must still report **100/100** with 0 raw controls. The
hand-composed reassignment grid is the risk here and must be checked explicitly.

---

## 10. Out of scope

- **Duplicate category names.** `addCategory` enforces no uniqueness, and `obs-side-menu` matches its
  active row by *label*, so two categories sharing a name already collide today — the rail resolves
  to the first match. This flow inherits that limitation. It is a real pre-existing bug, worth its
  own change, and is deliberately not fixed here.
- Renaming a default category, moving reports between categories outside of a delete, and bulk
  category operations.
- The remaining `HANDOFF.md` items (wiring search/notifications, the horizontal inset decision).

---

## 11. Open questions

None. Every question raised during design was answered and is recorded above.
