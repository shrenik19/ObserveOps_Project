# ObserveOps DS — gap report

> **New here?** Read [`PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md) first — it explains what was built,
> which DS components it uses, and how discovery was done. This file assumes that context.

## Status — re-verified against elements 0.1.159 / css 0.1.4 / spec 0.1.197

The DS team shipped fixes across three releases (0.1.143, 0.1.144, 0.1.146). Re-tested by upgrading and rebuilding the same screen
each time. **Thirteen of the eighteen are now closed, and every one of them let the consumer delete a
workaround.**

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
