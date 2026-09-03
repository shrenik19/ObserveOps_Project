# ObserveOps DS — gap report

> **New here?** Read [`PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md) first — it explains what was built,
> which DS components it uses, and how discovery was done. This file assumes that context.

## Status — re-verified against elements 0.1.159 / css 0.1.4 / spec 0.1.197

The DS team shipped fixes across three releases (0.1.143, 0.1.144, 0.1.146). Re-tested by upgrading and rebuilding the same screen
each time. **Thirteen of the eighteen are now closed, and every one of them let the consumer delete a
workaround.**

**Two new findings, G23 and G24**, came from building the category delete flow on top of the same
screen (2026-08-13). Both are discoverability/capability gaps that cost real time:

| Gap | Status | Evidence |
|---|---|---|
| **G23** dropdown cannot go in a table cell | 🆕 **OPEN** | `obs-table` `slots: []`, no `select` column type, and `editable` yields `obs-input`s. The reassignment grid had to be hand-composed. **Second instance of G1** |
| **G24** no icon inventory | 🆕 **OPEN** | `registry/icon.json` is prose, not a name list, and omits `trash`/`timesCircle` which both render. `wrench` does not exist — 14 of 32 probed names did not. Icon-side twin of G14 |
| **G25** `obs-modal` emits `close` after `confirm` | 🆕 **OPEN** | One click on the action button fires `confirm` → `close` → `hide`, undocumented. Wiring `close` to cancel — the obvious reading — tears down whatever the confirm just opened. **Invisible to unit tests**; found with a real mouse |
| **G28** `obs-date-time-picker` mislabelled + write-only | 🆕 **OPEN** | Flagged `referenceOnly` but emits a real `change` contract; and `value` accepts a write that never renders, so a time can be collected but never displayed |
| **G27** `obs-select` inline add is decorative | 🆕 **OPEN** | `can-user-add-options` renders a "+" and a confirm row; clicking either emits nothing and `options` never changes. Same shape as G22 and G18 |
| **G26** `obs-select` has no error state | 🆕 **OPEN** | `obs-input` ships `error` + `errorMessage`; `obs-select` ships neither, and setting `error` fails silently |
| **G29** `multiple`+`disabled` select loses its trigger | 🆕 **OPEN** | The template swaps `.trig` for a bare `<div class="pills">`, so the field has no border, background or chevron — it reads as a caption, not a disabled field |
| **G30** two-pane description ignores the selected option | 🆕 **OPEN** | The pane is driven by a hover-only highlight index; a select that already has a value opens on "Hover an option to see details." instead of that option's own description. **Found with a real mouse** |
| **G31** no card / tile component | 🆕 **OPEN** | A navigational index of screens has to hand-compose its cards from raw `<a>`. Conformance scores that page **70/100, component 0, 2 raw controls** — the only screen in the project that cannot reach 100 |
| **G32** `elements-api.json` omits event `detail` payloads | 🆕 **OPEN** | `rowclick` emits the row KEY as a bare string, not the row. Reading `detail[0].id` silently opened nothing; unit tests asserted the assumed shape and passed. **Found only by clicking a real row** |
| **G33** `obs-table` copies the host `id` into its shadow root | 🆕 **OPEN** | `#wan-link-table` matches twice under any shadow-piercing engine; a Playwright strict locator throws. The consumer cannot address its own element by the id it set |
| **G34** no chart element | ⚖️ **ANSWERED, by design** | 0.1.210 documents the decision: charts are Highcharts, app-rendered, so no obs-* will ship. Superseded by G35 |
| **G35** the 32 chart fixtures are documented but not published | 🆕 **OPEN** | `data-viz.json` says they ship under `charts/` with a `charts/manifest.json`; `package.json` `files` omits the directory and it is absent from the tarball. The one shippable path for a standalone consumer is documented and unreachable |
| **G36** `obs-table` cannot pin its pager to the bottom of a taller container | 🆕 **OPEN** | The host stretches to 605px; the internal wrap stays at its 183px content height, so the pager sits mid-page. No attribute, no `part`, no custom property, and a definite host height changes nothing. The product's bottom-pinned footer has to be rebuilt by the consumer |
| **G37** the conformance checker scores a **disabled** `obs-button` as off-reference | 🆕 **OPEN** | 4 disabled pager buttons drop the run 100 → 91 (component 69), and the failure line prints the SAME colour on both sides: "bg rgb(236, 241, 249) vs rgb(236, 241, 249)". Removing `disabled` restores 100/100 |

| Gap | Status | Evidence |
|---|---|---|
| **G2** no banner, no info token | ✅ **FIXED** (0.1.144 / css 0.1.2) | `obs-banner` ships — `variant: info\|success\|warning\|error`, `title`, `icon`, `closable`, `close` event — and `--info-surface` / `--info-text` / `--info-border` now exist. **The reproduction and its declared off-purpose token deviation are deleted** |
| **G12** logos unimportable | ✅ **FIXED** (0.1.143) | `exports` now has `"./logos"` + `"./dist/*"`. **The consumer's Vite alias is deleted** |
| **G7** CSS path not exported | ✅ **FIXED** (css 0.1.1) | css `exports` now includes `./dist/observeops-ds.css` and `./dist/*` |
| **G9** obs-filters unwireable | ✅ **FIXED** (0.1.143) | `referenceOnly: false`, with `fields` / `value` and a `change` event. **~60 lines of hand-composed bar deleted** |
| **G10** slots undocumented | ✅ **MOSTLY FIXED** (0.1.143) | `slots` for 16 elements; `obs-drawer.footer` is a real `enum`. Two defects remain — see below |
| **G1** table cell content | ✅ **FIXED** (0.1.146) | New column types `switch` / `icon` / `link` / `button`, all emitting `cellaction {id,key,type,value}`. **All four blocked columns now built** — verified live: 10 switches, 10 stars, 10 download buttons, and the event fires with the documented payload |
| **G13a** no sticky header | ✅ **FIXED** (0.1.146) | `sticky-header` + `max-height` attributes. **The consumer's shadow-root injection is deleted** |
| **G3** open-lock glyph | ⚠️ **MOSTLY FIXED** (0.1.150) | **Four open padlocks now ship** — `lockOpen`, `lockOpenAlt`, `lockAltOpen`, `unlock` (552 glyphs), all rendered and confirmed as genuine open padlocks. Correctly-named `undo` / `rotateLeft` also exist. **Remaining:** `unlockAlt` still ships and still draws the undo arrow, so the mislabel itself is unfixed — anyone trusting the name still gets the wrong icon |
| **G6** modal `title` dropped | ✅ **FIXED** (0.1.146) | The `confirm` variant now renders `title`. **The consumer's duplicated heading is deleted.** Note: `elements-api.json` is unchanged — slots are still `["default"]` and `title` carries no note — so this is invisible to a metadata check and was briefly misreported here as still open |
| **G8** validate_render rejects real components | ⏳ **unverified** | see the MCP caveat below |
| **G14** no logo index | ⏳ **unverified** | `list_logos` / `resolve_logo` not visible; see caveat |

**Impact so far:** the app deleted a Vite alias, ~60 lines of filter-bar composition plus its CSS, a
hand-built banner plus its CSS, a shadow-root sticky-header injection, and the single documented
token deviation — while conformance stayed at 100/100. More importantly the screen gained four
columns it previously could not build at all: the SCHEDULE toggle, the favourite ★, the linked
description and the download buttons. That is the fixes working as intended.

**Two defects in the G10 slot fix — one fixed, one open.** `obs-tabs` no longer reports the leaked
`"t.key"`. `obs-side-menu` still reports only `["tabs-action","search-action"]`, omitting the `logo`
and `default` slots that decompiling reveals.

### G15 — ✅ FIXED in elements@0.1.159

`cellaction` now reports which sub-part was activated:

```js
emit('cellaction', { id, key, type, ...(part ? { part } : {}) })
```

Verified live — clicking the ★ and the label in one `type="link"` cell now give
`part:"icon"` and `part:"text"` respectively. The registry documents it with this exact case as the
example: *"For a two-control cell (the product NAME column: a ★ that favourites + text that opens),
use type=\"link\" with a leading icon and read `part` in the payload."*

**`augmentTable.js` and its 9 tests are deleted** — favouriting now runs entirely on the public
event.

The original report follows.

### Original finding — G15: an icon inside a cell is not independently actionable

The product's NAME column is **★ + report name in one cell**, under the NAME header — the star
toggles the favourite, the name opens the report. Two actions, one cell.

`type="link"` with `{text, icon, href}` renders that shape correctly
(`<a class="cell-link"><obs-icon class="cell-link-ic">text</a>`), and it is the **only** cell type
that puts an icon beside text — `type="icon"` with `{icon,label}` renders the icon alone and turns
`label` into the `aria-label`, not visible text.

But the icon is not separately addressable. Probed by clicking each part:

```
click the ★     → cellaction {"id":"1","key":"b","type":"link","value":{…}}
click the text  → cellaction {"id":"1","key":"b","type":"link","value":{…}}   ← identical
```

One cell emits one action, so a consumer cannot tell "favourite this" from "open this". Working
around it means binding the star inside the table's shadow root on the internal `.cell-link` /
`.cell-link-ic` class names (`augmentTable.js`, 7 tests) — the same fragility as G4.

**Ask:** include the clicked sub-part in the `cellaction` payload (e.g. `part: 'icon' | 'text'`), or
allow a cell to declare more than one actionable element.

### G16, G17, G18 — ✅ ALL FIXED in elements@0.1.150

Re-verified by upgrading and re-running the same probes. **All three consumer workarounds are
deleted.**

| Gap | Evidence |
|---|---|
| **G16** chip discarded | `+ Filter` → pick a field → `chips=1`, operator menu opens. Works with an **array** `value` seed, the shape that used to trigger it |
| **G17** Match at 1 condition | 1 condition → match hidden; 2 → visible |
| **G18** match mode unreachable | `match` is now a documented prop, and `change` emits `{conditions, match}`. Verified end to end: no filter = 20 rows, `Availability AND Custom` = 0, `Availability OR Custom` = 10 |

> **Breaking change worth calling out.** The `change` payload went from a bare conditions **array**
> to `{conditions, match}`. Anyone integrated against 0.1.143–0.1.146 breaks **silently** — an
> `Array.isArray(detail)` guard simply yields no conditions and filtering stops, with no error. Worth
> a release note; a version bump alone will not surface it.
>
> **Testing note for whoever verifies this:** a stale bundler cache will show all three as still
> broken. Vite needed `rm -rf node_modules/.vite` plus `--force` before it served 0.1.150 — without
> that, the probes reported the old behaviour convincingly.

The original reports follow, for the record.

### Original findings — G16, G17, G18: the FilterBar's add-a-filter flow and Match control

All three found by using the bar as a user would. **All three are component issues; none are
consumer wiring.**

#### G16 — picking a field discards the chip being built (blocking bug)

**Repro:** click `+ Filter`, pick a field from the menu. The chip vanishes and the bar returns to
just `+ Filter`. Click `+ Filter` and pick again — the second attempt sticks.

```
after + Filter:        chips=1   menu rows=2
picking field "Type" → change → []
AFTER picking field:   chips=0        ← discarded
el.value = "[]"
```

**Root cause**, from the component's own source. On every edit it runs:

```js
const z = P1.value.filter(/* complete conditions only */)…
if (s) { const V = JSON.stringify(z); s.value !== V && (s.value = V) }   // write back to el.value
c("change", z)
```

and it also watches its own `value` prop:

```js
F1(() => l.value, (z) => { z != null && (P1.value = o(z, []).map(…)) })   // rebuild internal state
```

A half-built chip has no operator yet, so it is filtered out, `el.value` is written as `"[]"`, the
watcher fires, and internal state is rebuilt **without the chip**.

**Why the second attempt works** — and this pins the bug precisely. The write is guarded by
`s.value !== V`, comparing the prop against a **JSON string**. The documented API accepts
`[String, Array]`, so a consumer seeding an array gets `[] !== "[]"` → true → write → wipe. After
that first write `el.value` *is* the string `"[]"`, so the next comparison is equal, no write
happens, and the chip survives. **The bug only fires when `value` is set as an array — the shape the
API explicitly permits.**

**Consumer workaround:** seed `value` as a JSON string —
`el.setAttribute('value', '[]')`, never `el.value = []`.

**Ask:** compare like with like (parse before comparing, or normalise the prop on the way in), and
do not rebuild internal state from a self-emitted write. An in-progress chip should survive its own
change event.

#### G17 — Match All/Any appears at one condition, with no prop to change it

The Match control is gated by `I = P1.value.some(condition is complete)` — i.e. it appears as soon as
**one** filter exists, where "match" has no meaning. There is no prop to defer it.

**Consumer workaround:** inject `:host([data-conditions='1']) .match-btn { display: none }` into the
shadow root and keep a count attribute on the host — a shadow-DOM patch for what should be a prop.

**Ask:** show Match only at ≥2 conditions, or expose it as a prop.

#### G18 — the Match All/Any state is never emitted (the control is decorative)

The mode lives in an internal ref and is rendered as text, but **it is never emitted and has no
prop**:

```js
L1 = D("All Filters")                                            // internal state
L1.value = L1.value === "All Filters" ? "Any Filter" : "All Filters"   // toggled by the button
c("change", z)                                                   // z = conditions ONLY
```

So a consumer receives the conditions but no indication of how to combine them, and toggling Match
changes nothing observable. **A user flipping it sees no effect** — the control looks broken.

**Consumer workaround:** read the rendered `.match-val` text and watch it with a MutationObserver —
brittle, and dependent on the English labels "All Filters" / "Any Filter".

**Ask:** include the mode in the `change` payload (e.g. `{ conditions, match: 'all' | 'any' }`, or a
second argument), and add a `match` prop so it can be controlled and restored.

> These three compound: G16 makes the bar hard to populate, and once populated G18 makes its most
> visible control do nothing. The FilterBar is ~50× in product, so this is worth prioritising.

### G19 — ✅ FIXED in elements@0.1.159

All three regions now read one custom property, so they line up by default and move together:

```css
.hd      { margin:  0 var(--drawer-inset, 15px) }
.body    { padding: 15px var(--drawer-inset, 15px) 0 }
.actions { margin:  0 var(--drawer-inset, 15px) }
```

Measured live: heading and footer both at 15px. **The consumer's shadow-root `.actions` injection is
deleted.** `use-padding` still moves only the body — that trap remains, but it is now avoidable
rather than mandatory.

The original report follows.

### Original finding — G19: `obs-drawer`'s three regions cannot be aligned

The drawer's heading, body and footer are hardcoded to **different horizontal insets**, and no
combination of its public API makes them match:

```css
.hd       { margin: 0 15px }                            /* heading → 15px */
.body     { padding: 15px 15px 0 }                      /* body    → 15px */
.body.pad { padding-left: 24px; padding-right: 24px }   /* body + use-padding → 24px */
.actions  { margin: 0 24px }                            /* footer  → 24px, ALWAYS */
```

| Setting | heading | body | footer | result |
|---|---|---|---|---|
| default | 15px | 15px | **24px** | footer sticks out |
| `use-padding` | 15px | **24px** | 24px | heading sticks out |

The footer is fixed at 24px with no prop, no variant and no custom property, while the heading is
fixed at 15px. **There is no way to produce a drawer whose three regions line up.**

Two further traps in `use-padding`:

- **It changes only the body**, despite a name that reads as "pad the drawer". Reaching for it to fix
  the footer instead misaligns the heading — which is exactly what happened here.
- `.body:not(.scroll) { padding: 0 }` — setting `scrolled-content="false"` silently drops the body's
  padding to zero, a third value.

**Consumer workaround:** drop `use-padding` and inject `.actions { margin-left: 15px; margin-right:
15px }` into the shadow root. (Note the panel is often created before it is attached, so a one-shot
injection finds a null `shadowRoot` and silently does nothing — it has to retry.)

**Ask:** expose one inset — a `--drawer-inset` custom property, or simply make `.actions` use the
same 15px as `.hd`. The DS already exposes `--drawer-background-color`, so the mechanism exists.

### New finding — G20: the drawer's documented widths disagree between two files

Two DS sources document `obs-drawer`'s width, and they do not match:

| Source | What it says |
|---|---|
| `components/specs/drawer.md` | **`width="480"` (or 40%)** is the **"detail / form (default)"** variant — *"a focused detail panel or an edit form, contextual to a record"*. The changelog confirms it was pixel-verified: *"box-sizing so width is exactly 480"* |
| `components/registry/drawer.json` → `sizes` | a four-step ladder of **`360px` · `40%` · `50-70%` · `85-96%`** — **480 does not appear at all** |
| `elements-api.json` → `width` note | *"Product: 360→40%→50-70%→85-96%"* — also omits 480 |

So the single most common drawer size — the default for detail and edit-form panels, the most frequent
use of the component — is documented **only** in the markdown spec. A consumer reading the machine-
readable sources (`elements-api.json`, the registry JSON) never sees it and picks 360px or 40%
instead. That is exactly what happened here: this feature's edit-form drawer was built at an
arbitrary 400px, then at 360px, before 480 was found by grepping the markdown.

**Ask:** add `480px` to the registry's `sizes` and to the `width` note in `elements-api.json`, marked
as the detail/form default. More generally: the markdown spec and the machine-readable registry
should not disagree — machine consumers only read the latter.

### New finding — G21: there is no spacing scale (the root cause behind several other gaps)

The DS publishes tokens for colour, typography and radius, but **nothing for spacing**. Searching
`observeops-ds.css` for a spacing/gap/gutter scale returns two hits, and neither is one:

| Token | Value | Reality |
|---|---|---|
| `--common-padd-space` | `15px` | a lone value — **no shipped element uses it** |
| `--disk-space-full-background` | a colour | matched only because it contains "space" |

There is no `--space-1/2/3`, no gutter scale, no vertical-rhythm unit. **Every gap, inset and stack
spacing in a consumer app is therefore an invented number**, and every DS component hardcodes its own.

That is not a cosmetic gap — it is the **root cause of several already-filed findings**:

- **G19** — the drawer's heading `15px` vs footer `24px`. Two regions of one component, hardcoded
  independently, with no shared unit to agree on.
- **G13b** — the grid `header-style` question, where nothing said which value list screens use.
- The page-header's `16px 20px 0` outer + `8px 0` inner, `obs-toolbar`'s `8px`, `obs-side-menu`'s
  `12px`, the drawer's `15px`/`24px` — **six different spacing values across five components**, none
  derived from a common scale.

A consumer trying to line a screen up vertically has to reverse-engineer each component's internal
padding and hand-match it, which is what this project did repeatedly.

**Ask:** publish a spacing scale as tokens (e.g. `--space-xs/sm/md/lg` or a 4px-based ramp), express
every component's internal padding in terms of it, and document which step each region uses. Then a
consumer's `gap` and a component's inset can agree by construction instead of by measurement. If a
scale already exists internally, exporting it as tokens would be enough.

### New finding — G22: the app-header avatar claims to be a button when nothing is wired

Using `obs-app-header`'s `user` **attribute** (initials text) renders an avatar carrying:

```js
{ key: 0, class: "avatar", role: "button", tabindex: "0" }   /* + cursor: pointer */
```

but the component emits **only `action`**, and that fires from the action buttons alone
(`emit("action", { icon, label, index })`). **Nothing is bound to the avatar.**

So with the attribute alone the avatar: announces as a button to assistive tech, takes keyboard
focus, shows a pointer cursor — and does nothing on click or Enter. A user reasonably reads it as
broken, which is exactly how it was reported here.

The intended path is the **`user` slot** with `obs-user-menu` (a full component: name, subtitle,
items, Dark/Light/Auto toggle, logout; events `select`/`logout`/`theme`/`show`/`hide`), as the
`module-screen` recipe says: *"global search + notifications + account via slots — compose
obs-command-palette / obs-notification-menu / obs-user-menu."*

**Ask:** when the `user` attribute is used without the slot, drop `role="button"`, `tabindex` and
`cursor: pointer` — or emit a `user` event so the affordance is honest. An interactive-looking,
focusable element that does nothing is an accessibility defect, not just a visual one.

*(Same shape as the `brand` slot: the attribute renders a degraded version and the slot is the real
one. Worth a consistent rule — attributes for text, slots for anything interactive.)*

**MCP caveat.** The `observeops-ds` MCP server is spawned by `npx -y` when a session connects, so a
running session keeps the build it started with. During re-testing `get_setup` still returned text
byte-identical to the old build (*"ORGANISMS are NOT shipped yet"*, and the old CSS path). Anything
MCP-side — `validate_render`, `get_setup`, and any new `list_logos` / `resolve_logo` tools — must be
re-checked in a **fresh session**.

### New finding — G23: a dropdown cannot go in a table cell (G1, second instance)

`obs-table` gained `switch` / `icon` / `link` / `button` cell types in 0.1.146, which closed the
original G1. Building the "reassign these reports before deleting the category" step hit the same
wall again, for a **select**:

- `elements-api.json` reports `obs-table` `slots: []` — there is no per-cell slot.
- The column `type` enum has no `select` member.
- `editable` looks like the way in, but the registry is explicit that editable columns become
  **`obs-input`s** — text fields. There is no editable enum/select cell.

So the two-column *Reports · New Category* grid — a per-row destination picker, which is the entire
content of the dialog — **cannot be an `obs-table`**. It was hand-composed from `obs-select` plus a
CSS grid, reproducing the DS grid header by hand with `--grid-header-bg`.

**Ask:** add a `select` cell type taking `{ options, value }` and reporting through `cellaction`
(the same payload the other typed cells already use), or make `editable` honour a per-column
`control: 'select'`. Either closes this without a new mechanism — `cellaction` already carries
`{id, key, type, value}` and would need nothing added.

*Worth noting the shape of this: G1 was closed for four specific cell types, and the fifth need hit
the same limit. A per-column render hook would have closed the whole class at once.*

### New finding — G24: there is no icon inventory, and the registry is not one

`components/registry/icon.json` is prose about the component — `props`, `do`, `dont`, `a11y`,
`knownIssues` — **not a list of glyph names**. It does not mention `trash` or `timesCircle`, both of
which render perfectly. So a consumer has no way to answer "does icon X exist?" short of rendering
it.

Building this feature needed three icon decisions, and guessing produced a wrong answer:
**`wrench` does not exist** and renders as a placeholder, despite being the obvious name for a
"custom/configured" marker. It was caught only by mounting every candidate in a real browser and
checking each shadow root for an SVG. Of 32 plausible names probed, **14 did not exist** —
including `lock`, `warning`, `alertTriangle`, `tool`, `edit` and `folder`, all of which read as
names a design system would ship.

This is the icon-side twin of **G14** (no logo inventory), and it has the same consequence: a
consumer either renders a broken placeholder in production or writes a probe harness to enumerate
the library by brute force.

**Ask:** publish the icon name list as data — a `icons.json` alongside `elements-api.json`, or an
`list_icons` MCP tool. The names already exist as keys in the bundle's icon map; exporting them
would cost nothing and close this permanently.

**Second instance (2026-08-27), same cost.** Marking custom categories in the side menu needed one
glyph. Every name the product vocabulary suggests is absent:

| Probed | Result |
|---|---|
| `customReport`, `custom_report`, `customreport` | ✗ missing |
| `customCategory`, `custom_category`, `customcategory` | ✗ missing |
| `category`, `categories`, `customCategories` | ✗ missing |
| `reportAlt`, `reports` | ✗ missing |
| `custom`, `customDashboard`, `report` | ✓ exist |

**The library ships 552 glyphs and exactly two of them contain "custom"; not one contains
"categ".** Establishing that took extracting the icon map straight out of the minified bundle with a
regex over `name: { w, h, p }` entries — which is the same brute-force enumeration this gap was
raised about the first time, a year of releases later. A consumer naming an icon after the domain
concept it marks (a *category*) cannot discover that no such glyph exists without doing this.

Note also that a missing name **fails silently**: `obs-icon` renders an element with an empty shadow
root rather than warning, so a wrong guess reaches production as an invisible gap in the layout
rather than as an error. Every icon in this app is now verified by asserting its shadow root
actually contains an `<svg>`.

### New finding — G25: `obs-modal` emits `close` after `confirm`, and nothing says so

**Severity: high — it silently breaks any multi-step flow.**

One click on the confirm button of `obs-modal variant="confirm"` emits, in order:

```
confirm  ->  close  ->  hide
```

`elements-api.json` lists the events as `["confirm","cancel","close","show","hide"]` with **no note
that `close` also fires on the success path**. The natural reading — `confirm` means yes, `close`
means the user dismissed it — is wrong, and wiring `close` to a cancel handler is the obvious thing
to do because the modal has no × and Escape must still be handled.

**What it cost here.** The category delete flow opens a second dialog from the confirm handler. The
trailing `close` was read as a dismissal and tore down the dialog that `confirm` had just mounted, so
the flow dead-ended on a blank screen. **Unit tests did not catch it**, because a test dispatches
`confirm` alone; only the real component emits the pair. It was found by driving the screen with a
real mouse.

**Consumer workaround:** latch each dialog to report exactly one outcome — the first event to arrive
wins, the rest are ignored.

**Ask:** document the emission order and state plainly that `close` follows `confirm`. Better, do not
emit `close` on the confirm path at all — `confirm` and `cancel` already cover both outcomes, and
`close` should mean "dismissed without choosing".

### New finding — G26: `obs-select` has no error state, but `obs-input` does

`obs-input` ships `error` (Boolean) and `errorMessage` (String). **`obs-select` ships neither** — its
25 attributes include `disabled`, `loading` and `placeholder`, but nothing for validation.

So a form that validates a select cannot mark it. Setting `error` on the element does nothing at all,
and it fails silently — the attribute lands on the host and is simply ignored, which reads as working
code until someone looks at the screen.

**Consumer workaround:** keep the attribute as a state flag and draw the ring from the host element:

```css
.reassign-dialog__row obs-select[error] {
  display: block;
  border-radius: 4px;
  outline: 1px solid var(--secondary-red);
}
```

An outline avoids piercing the shadow root, but it sits outside the control's own border rather than
replacing it, so it does not match how `obs-input` renders its error. A per-row message had to be
hand-built too, since there is no `errorMessage` to carry one.

**And it has no `label` either.** `obs-input` ships `label`; `obs-select` and `obs-radio` ship
neither. Every select on the LAMA profile drawer rendered untitled until the consumer drew its own
label beside it — Exchange, Application, Monitoring Hours and Select Groups all silently lost their
captions, because setting `label` on an obs-select is accepted and ignored.

**Ask:** give `obs-select` the same `error` / `errorMessage` pair `obs-input` already has. Form
controls in one design system should validate the same way — a consumer should not have to check,
control by control, which ones can show an error.

### New finding — G27: `obs-select`'s inline "add option" is decorative

**Severity: high — the affordance is fully rendered and does nothing at all.**

`can-user-add-options` renders the inline "+" and, per the changelog, deliberately forces the search
row open so the "+" is reachable. Clicking it opens the component's own editor row with a tick and a
cross. **None of it commits anything.**

Verified by patching `dispatchEvent` on the element so every event it fires is captured, on a bare
page with no consumer code attached:

```
typing         -> search: ["/"] … search: ["/metrics/brand-new"]   (19 events)
click "+"      -> (nothing)
click the tick -> (nothing)      button.ok, the component's own confirm control
press Enter    -> (nothing)
```

`options` is unchanged afterwards and `value` stays `undefined`. So a consumer switching the
attribute on ships a control that looks complete, opens a confirmation UI, and silently discards
whatever the user types.

This is the same defect shape as **G22** (the app-header avatar announces as a button and is wired to
nothing) and **G18** (the FilterBar's Match control renders state it never emits). Worth treating as a
class: *an affordance that renders must report.*

**Consumer workaround** (`src/lama/augmentAddableSelect.js`, 16 tests): take the typed text from the
**public** `search` event, and bind the click through the shadow root's internal `.addbtn`, then push
the value into `options`, set `value`, and emit `change` as the component should have. The
component's stale editor row is dismissed by clicking its `.trig`.

Only the click target needs piercing — the text itself is public — but it still binds to two internal
class names and will break on any change to them.

**Ask:** emit an event when the user confirms an addition (`add` with the new value, or simply
`change` with it) and append it to `options`. Until then, document `can-user-add-options` as
non-functional rather than shipping a control that appears to work.

*Also:* `add-label` is prefixed with "Add " by the component, so `add-label="Add"` renders
**"Add Add"**. Worth a note in the API.

### New finding — G28: `obs-date-time-picker` is mislabelled `referenceOnly`, and is write-only

**Two separate problems, one component.**

**1. The `referenceOnly` flag is wrong.** `elements-api.json` marks `obs-date-time-picker` as
`referenceOnly: true`, which the file's own preamble defines as *"renders but has no functional data
contract"*. A consumer reading that reasonably concludes the component cannot be wired and either
skips it or hand-builds a replacement.

It is not true. Rendered with `kind="field-time"`, the component opens a real three-column
hour/minute/meridiem spinner and **emits `change` on every column click**, refining as it goes:

```
click 09  -> change [{"time":"05:21 PM"}]
click 30  -> change [{"time":"09:21 PM"}]
click AM  -> change [{"time":"09:30 PM"}]
             change [{"time":"09:30 AM"}]
```

That is a perfectly usable data contract. The flag costs consumers a working component.

**2. It cannot be seeded.** `value` exists as a property and accepts a write, but nothing renders:

```js
el.value = '09:30'   // accepted
el.value             // '09:30'
// the trigger still shows the placeholder — shows: false
```

So the picker is **write-only from the user's side**: you can read what they chose, but you cannot
put a value back in. Any form that edits an existing record, restores a draft, or offers a default
time cannot display it. A create-only form escapes this; an edit form does not.

**Consumer workaround:** hold the chosen time in the consumer's own state from the `change` payload
and never read it back off the element (`src/lama/scheduleSection.js`). Resetting the field means
destroying and recreating the element, because there is no way to clear it programmatically either.

**Ask:** correct the `referenceOnly` flag — the component has a working `change` contract and should
be discoverable. Then make `value` two-way so a time can be displayed as well as collected, and
document the payload shape (`{ time: "hh:mm AM" }`, a 12-hour string, not a Date).

*Also worth noting:* the emission is per-column, so a consumer receives several intermediate times
before the final one. That is fine for a live-bound field but surprising if you expect one event per
selection.

### New finding — G29: a `multiple` + `disabled` `obs-select` loses its entire trigger

A disabled `obs-select` normally keeps its field chrome: `.sel.disabled .trig` only repaints it
(grey fill, `.75` opacity, `not-allowed` cursor). But when the select is **also `multiple`**, the
template takes a different branch entirely and never renders `.trig` at all:

```js
// observeops-elements.js — the first branch of the trigger region
e.multiple && e.disabled
  ? h("div", { class: "pills" }, [ /* pills, or <span class="ph">placeholder</span> */ ])
  : /* ...every other case renders the real .trig button... */
```

So the control collapses to bare text on the page background: **no border, no background, no
chevron**. Nothing marks it as a field at all — it reads as a stray caption sitting next to a real
one. The two states are not variants of one control; they are two different controls.

**Repro:** `<obs-select multiple disabled placeholder="Select">` beside any enabled select. The
enabled one is a bordered dropdown; the disabled one is grey text.

**Why it matters here:** every counter row carries an aggregation picker that is `multiple` and is
`disabled` until its row is opted in — so on first render *every* aggregation field in the section
is chrome-less. A disabled field still has to look like a field, or the user cannot see what is
waiting to be filled in.

**Consumer workaround:** wrap the select and redraw the trigger the component withheld, to the DS's
own metrics (`min-height: var(--input-height-base)`, `padding: 3px 9px 3px 11px`, 1px border, 4px
radius, `--neutral-lightest` fill), plus an `obs-icon name="chevronDown"` the CSS hides again once
the field is enabled — `.counters__agg` in `src/lama/lama.css`, wired in
`src/lama/countersSection.js`. No shadow DOM is pierced, but the consumer is now maintaining a
copy of the DS's own field metrics, which will drift the moment the DS changes them.

**Ask:** render `.trig` in the `multiple` + `disabled` case too, with the pills inside it, so the
disabled state is a repaint of one control rather than a substitution of another.

### New finding — G30: the two-pane description ignores the option that is already selected

`use-after-menu-description` fills the right-hand pane from a highlight index that **only
`mouseenter` on an option ever sets**:

```js
// each option button
onMouseenter: () => { d1.value = <index> }
// the pane
const description = computed(() => options.value[d1.value]?.description ?? null)
```

Opening the menu does not seed that index from the current value. So a select that **already has a
value** opens showing *"Hover an option to see details."* beside a list whose selected entry is
typically scrolled out of sight — the description the component is already holding for that exact
option is never shown until the pointer happens to cross it.

**Repro:** give a two-pane `obs-select` a `value`, then open it. Pane shows the hint, not that
option's description. Hover the option and the description appears — so the data was there all along.

**Found by rendering, not reading.** A synthetic `mouseenter` on the trigger does nothing; only a
real hover over the option row populates the pane. This is the third finding in this project that a
DOM-level or unit check would have passed (see G22, G25).

**Consumer workaround:** on open, dispatch `mouseenter` on
`.opts [role="option"][aria-selected="true"]` and scroll it into view —
`src/lama/augmentSelectDescription.js`. It works only because the component listens for exactly
that event, so it is a nudge rather than a patch; but it reaches into the shadow root to find the
option, which is a piercing the DS could remove entirely.

**Ask:** seed the highlight index from the selected option when the menu opens (and scroll it into
view), so an already-chosen select opens on its own description. A `highlight`/`activeIndex` prop
would also do it, and would let a consumer preview any option without faking pointer events.

### New finding — G31: there is no card / tile component, so an index page cannot reach conformance

Building the app shell turned the old standalone landing page into a real screen — an **Overview**
that lists every screen in the app. That is an ordinary product surface: a grid of clickable cards,
each with an icon, a title, a description and a "go" affordance.

**The DS has nothing for it.** Searching all 47 elements for `card|tile|panel|surface` returns three,
none usable:

| Element | Why not |
|---|---|
| `obs-layout-panels` | `referenceOnly: true` — renders, but carries no data contract |
| `obs-metric-list` | no attributes and no slots in `elements-api.json`; not a navigational surface |
| `obs-link` | functional (`href`, `variant`, `as-button`), but it is an inline link, not a card-sized target |

So the cards are hand-composed `<a class="card">` with a token-only stylesheet — the same markup the
old landing page used, carried over unchanged.

**Repro:** run the conformance checker against the Overview route and against either real screen:

```
/                        OVERALL:  70/100  · component   0 · 2 raw controls · 0 DS components
/#/settings/lama         OVERALL: 100/100  · component 100 · 0 raw controls · 5 DS components
/#/reports/categories    OVERALL: 100/100  · component 100 · 0 raw controls · 6 DS components
```

The two raw controls are the two card anchors. **This is the only screen in the project that cannot
reach 100**, and not for want of trying: there is no component to reach for.

**Consumer workaround:** none available. Wrapping the whole card in `obs-link` is not equivalent —
it is styled and sized as an inline link. Making only the "Open screen" text an `obs-link` would
satisfy the checker but shrink the click target from the whole card to a few words, which is a worse
product for a better score. The raw anchor was kept deliberately.

**Ask:** ship a card/tile component — `obs-card` with `href`, slots for `media`/`title`/`body`/
`action`, and a hoverable/clickable variant. Failing that, let `obs-link` take a `block` or
`as-card` variant so a consumer can make a whole region a DS-sanctioned navigation target. An index
of screens is a common enough surface that every consumer will otherwise hand-roll it, and each one
will fail the component dimension in exactly this way.

### Two defects in the G10 fix

1. **`obs-tabs` reports its slot as `"t.key"`** — a variable name leaked from the extraction script,
   not a slot name.
2. **`obs-side-menu` reports only `["tabs-action","search-action"]`.** Decompiling the bundle also
   shows `logo` and `default`. The slot extraction is incomplete, so a consumer trusting the file
   still cannot discover every slot.

### New finding — `obs-filters` renders demo data when `value` is unset

With `fields` set but **`value` never assigned**, `kind="bar"` renders **hardcoded demo chips**:
*"Select Filter = MySQL (+1)"*, *"Select Filter = Down (+1)"*, *"Type = AWS Auto Scaling (+3)"* —
none of which come from the supplied `fields`. Setting `value = []` gives the correct empty bar.

A consumer who wires `fields` and waits for the user's first interaction therefore ships fake filter
chips. **Ask:** default `value` to `[]` rather than the reference fixture.

*(Also note: `obs-filters` has no `defaultChips` equivalent, so the product's persistent
`Type` / `Report Type` chips — declared by the module in the Vue FilterBar — cannot be reproduced.
The element starts empty with `+ Filter` as the sole add affordance.)*

**From:** building the Report → Category RBAC feature (a full Report module screen: module rail, app
header, module title, tab row, category side-menu, filter bar, reports grid, settings drawer, confirm
dialog) against `@mtdt/observeops-ds-elements@0.1.141`, `observeops-ds-css@0.1.0`,
`observeops-ds-spec@0.1.180`.

**Scope:** 14 findings (G0–G14). **Result:** the screen passes `ds-conformance.mjs` at **100/100** (token 100 · component 100 ·
philosophy 100 · layout 100) with **0 raw controls**, and `validate_render` returns **0 violations**.
So none of the below blocked shipping — but each one cost time, or forced a workaround that a future
DS release could break.

**How to read this.** Every item is labelled by where the fix belongs:

- **DS — capability**: the design system genuinely cannot do this yet.
- **DS — discoverability**: the capability exists but could not be found from the documented API.
- **DS — packaging**: the capability exists and is documented, but cannot be imported or resolved.
- **Consumer**: my mistake as the implementer; listed only where a DS change would have prevented it.

The most important line in this report: **of the fourteen items, only five are capability gaps.**
Most of the cost came from things the DS could already do but did not surface.

---

## Priority summary

| # | Gap | Class | Impact |
|---|---|---|---|
| **G12** | Logos ship but cannot be imported — every `obs-logo` renders "?" | DS — packaging | **Highest.** Broken out of the box, including the DS's own default |
| **G10** | `elements-api.json` omits slots entirely | DS — discoverability | **Highest.** Caused 3 separate defects |
| **G1** | `obs-table` cannot put a component or icon in a cell | DS — capability | Blocks 4 columns of the product's own Report grid |
| **G9** | `obs-filters` is `referenceOnly` — the ~50× FilterBar cannot be wired | DS — capability | Recomposed by hand on every screen |
| **G0** | No functional app shell, and no whole-screen recipe | DS — capability | Screens get built as fragments |
| **G7** | Documented CSS import path is not in `exports` | DS — packaging | First-run failure; the documented snippet throws |
| **G2** | No inline-banner component and no info-surface token | DS — capability | Reproduced with an off-purpose token |
| **G3** | No open-lock glyph; `unlockAlt` is mislabeled | DS — capability | Wrong icon ships silently |
| **G5** | Three different option shapes across form elements | DS — discoverability | Silent failure; wrong shape renders empty |
| **G8** | `validate_render` rejects components that exist and pass conformance | DS — discoverability | The contract says STOP on valid work |
| **G13** | `obs-table` has no sticky header; `header-style` gives no which-to-use guidance | DS — capability + discoverability | Wrong header style passes every check |
| **G14** | No inventory of logo names — led to a hand-drawn brand mark | DS — discoverability | Consumer fabricated a brand asset |
| **G6** | `obs-modal variant="confirm"` drops `title`; `confirm-variant` renders outline | DS — capability | Minor; workaround is easy |
| **G4** | `obs-side-menu` scope boundary (**not a defect — see entry**) | — | Documented for clarity |

---

## G12 — the logo library ships but cannot be imported

**Class: DS — packaging. Severity: highest — this is broken out of the box.**

`dist/observeops-logos.js` ships in the package (1.6 MB, **291 logos, `motadata` included**).
`obs-logo` renders by reading `globalThis.__OBS_LOGOS__` and re-renders on an `obs-logos-loaded`
event. But:

1. **The elements bundle never imports the logos bundle** — there is no static or dynamic import of
   it anywhere in `observeops-elements.js`.
2. **The package's `exports` map only exposes `"."`**, so every path a consumer would try is refused:

   ```
   @mtdt/observeops-ds-elements/observeops-logos.js       → ERR_PACKAGE_PATH_NOT_EXPORTED
   @mtdt/observeops-ds-elements/dist/observeops-logos.js  → ERR_PACKAGE_PATH_NOT_EXPORTED
   ```

3. **`get_setup` never mentions loading logos at all.**

So `globalThis.__OBS_LOGOS__` is never populated and **every `<obs-logo>` renders the "?" placeholder** —
including `obs-sidebar`'s own default, which falls back to `<obs-logo name="motadata" size="26">`.
The DS's flagship rail renders a broken-looking "?" in every consumer app until someone reverse-
engineers this.

**Consumer workaround used here** (a Vite alias, because bare-specifier resolution is blocked):

```js
// vite.config.js
resolve: { alias: { 'observeops-ds-logos':
  resolve(root, 'node_modules/@mtdt/observeops-ds-elements/dist/observeops-logos.js') } }
```
```js
import 'observeops-ds-logos'   // populates globalThis.__OBS_LOGOS__
```

**Ask (any one fixes it):**
- Add `"./logos": "./dist/observeops-logos.js"` to `exports`, and document it in `get_setup`; **or**
- have the elements bundle lazy-import the logos bundle on first `obs-logo` mount; **or**
- inline the handful of brand marks so the rail's default always resolves.

Also worth deciding: 1.6 MB for 291 logos is a lot to load eagerly. A per-logo dynamic import, or a
split brand-marks bundle, would let consumers pay only for what they render.

---

## G10 — `elements-api.json` documents attributes and events, but never slots

**Class: DS — discoverability. Severity: highest — it caused three separate defects.**

The file describes itself as *"The ACTUAL API of each obs-* web component (parsed from the element
source), for tools that need to discover attributes/events without reverse-engineering the shadow
DOM."* It is the natural ground truth for a machine consumer, and was used as such.

**It contains no slot information at all.** These slots exist and were found only by decompiling the
bundle:

| Element | Slots that exist | What went wrong without them |
|---|---|---|
| `obs-drawer` | `actions` (pinned footer) | Footer buttons were put in the body and floated mid-panel |
| `obs-sidebar` | `logo`, `default`, `tabs-action`, `search-action` | Rail rendered the "?" placeholder |
| `obs-app-header` | `brand`, `user`, `title`, `breadcrumb`, `back`, `before` | No brand mark or wordmark |

The same file also omits **enum values for string props**. `obs-drawer`'s `footer` preset is
documented only as a source comment:

```
// built-in footer preset — used ONLY when the `actions` slot is empty. Values:
//   close · cancel-save · reset-cancel-save · delete-split · note-split
```

`delete-split` is *exactly* the Delete-left / Cancel-Save-right footer this feature needed. It was
never discovered from the published API.

**Ask:** add `slots` and prop `enum` values to `elements-api.json`. A consumer reading only that file
currently cannot discover half the composition API — and gets no signal that anything is missing.

---

## G1 — `obs-table` cannot put a component or icon in a cell

**Class: DS — capability.** Blocks four columns of the product's own Report grid.

Cell values are **escaped as text**. A probe passing `<obs-switch …>` and `<obs-icon …>` as cell
values rendered the literal markup as visible source. The column `type` enum is:

```
bar | button | color | dot | heat | severity | sparkline | status | tags
```

No `switch`/`toggle`, `star`/`favorite`, `link`, or `icon` member; no per-cell slot or render hook.

| Product column | Needs | Fallback used |
|---|---|---|
| SCHEDULE — ON/OFF toggle + calendar icon | `obs-switch` in a cell | `type: 'status'` → an On/Off pill |
| Favourite ★ per row | clickable `obs-icon` in a cell | omitted |
| DESCRIPTION — doc icon + link | icon + link in a cell | plain text |
| DOWNLOAD — icon buttons | `obs-button` in a cell | omitted |

The row `⋯` actions menu (`row-actions`) and the pagination footer both work and match the product
exactly — the gap is specifically **cell content**, not the grid.

**Ask:** a per-column `render`/slot hook, or `type: 'switch' | 'icon' | 'link'` cell types.

---

## G9 — `obs-filters` is `referenceOnly`: the FilterBar cannot be wired

**Class: DS — capability.** ~50× usage in product, recomposed by hand every time.

The `Type` / `Report Type` / `+ Filter` row is the catalogue's **FilterBar** archetype
(`filters`, `kind="bar"`): *"an inline CHIP bar — field·operator·value chips (default-chips have no ×)
+ '+ Filter' + a Match All/Any toggle + Clear All."* The component also covers `expression | quick |
row | vertical`.

But the whole component is `referenceOnly: true`, and its own known-issue states:

> "The obs-filters WEB COMPONENT is reference-only: chips/fields are hardcoded — no `fields`/`value`
> prop, no selection event, so it can't be wired to data. COMPOSE a working filter bar from
> obs-select + obs-radio + obs-button + tokens."

**Ask:** give `obs-filters` `fields`/`value` props and a `change` event, so the 50× FilterBar does not
have to be rebuilt per screen.

Two mechanics found while composing it:
- **`trigger-label` is ignored by `trigger="chip"`** — the API note scopes it to the *button/icon*
  trigger, so a chip-trigger select falls back to the placeholder and renders "Select" instead of the
  field name. Use `trigger="button"` for a fixed label.
- **The `hidden` attribute does not hide a DS element.** Its `:host` sets an explicit `display`, which
  beats the UA's `[hidden] { display: none }`. Conditional controls need
  `[hidden] { display: none !important }` in the host stylesheet. Consider adding
  `:host([hidden]) { display: none }` to every element.

---

## G0 — no functional app shell, and no whole-screen recipe

**Class: DS — capability (with a large consumer contribution — see the honesty note).**

The feature was first built onto a bare page — a category list and a placeholder heading — with no
app shell, module header, tabs, or grid. Three DS factors made that the path of least resistance:

1. **`obs-layout-appshell` is `referenceOnly`.** The DS's own app-shell renders but carries no data
   contract, so there is no "start from the shell" component. Regions must be hand-assembled, which
   makes *not* building a shell the default.
2. **No recipe describes a whole module screen.** `get_recipe` offers `list-view`, `explorer-view`,
   `detail-view`, `dashboard-view`. `list-view` covers page-header → filter → table → pagination →
   drawer and **stops at the content area** — it never mentions the module rail, app header, module
   title strip, or module tab row. Following it faithfully still yields a fragment.
3. **`search_components` does not surface `side-menu`.** "side menu", "left nav category list", and
   "list of saved views" all return `navigation`. The dedicated `side-menu` registry entry — whose
   `list` variant names this exact panel, *"All Reports (active) · ★ Favorites · user categories"*,
   `asSeenIn: report-sidebar.vue` — had to be found by grepping the package directory.

**Ask, in priority order:**
- Give `obs-layout-appshell` a real data contract, or ship a `module-screen` recipe covering
  **rail → app header → module title → module tabs → side-menu → content**.
- State it explicitly in `get_setup` or the recipe index: *a screen starts from the app shell; a bare
  content page is a harness, not a screen.*
- Fix search indexing so `side-menu` is discoverable by its obvious phrasings.

> **Honesty note.** The largest cause here was not the DS. The design spec cited four reference
> screenshots (`ss1.png`–`ss4.png`) at a Windows path from the authoring machine; they were not in the
> repo, and the implementer never checked they existed nor flagged their absence, then followed a plan
> task scoped as a "conformance harness" literally. The DS improvements above reduce the blast radius;
> they do not remove that cause.

---

## G7 — the documented CSS import path is not in the package's `exports`

**Class: DS — packaging.** First-run failure: the documented snippet throws.

`get_setup` prints:

```js
import '@mtdt/observeops-ds-css/dist/observeops-ds.css'
```

which fails under Vite: *"is not exported under the conditions ["module","browser","development",
"import"]"*. The package's `exports` map only maps `.` and `./observeops-ds.css`.

**Correct:** `import '@mtdt/observeops-ds-css/observeops-ds.css'`

**Ask:** fix the snippet in `get_setup`, or add `./dist/*` to `exports`. Same root cause as G12 —
worth auditing every published import path against the `exports` maps.

---

## G2 — no inline-banner component, and no info-surface token

**Class: DS — capability.**

The spec calls for an info banner ("Visible to all users in the organization." / "Only the Users or
User Profiles you add can view this dashboard."). Four `search_components` phrasings (inline banner /
notice / alert / callout / helper text) return **no matching component**, and `resolve_token` has no
info-surface background under any purpose phrase tried.

**Workaround used, declared:** the banner surface uses `var(--neutral-lightest)`, whose catalogued
purpose is *row hover / selected-segment fill* — a deliberate off-purpose reuse, because no
info-surface token exists. Not a hardcoded colour; the "never hardcode" rule still holds.

**Ask:** an inline banner/notice component, or at minimum an `--info-surface` token so the
reproduction is honest.

---

## G3 — no open-lock glyph, and `unlockAlt` is mislabeled

**Class: DS — capability + a naming defect.**

All 547 glyphs were rendered and inspected. Only three match `lock`:

| Key | Renders as |
|---|---|
| `lockAlt` | ✅ closed padlock with keyhole |
| `locks` | closed padlock (no keyhole) |
| `unlockAlt` | ❌ **an undo / counter-clockwise rotate arrow** — not a lock at all |

**There is no open padlock in the library.** A feature whose core visual is open-lock/closed-lock
cannot be built, and `unlockAlt` will silently ship the wrong icon to anyone who trusts the name.

**Resolved here** by using `globe` for Public and `lockAlt` for Private.

**Ask:** add an open-padlock glyph, and rename `unlockAlt` to what it actually draws (`undo` /
`rotateLeft`).

---

## G5 — three different option shapes across the form elements

**Class: DS — discoverability.** Fails silently, which is what makes it expensive.

| Element | Option shape |
|---|---|
| `obs-radio`, `obs-select` | `{value, text}` |
| `obs-tabs` | `{key, label}` |
| catalogue docs for `dropdown-picker` | `{key, text}` ← matches neither element |

Each was found only by rendering. A wrong shape produces **no error**:
- `obs-tabs` with `{value,label}` → an empty tab bar.
- `obs-select` with `{key,text}` → the trigger renders the raw key (`user:u1`) instead of the label.

Two related `obs-select` mechanics:
- **It carries string keys only** — handing it objects renders `[object Object]`. Richer domain
  entries must be encoded to a key string and decoded on `change`.
- **Assign object-valued props after insertion.** Setting `.options`/`.value` on a not-yet-upgraded
  element can leave plain own-properties shadowing the element's accessors.

**Ask:** one option shape across all elements (or accept all three), and warn on unrecognised shapes
instead of rendering empty.

---

## G8 — `validate_render` rejects components that exist and pass conformance

**Class: DS — discoverability.**

`validate_render` returns *"unknown-component … Not in the DS — use search_components, or STOP AND
ASK"* for `sidebar`, `app-header`, and `icon`. All three are registered, non-`referenceOnly` elements
with real APIs, and the same page using them scores **100/100** in the conformance checker.

The two validators disagree because the registry is indexed by Vue-component id while the elements
package ships more than the registry catalogues. Following the contract literally ("never invent a
component — STOP and ASK") would block work on components that demonstrably exist.

**Ask:** registry entries for the shipped-but-uncatalogued elements, or a note that
`validate_render`'s component list is Vue-id-based and not authoritative for `obs-*` tags.

---

## G13 — `obs-table` has no sticky header, and `header-style` gives no guidance on which to use

**Class: DS — capability (sticky) + DS — discoverability (which style).**

Two separate problems with the grid header.

### 13a — no sticky header

The product's Report grid keeps its header row visible while the body scrolls. `obs-table` cannot.
Searching the whole bundle for `position: sticky` returns exactly two rules, and **neither is the
grid's `<thead>`**:

```
.menu-head    { … position:sticky; top:0; … }   ← obs-side-menu's section header
.v-sticky .bar{ position:sticky; top:0; z-index:2; … }   ← a toolbar bar
```

There is no `sticky-header` prop, no `sticky` variant, and no exposed part for the header row.

**Consumer workaround used here** — injecting the rule into the table's shadow root, the same
fragile pattern G4 forces for the side menu:

```js
const style = document.createElement('style')
style.textContent = `thead th { position: sticky; top: 0; z-index: 2;
                                background: var(--page-background-color); }`
table.shadowRoot.appendChild(style)
```

This depends on the internal `thead th` structure and breaks silently if the markup changes.

**Ask:** a `sticky-header` boolean on `obs-table` (the `.v-sticky` pattern already exists elsewhere in
the bundle, so the convention is established), or a `::part(header)` so consumers can style it without
reaching into the shadow root.

### 13b — `header-style` does not say which value the product uses

`header-style` accepts `default` (transparent `.k-grid`) and `tinted` (`.item-list-table`, painting
`--grid-header-bg` = `#ecf1f9`). Nothing in the registry, the element API, or the `list-view` recipe
says **which one the product's list screens actually use**.

`tinted` was chosen and shipped a grey header band that the real Report screen does not have. The
correct value is `default`. A wrong guess here is invisible to every automated check — conformance
scored **100/100** with the wrong header style, because both values are legitimate DS styles.

**Ask:** state the default-for-list-screens in the registry (`list-view` recipe → "grid header:
`header-style="default"`"), or flip the element's own default so the common case needs no attribute.

---

## G14 — there is no inventory of logo names

**Class: DS — discoverability.** This is why the brand mark was declared "missing" and a placeholder
was hand-drawn instead.

The `motadata` logo **does exist** in `observeops-logos.js`. It was not found because:

1. **There is no logo-name index.** No `logos.json`, no `list_logos` MCP tool, no documented name
   list, nothing in `elements-api.json`. `obs-logo`'s only documentation is
   *"monitor-type/logo key (case- & space-insensitive; aliases ok)"* — which never says **what keys
   exist**. The only way to enumerate them is to parse a **1.6 MB minified bundle**.
2. **The entries are not uniformly shaped.** Most logos are inline SVG strings; `motadata` is a
   **base64 PNG data URI**. An extraction pass written for `name: "<svg…"` silently skips it — which
   is exactly what happened. The conclusion drawn was "the DS ships 291 logos, none of them a brand
   mark", and a placeholder SVG was hand-drawn into the app.
3. **G12 masked the error.** Even had the name been guessed correctly, `obs-logo name="motadata"`
   would still have rendered "?" because the logos bundle cannot be imported. There was no way to
   distinguish "this logo does not exist" from "logos are not loaded" — both render an identical
   placeholder.

**The compounding failure mode:** a consumer sees "?", checks the library, extracts the names with a
reasonable heuristic, finds no brand mark, and *fabricates one*. A hand-drawn approximation of a
company's brand mark then ships in an app. That is a bad outcome from a discoverability gap.

**Ask:**
- Publish a logo-name index (`logos.json`, or a `list_logos` / `search_logos` MCP tool). Given the DS
  already has `search_components` and `resolve_token`, a `resolve_logo` would fit the existing shape.
- Make `obs-logo` **warn on an unresolved name** (`console.warn('obs-logo: unknown name "x"')`) and
  render a *distinct* state for "not loaded" vs "unknown name". A silent "?" for both is what turned a
  5-minute lookup into a wrong conclusion.
- Normalise logo entries to one representation, or document that some are data URIs.

---

## G6 — `obs-modal variant="confirm"` drops `title`; `confirm-variant="error"` is an outline

**Class: DS — capability. Severity: minor.**

- The `confirm` variant renders **icon + message + footer only** — a `title="…"` is silently dropped.
  The heading has to be repeated in the content.
- `confirm-variant="error"` renders a red **outline** button, not the solid red fill that
  `obs-button variant="error"` gives. The modal's own error treatment (red ring + red icon) carries
  the destructive signal instead.

**Ask:** render `title` in the confirm variant, or document that it is ignored.

---

## G4 — `obs-side-menu` scope boundary (not a defect)

**Class: none — documented to prevent a false lead.**

An earlier draft of this report listed the side-menu's missing delete affordance and select-only
events as gaps. **That was a mischaracterisation.** `side-menu.json`'s own known-issue states:

> "obs-side-menu is a render-faithful reproduction of the four product side-menu forms... Virtualisation,
> inline rename (pencil), **create/delete affordances**, and the router/filter wiring **are the
> consumer's**; obs-side-menu provides the searchable accordion/tree chrome + select/tab/search events."

So this is a **deliberate scope boundary**, not a defect. The component was used as intended and
extended by the consumer.

Two observations that may still be worth acting on:

1. **The pencil is rendered but not addressable.** `edit: true` draws a pencil, but clicking it emits
   **`select`** with the same payload as a row click, so a consumer cannot tell "select this category"
   from "edit this category". Wiring it required binding through the open shadow root on the internal
   `.pencil` class — which will break silently if that class is renamed.
2. **Rows have no focusable controls.** Probing all four modes (`sections`/`categories`/`tree`/`list`)
   reported `focusable = 0` in every one; the pencil is a bare `<obs-icon>` with no `aria-label`,
   `tabindex`, or keyboard activation (catalogue-wide SF-001).

**Ask (optional):** distinct `edit`/`delete` events and a `delete` field on the item schema. Either
would remove the need for consumers to reach into the shadow DOM, and would let the accessibility
improvements live in the DS rather than in each consumer.

---

## Appendix — things that worked well

Worth recording so the good parts are not lost in a gap report:

- **`ds-conformance.mjs` is excellent.** It caught a raw `<button>` that every other check passed, it
  scores four independent dimensions, and it drives the system Chrome via `executablePath` so it needs
  no browser download. One caveat: **without `playwright-core` it exits 2 after printing a single
  line**, which reads like a pass if you are not watching. Consider making the failure louder.
- **`resolve_token`'s purpose-map** ("muted text", "card surface") is the right interface — it returns
  the token *and* both theme values. It only frustrated where a purpose was genuinely missing
  (destructive colour, info surface).
- **Component `knownIssues` are unusually honest** — `obs-filters` telling consumers to compose the bar
  themselves, and `side-menu` naming its own scope boundary, both prevented worse mistakes.
- **`obs-drawer`, `obs-modal`, `obs-table` and `obs-side-menu` are far more capable than `get_setup`
  suggests.** `get_setup` says organisms "are NOT shipped yet (table, drawer, modal, menu,
  toolbars/page-header, pagination)" — but all of those ship as real, functional elements. That prose
  is stale and actively discourages using them.
- **Restyling through exposed custom properties works beautifully.** Retargeting
  `--button-transparent-hover-text` at `--primary` restyled a button's hover state from outside its
  shadow DOM with no piercing and no hardcoded colour — and conformance stayed at 100/100. More
  elements exposing their internals as custom properties would reduce consumer workarounds a lot.

---

### New finding — G32: `elements-api.json` documents event NAMES but never their `detail` payloads

`elements-api.json` earns its keep — it is the reason "never guess a component's API" is workable.
But for events it lists only names:

```json
"events": ["change", "sort", "rowaction", "pagechange", "rowclick", "edit", "save", …]
```

There is no payload shape. The file's own `$note` says events "deliver the value in `event.detail`
as an ARRAY (unwrap `detail[0]`)" — which says how to unwrap, never what is inside.

**Repro.** The WAN Link list opens a detail drawer on row click. The obvious reading of `rowclick`
is that it hands you the row:

```js
table.addEventListener('rowclick', (event) => {
  const link = LINKS.find((l) => l.id === event.detail[0].id)   // undefined, every time
  …
})
```

`obs-table` emits the **row key as a bare string**. A live probe on the rendered page:

```
events fired: [["rowclick","[\"l10\"]"]]
```

so `detail[0]` is `'l10'`, and `detail[0].id` is `undefined`. **The drawer silently never opened.**
Nothing threw, nothing logged, and the unit tests passed — they dispatched the shape the consumer
had assumed, so they asserted the bug. Only clicking a real row in a real browser found it.

This is the same class as **G10** (slots omitted): the manifest is trusted precisely because it is
"the ACTUAL API … parsed from the element source", so a consumer reasonably reads a missing payload
as "there is nothing to know", not "this was not extracted".

**Consumer workaround:** accept both shapes, and pin the real one with a test.

```js
const payload = Array.isArray(event.detail) ? event.detail[0] : event.detail
const id = typeof payload === 'string' ? payload : payload?.id
```

**Ask:** extract the `detail` payload alongside each event name, the way attributes already carry
`type` and `note` — e.g. `{ name: 'rowclick', detail: 'String  // the row-key value' }`. Ten words
per event would have removed an entire debugging cycle, and the failure mode is silent.

**Class: DS — discoverability.**

---

### New finding — G33: `obs-table` copies the consumer's `id` onto an internal shadow-DOM element

Give the grid an id and the component reproduces it inside its own shadow root:

```
locator('#wan-link-table') resolved to 2 elements:
  1) <obs-table … id="wan-link-table">          the host, ours
  2) <div class="wrap" id="wan-link-table">…    obs-table's internal wrapper
```

Any shadow-piercing selector engine — Playwright's included — now matches twice, and a strict-mode
locator throws outright:

```
locator.waitFor: Error: strict mode violation
```

Duplicate ids across shadow boundaries are legal DOM, so nothing warns. But an internal node has no
business carrying an identifier the consumer chose: it makes the consumer's own id ambiguous to
every tool that pierces shadow roots, which is exactly the tooling this project's method depends on
("verify by rendering, never by reading").

**Consumer workaround:** never select the grid by bare id — always qualify by tag,
`obs-table#wan-link-table`.

**Ask:** give the internal wrapper its own name (a `part`, or an id derived from the host's, or no
id at all). Consumers should be able to address their own element by the id they set.

**Class: DS — capability (minor, but it breaks tooling).**

---

### New finding — G34: no chart element, on a design system whose product is full of charts

The DS ships **47 elements and not one of them draws a series.** Searching for
`chart|graph|plot|spark|gauge|donut|viz` returns three, none of which plots anything:

| Element | What it is |
|---|---|
| `obs-dataviz-tooltip` | the tooltip *around* a chart |
| `obs-metric-list` | no attributes, no slots in `elements-api.json` |
| `obs-metric-picker` | choosing a metric, not drawing it |

The DS knows this. `tokens/chart-palette.json` says so plainly:

> The product's CATEGORICAL chart series palette (**Highcharts**) … Source of truth:
> `src/utils/chart-colors.js`

So charts live in the product, behind a library the DS does not expose. A WAN Link monitor screen is
six time-series charts and a donut — the DS covers its shell, its grid, its drawers and its
severity chips, and then stops at the thing the screen exists to show.

**Consumer workaround — and credit where it is due.** The charts are hand-rolled inline SVG, but
they are *not* off-system: the DS ships 28 `--chart-*` custom properties, and every one of them is
used. Series hues are consumed **in palette order** per the palette's own rule, so nothing is
hand-picked, and light/dark come free:

```js
export const SERIES_TOKENS = ['--chart-vivid-teal', '--chart-sunset-orange', … ]
export const seriesToken = (i) => SERIES_TOKENS[i % SERIES_TOKENS.length]
```

Verified on the rendered page: 19 plotted series, **0 unresolved strokes**, 4 distinct hues, and the
no-hardcoded-colours guard passes across all of `src/`. The tokens did their job. What is missing is
the element.

**Ask:** publish the product's Highcharts wrapper as `obs-chart` — series, axes, legend, tooltip,
theme, taking the palette automatically. Failing that, publish the *chrome* (axis, legend,
`obs-dataviz-tooltip` wiring) so consumers hand-roll only the plot. Every consumer building a
monitoring surface will otherwise rebuild axes and legends, and each will drift from the product.

**Class: DS — capability.**

---

### G34 — ⚖️ ANSWERED in spec@0.1.210, and the answer is "by design"

The gap asked for `obs-chart`. **The DS has now answered it, explicitly and in writing.** A new
registry entry, `components/registry/data-viz.json`, states the position:

> The product's charts, stat tiles, topology graph and dashboard grid — a decision GUIDE, not a web
> component. Charts are Highcharts v10, topology is Cytoscape, the dashboard grid is
> vue-grid-layout: **all app-rendered and licensed/heavy, so the DS does not ship an `obs-*` for
> them.**

That closes the ask. It is a legitimate answer — a licensed charting engine is a poor fit for a
component library — and it is far better documented than the silence that produced the original
finding. Two things in it change how a consumer should behave, and both are new:

1. **The colour rule is now explicit**, and matches what this screen already does: "Colour series
   from the categorical palette / severity tokens, never the brand navy `--primary`." Our charts
   consume `SERIES_TOKENS` in palette order; verified again after the upgrade — 19 series, 0
   unresolved strokes, all `--chart-*`.
2. **Standalone consumers are told to stop and ask**: render "with the product's Chart/Graph/Widgets
   component (in-repo) or **STOP-and-ASK (standalone)**." This app is standalone. So the hand-rolled
   SVG is no longer an unsanctioned workaround — it is the case the DS says to raise, and this is
   the raising of it.

**Remaining ask:** publish the *chrome* — axis, gridline, legend, and `obs-dataviz-tooltip` wiring —
as a headless container an app-rendered plot can sit inside. Every standalone consumer currently
rebuilds axes and legends by hand and each will drift from the product.

---

### New finding — G35: the 32 chart fixtures are documented but not published

`data-viz.json` in spec@0.1.210 announces real, usable material:

> The DS now ships **32 CAPTURED chart configurations across 9 categories** — the product's own
> chart-builder output, sanitised. They are shipped in this spec package under `charts/` (config
> JSON per fixture) with an index at `charts/manifest.json`.

This is exactly what a standalone consumer needs: not a component, but the product's own configs to
copy. **The directory is not in the package.**

```
$ ls node_modules/@mtdt/observeops-ds-spec/
AGENTS.md  README.md  authoring-playbook.md  components  conformance
elements-api.json  foundation  index.js  layout  llms.txt  package.json
spec.manifest.json  tokens

$ find . -iname "*chart*"
./tokens/chart-palette.json          # the palette, and nothing else
```

`package.json` shows why — `files` never lists it:

```json
"files": ["index.js","elements-api.json","AGENTS.md","llms.txt","authoring-playbook.md",
          "spec.manifest.json","components/","tokens/","layout/","foundation/",
          "conformance/","README.md"]
```

`exports` has a `"./*"` passthrough, so the path would resolve if the files were there. They are
not: this is the tarball's `files` allow-list, the same packaging class as **G7** (the documented
CSS import path missing from `exports`).

The cost is specific. The registry sends a standalone consumer down exactly one supported road —
copy a fixture's `config`, render it with Highcharts — and that road is unreachable from npm. The
showcase is named as an alternative, but a URL cannot be diffed, version-pinned or read by a build.

**Consumer workaround:** none for the configs themselves. The hand-rolled SVG stays, coloured from
`--chart-*`, which the same registry entry endorses.

**Ask:** add `"charts/"` to `files` in `@mtdt/observeops-ds-spec`. If the fixtures are meant to ship
elsewhere, correct `data-viz.json` — it currently names this package twice.

**Class: DS — packaging.**

---

### New finding — G36: `obs-table` cannot pin its pager to the bottom of a taller container

Every monitor list in the product ends in one band at the **bottom of the page**: pagination, page
size, the severity legend and the item count, on one line. `obs-table` renders its own pager
immediately after the rows, at the table's content height. With three rows that lands the pager
mid-page, roughly 400px above where the product puts it.

**The host stretches; the internals do not.** Measured on the rendered page:

| | height |
|---|---|
| `obs-table` host (a flex child, `flex: 1 1 auto`) | **605px** |
| its internal `.wrap` | **183px** |
| `.pager` bottom | **429px**, against a host bottom of 851px |

Every outside lever was tried, and none moves it:

- `max-height="100%"` + `sticky-header` — documented as "cap the grid height + scroll the body", but
  it only *caps*; with three rows there is nothing to scroll and the wrap stays at content height.
- A **definite** host height (`height: 500px`, and `display:flex; flex-direction:column` with it) —
  wrap 183px, pager 429px, unchanged in both cases.
- `::part()` — `obs-table` exposes **no parts at all**: `shadowRoot.querySelectorAll('[part]')`
  returns an empty list.
- No `height`, `fill` or `stretch` attribute exists in `elements-api.json`.

Injecting `.wrap{height:100%;display:flex;flex-direction:column}` **into the shadow root** did not
move it either (429 → 429), so this is not a percentage-resolution problem a consumer could solve
even by piercing — the component sizes itself to its content.

**Consumer workaround:** turn the pager off with the documented `page-size="0"` and rebuild the whole
band — first/prev/next/last, the page-size select, legend and count — from `obs-button`,
`obs-icon`, `obs-select` and `obs-severity`. That is what this screen does. It reaches 100/100 and
0 raw controls, so nothing is off-system; it is simply a component's own footer rebuilt by hand.

**Ask:** either let the grid fill its host (a `fill`/`stretch` attribute, or `:host{height:100%}`
with an internal flex column), or expose the pager as a `part` so a consumer can place it. A
bottom-pinned list footer is the shape of every list screen in the product.

**Class: DS — capability.**

---

### New finding — G37: the conformance checker scores a **disabled** `obs-button` as off-reference

The four pager arrows are `disabled`, because the list has one page — the same greyed state the
product shows. That alone drops the screen from **100/100 to 91/100**, component 100 → 69:

```
OVERALL: 91/100  ·  token 100  component 69  philosophy 100  layout 100
  ✗ <obs-button variant="neutral-lightest"> renders off-reference
    (bg rgb(236, 241, 249) vs rgb(236, 241, 249)) — variant looks overridden,
    not the real "neutral-lightest"
```

**The failure line reports the same colour on both sides.** Nothing is overridden: the two export
buttons in the toolbar above use the identical `variant="neutral-lightest" squared` and pass. The
only difference is the `disabled` attribute — a first-class, documented property of the component.
Removing it restores 100/100 with 0 off-ref; adding it back drops it again. Nothing else changes.

So the checker appears to compare a disabled instance against an enabled reference render, find a
difference in some property it does not print, and report it as an overridden variant while
displaying matching backgrounds.

**Consumer decision:** the `disabled` state is kept. It is the correct affordance — enabled-looking
arrows that do nothing are a worse product than greyed ones — and this repo already has precedent
for choosing the product over the score (**G31**, where a raw anchor was kept deliberately). The
deploy workflow gates on tests, build and the colour guard, not on conformance, so nothing is
blocked. This is the same family as **G8**: the checker rejecting valid work.

**Ask:** compare a disabled component against a disabled reference, and print the property that
actually differs rather than one that matches.

**Class: DS — discoverability (tooling).**
