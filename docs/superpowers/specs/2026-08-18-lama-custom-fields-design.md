# Design — LAMA integration: custom fields with nested metadata

**Date:** 2026-08-18
**Status:** approved, implementing
**Screen:** Settings → Integration → LAMA → Create LAMA Profile

---

## 1. What we are building

The LAMA integration profile drawer gains a **Custom Fields** section: a repeating group of
`Custom Field` + `Metric Plugin Name`, each holding its own repeating list of `Metadata` + `Value`.

The section is the point of this work. The rest of the drawer is reproduced so the section can be
seen in its real context, but is deliberately inert.

Navigation to the screen in the product: Settings → Integration → LAMA → **Create LAMA Profile**.

---

## 2. Scope, as agreed

| Decision | Value |
|---|---|
| Deliverable | A working screen in this repo, built from DS components, with tests |
| Drawer scope | The whole Create LAMA Profile drawer **plus** the new Custom Fields section |
| Existing 16 fields | **Rendered only, inert** — correct controls and layout, no validation |
| Page chrome | The LAMA list page and the drawer. **Not** the Settings left navigation |
| Theme | Light, matching the existing `report-categories.html` |

---

## 3. The Custom Fields section

### 3.1 Shape

Group-based. Each Custom Field group is a parent; its Metadata rows are its children.

```
Custom Fields

  Custom Field              Metric Plugin Name
  [ latency            ]    [ ping              ]        (x)

      Metadata              Value
      [ region         ]    [ ap-south-1        ]        (x)
      [ tier           ]    [ gold              ]        (x) (+)

  Custom Field              Metric Plugin Name
  [                    ]    [                   ]        (x) (+)
```

### 3.2 Reveal

Metadata is **absent** until its group's `Custom Field` holds at least one character. Once revealed
it **stays revealed**, even if `Custom Field` is cleared back to empty. Nothing already typed is
hidden or discarded.

### 3.3 Requiredness — conditional and live

Every field starts optional. Two rules, evaluated as the user types, each flipping the field's
`required` marker and its participation in submit validation:

| Trigger | Becomes required |
|---|---|
| `Custom Field` is non-empty | `Metric Plugin Name` in the same group |
| `Metadata` is non-empty | `Value` in the same row |

**The two rules are independent.** Clearing `Custom Field` does not switch off a metadata row's
rule — a metadata row's own key is what governs its value.

The asterisk appears and disappears live, so the form always states its current obligations rather
than revealing them at submit.

### 3.4 Add and remove affordances

One rule, applied identically to Custom Field groups and to Metadata rows:

- **Exactly one row:** that row shows **(+) only**. There is nothing to remove back to.
- **Two or more rows:** **every** row shows **(x)**, and the **last** row also shows **(+)**.

Removing rows until one remains returns that row to (+) only.

---

## 4. Architecture

### 4.1 Why a generic repeater

The affordance rule in §3.4 has a real edge case and must hold identically at two levels. Written
twice it will drift, so it is written once:

| Option | Verdict |
|---|---|
| **A generic `fieldRepeater`, composed twice** | **Chosen.** The rule and its edge case live in one tested place; nesting falls out of composition |
| One purpose-built module hardcoding both levels | Rejected — the rule gets written twice inside one file |
| Re-render the whole section from a data model | **Rejected outright.** Metadata appears *while the user is typing*; a full re-render destroys focus and cursor position mid-keystroke |

### 4.2 Files

```
lama.html                          the LAMA screen + drawer mount point
src/lama/
  fieldRepeater.js                 generic row list + the (+)/(x) rule
  customFieldsSection.js           two-level composition, reveal, conditional validation
  lamaProfileDrawer.js             the full drawer — 16 inert fields + the section
  lamaPage.js                      SEBI strip, search, empty table, Create button, wiring
  *.css                            token-only styling
vite.config.js                     registers lama.html as a third entry point
```

### 4.3 `fieldRepeater` interface

```js
createFieldRepeater({ mount, renderRow, addLabel })
  addRow()            // appends a row, refreshes affordances, returns the row's api
  removeRow(id)
  rows()              // [{ id, element, ...whatever renderRow returned }]
  count()
```

`renderRow({ id })` returns `{ element, ...api }`. The repeater owns only the list and the
affordances; it knows nothing about what a row contains. After any add or remove it re-evaluates
which rows show (x) and which shows (+).

### 4.4 `customFieldsSection` interface

```js
renderCustomFieldsSection()
  element            // the section, for mounting
  validate()         // marks offending inputs, returns boolean
  value()            // [{ customField, metricPluginName, metadata: [{ key, value }] }]
  reset()            // back to a single empty group
```

It composes `fieldRepeater` at the group level, and one more `fieldRepeater` per group for that
group's metadata. It owns the reveal rule and both requiredness rules.

---

## 5. The rest of the drawer

Reproduced from the product, two-column, all inert:

Name · Description · Exchange · Application · Client Authentication API · Trading API · Member ID ·
Login ID · Password · Secret Key · Data Interval · Monitoring Hours · Scope By · Select Groups ·
Special Days · Failover Email.

Notes on specific controls:

- **Data Interval** uses `obs-input`'s `suffix` for "Minute(s)", default `5`.
- **Scope By** is `obs-radio as-button` with Group/Tag — the segmented-control pattern the report
  drawer already uses.
- **Password / Secret Key** use `type="password"` with `suffix-icon` for the reveal eye.
- **Special Days** is rendered as a static date + remark + (+) row. It is inert like its neighbours.
- Selects carry plausible placeholder options; there is no backend.

`Custom Fields` sits **after Failover Email**, before the "For more information: LAMA Framework"
line — mirroring where Custom Fields sits in Create Integration Profile.

---

## 6. Buttons

There is no backend, so the drawer would otherwise be undemonstrable:

- **Create LAMA Profile** validates the Custom Fields section only. On success it closes the drawer
  and appends a row to the LAMA table, so the result is visible.
- **Reset** returns the Custom Fields section to a single empty group.

---

## 7. Testing

**Unit (jsdom).** `fieldRepeater`: one row shows (+) only; two or more show (x) everywhere and (+)
on the last; removing back to one restores (+) only; add and remove maintain order.
`customFieldsSection`: metadata hidden initially; revealed on the first character; stays revealed
when the field is cleared; Metric Plugin Name becomes required only while Custom Field is non-empty;
Value becomes required only while Metadata is non-empty; the two rules do not interfere; `value()`
reports the nested shape; `validate()` marks exactly the offending inputs.

**Rendered (required).** Every state driven in headless Chrome with **real mouse clicks and real
keystrokes**. Synthetic events are what allowed the `obs-modal` confirm/close defect (G25) to pass
verification earlier in this project, and the reveal-on-typing behaviour is precisely the kind of
thing jsdom will report as working when it is not.

**Conformance.** `ds-conformance.mjs` must stay at 100/100 with 0 raw controls.

---

## 8. Out of scope

- The Settings left navigation.
- Any validation or behaviour on the 16 pre-existing fields.
- Persistence — the table row added on submit is in-memory, like the rest of this project.
- The remaining Report-module design changes, which are tracked separately.
