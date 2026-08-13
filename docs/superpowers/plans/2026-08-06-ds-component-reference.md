# DS Component Reference — Report Category RBAC

> **What this is:** a consumer's-eye record of what each `obs-*` element's API *actually* is — every
> tag, attribute, event, option shape, glyph key and token used to build the Report screen, with the
> places the published docs turned out to be wrong. Verified by rendering, not by reading.
>
> **For DS maintainers:** this is the raw material behind `DS-GAPS.md`. If you are closing G10
> (slots missing from `elements-api.json`) or G5 (three option shapes), the corrections below are
> the evidence.
>
> Sources: the `observeops-ds` MCP server (`search_components` / `get_component` / `get_recipe` /
> `get_layout` / `resolve_token` / `list_gaps`), `elements-api.json`, and — where those were silent —
> the compiled bundle itself. Where sources disagreed, the **rendered result** decided.

Installed versions: `observeops-ds-elements@0.1.141`, `observeops-ds-css@0.1.0`, `observeops-ds-spec@0.1.180`.

## Registration

```js
import '@mtdt/observeops-ds-elements'                // registers the <obs-*> custom elements
import '@mtdt/observeops-ds-css/observeops-ds.css'   // tokens (light + dark)
import 'observeops-ds-logos'                         // via a Vite alias — see below
```

Two corrections to what `get_setup` prints:

1. **The CSS path is `@mtdt/observeops-ds-css/observeops-ds.css`**, not `.../dist/observeops-ds.css`.
   The `dist/` path is absent from the package's `exports` map and throws under Vite.
2. **The logo library must be loaded separately, and cannot be imported by any documented path.**
   `obs-logo` reads `globalThis.__OBS_LOGOS__`; nothing populates it, and every path to
   `dist/observeops-logos.js` is `ERR_PACKAGE_PATH_NOT_EXPORTED`. Without it every `<obs-logo>`
   renders "?", including `obs-sidebar`'s own default. This project loads it through a Vite alias:

   ```js
   // vite.config.js
   resolve: { alias: { 'observeops-ds-logos':
     resolve(root, 'node_modules/@mtdt/observeops-ds-elements/dist/observeops-logos.js') } }
   ```

Dark theme: `data-theme="dark-theme"` on `<html>`.

## Global conventions

- **Event payloads are arrays.** Unwrap: `Array.isArray(e.detail) ? e.detail[0] : e.detail`.
- **`options` accepts three forms** on `obs-radio` / `obs-select`: a comma string, a JSON string, or a
  real JS array assigned as a property (`el.options = [...]`). Prefer the property form.
- **No component exposes a focus ring.** SF-001 is a catalogue-wide accessibility gap; every atom below
  strips `:focus-visible`. Don't treat its absence as our bug.
- **Icon-only controls must carry `aria-label`.**

---

## 1. Text input — `<obs-input>`

The Name field. Confirmed non-`referenceOnly` (has a real data contract).

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `type` | String | `'text'` | text / password / number / search / textarea / datetime |
| `value` | String | — | reflects typed text back to `el.value` |
| `label` | String | — | **form-item label above the field** — the FlotoFormItem pattern, no wrapper needed |
| `help` | String | — | helper/hint text below the field |
| `placeholder` | String | — | never a label substitute |
| `disabled` | Boolean | `false` | used for `edit-builtin` mode |
| `readonly` | Boolean | `false` | selectable but not editable |
| `required` | Boolean | `false` | |
| `error` | Boolean | `false` | red border |
| `error-message` | String | — | inline validation message |
| `allow-clear` | Boolean | `false` | |
| `material` / `no-border` / `block` | Boolean | `false` | style modifiers |
| `prefix-icon` / `suffix-icon` / `prefix` / `suffix` / `addon-before` / `addon-after` | String | — | |

**Events:** `input` (per keystroke), `change` (on blur), `search`, `enterKey`.

> The plan's `⟪INPUT_VALUE_EVENT⟫` should be **`input`** (or `change` if you only want committed values).
> Note this differs from the Vue component, whose v-model event is `update` — that's the Vue API, not the
> element's.

**Tokens used:** `--field-border-color`, `--input-text-color`, `--text-input-bg`,
`--input-placeholder-color`, `--input-suffix-bg`, `--input-suffix-text`, `--input-addon-color`.

## 2. Public/Private toggle — `<obs-radio as-button>`

The DS has no separate "segmented control" component. A segmented control **is** `obs-radio` with
`as-button` (255× in product).

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `options` | String \| Array | — | `[{value, text}]`; `label`/`title` also accepted for the text |
| `value` | String | — | the selected value |
| `as-button` | Boolean | `false` | **set this** — renders the segmented control |
| `size` | String | `'default'` | small / default / large |
| `disabled` | Boolean | `false` | whole group; per-option via `option.disabled` |
| `vertical` | Boolean | `false` | |
| `block` | Boolean | `false` | full-width, segments split evenly |
| `severity` | Boolean | `false` | the borderless alert-severity look — not wanted here |

**Events:** `change` (detail is an array — unwrap).

Decision-flow confirms this is right: *"small compact set (2-5) of always-visible, mutually-exclusive
choices → plain segmented (as-button)"*. Two options, always visible. ✅

**Known issue F4 (medium):** the selected-segment style is context-dependent — standalone it renders the
kit's navy `#111c2c @0.8`; inside a form/panel ancestor, `form.less` overrides to solid `--primary`
with 11px padding. Same markup, different render. Expect the panel context to give the `--primary` look.

## 3. Row controls (lock / pencil / trash) — `<obs-button>` + `<obs-icon>`

**There is no icon-button component.** An icon button is `obs-button` with `squared` (35×35, 365× in
product — the standard row/toolbar icon action) or `shape="circle"` (218×, for floating overlay
controls), with an `<obs-icon>` in the default slot.

`<obs-button>`:

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `variant` | String | `'primary'` | see the variant table below |
| `size` | String | `'default'` | small ≈24px / default ≈34px / large (same height, bigger font) |
| `squared` | Boolean | `false` | **`.squared-button` 35×35 — use for the row pencil/trash** |
| `shape` | String | `''` | `'circle'` → rounded-square icon button (not circular, F7) |
| `disabled` / `loading` / `outline` / `block` / `square` | Boolean | `false` | |

**Events:** none declared — `obs-button` emits no custom events. **Listen for the native `click`.**
So the plan's `⟪ICON_BUTTON_CLICK_EVENT⟫` is **`click`**, and the Task 4 tests that dispatch
`new Event('click', {bubbles: true})` work unchanged.

`<obs-icon>`:

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `name` | String | `''` | icon key from the library |
| `size` | String \| Number | `16` | px (number) or any CSS length |
| `label` | String | `''` | accessible name; **empty → decorative (`aria-hidden`)** |

### Icon glyph keys (rendered and visually verified, not just grepped)

The library holds **547** glyphs. These were rendered at 56–64px and inspected — see
[the open-lock problem](#3-there-is-no-open-lock-glyph).

| Use | Key | Renders as |
|---|---|---|
| **Public** | **`globe`** | ✅ globe — chosen 2026-08-06, see below |
| **Private** | **`lockAlt`** | ✅ closed padlock with keyhole |
| Edit | `pencil` | ✅ pencil |
| Delete | `trash` | ✅ trash can (`trashAlt` also exists) |
| Favorite | `star` | ✅ star outline |
| ~~Public (open lock)~~ | — | ❌ **no such glyph exists** — see below |

**`unlockAlt` is mislabeled in the icon library.** Despite the name it renders an **undo / counter-
clockwise rotate arrow**, not an open padlock. `locks` is a second *closed* padlock (no keyhole).
Those are the only three `lock`-matching keys in the whole library. Do not use `unlockAlt` for
"public" — it reads as "revert".

### Button variants relevant here

| Variant | Renders | Use |
|---|---|---|
| `primary` | navy filled (91×) | the one main action — **Save** |
| `default` | white with border (301×) | secondary beside primary — **Cancel** |
| `error` | red filled (31×) | **destructive — Delete** |
| `transparent` | text-style, no fill (255×) | inline actions — "New Category" |
| `danger` | light ghost (3×) | **avoid** — under-signals danger (F2). Use `error`. |

> `⟪BUTTON_VARIANT_ATTR⟫` = **`variant`**, and the destructive value is **`error`**, not `destructive`.
> Task 5/6 code blocks say `'destructive'` — that is not in the enum and would fall back to navy.

**Known issue F1 (high):** `variant=info|neutral|neutral-light|warning` silently render as navy primary.
Stick to the allow-list above.

## 4. Users / User Profile picker — `<obs-select multiple>`

The catalogue's `dropdown-picker` (FlotoDropdownPicker, 510×) ships as `<obs-select>`.

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `options` | String \| Array | — | **`[{value, text}]`** — see the option-shape warning below |
| `value` | String | — | key, or array of keys when `multiple` |
| `multiple` | Boolean | `false` | **set this** |
| `allow-select-all` | Boolean | `false` | adds Select All |
| `allow-clear` | Boolean | `false` | 218× |
| `searchable` | String | auto by option count | disable with `searchable="false"` |
| `block` | Boolean | `false` | full-width instead of the fixed 240px |
| `placeholder` | String | — | defaults to "Select" |
| `max-values` | Number | `0` | the **real** selection cap (`max-allowed-selection` is dead, F2) |
| `trigger` | String | — | input \| text \| button \| icon \| chip |
| `can-user-add-options` / `add-label` | — | — | inline add, emits `add` |
| `disabled` | Boolean | `false` | multi + disabled → read-only teal pills |

**Events:** `change`, `show`, `hide`, `search`, `add`, `reorder`, `reset`.
`⟪MULTISELECT_VALUE_EVENT⟫` = **`change`**.

> **Option shape: `{value, text}`, not the catalogue's `{key, text}`.** The registry documents
> `{key, text}` as canonical — that is the **Vue** component's shape. The web element resolves an
> option's display as `text ?? value` and matches the current selection on `.value`, so a
> `{key, …}` option never matches and the trigger falls back to rendering the raw key
> (`user:u1` instead of `Alice Chen`). Same `{value, text}` shape as `obs-radio`. Caught by
> rendering; jsdom cannot see it.
>
> **`obs-select` carries string keys only.** Handing it objects renders `[object Object]`. Encode
> richer domain entries into a key string and decode on `change` — `categorySettingsPanel.js` does
> this with `toKey`/`fromKey` for the store's `{type, id}` sharing entries.
>
> **Assign object-valued props after insertion.** Setting `.options`/`.value` on a not-yet-upgraded
> custom element can leave plain own-properties shadowing the element's accessors.

**Known issue F1 (high, a11y) → SF-003:** not an accessible combobox — no `role`/`aria-expanded`,
click-only open, not keyboard-openable. The highest-impact a11y gap in the catalogue (510×). Worth
noting in the feature's a11y section; not something we can fix from here.

## 5. Side panel — `<obs-drawer>`

**This ships as a real web component.** No hand-composition needed.

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `open` | Boolean | `false` | reflected to `el.open` |
| `title` | String | `''` | header text, or use the `title` slot |
| `width` | String \| Number | `'40%'` | Number → px. Product ladder: 360 → 40% → 50-70% → 85-96% |
| `placement` | String | `'right'` | right \| left |
| `mask-closable` | Boolean | `false` | product default: backdrop click does **not** close |
| `scrolled-content` | Boolean \| String | `true` | wrap body in a scroll region |
| `use-padding` | Boolean | `false` | horizontal body padding |
| `esc-closable` | Boolean \| String | `true` | Escape closes |
| `footer` | String | `''` | |

**Events:** `open`, `close`, `after-close`, `update:open`, `footer-action`.

Anatomy: title + built-in close ×, scrollable body, fixed actions footer, dimmed backdrop.
`role=dialog`, focus trapped and restored, Escape closes.

**Known issue F3 (low):** the `.actions` footer is `justify-end` with **no gap** — adjacent buttons
touch. Product convention is `mr-2` on the non-last button. Add `gap: 8px` ourselves.

**Footer layout convention (from the drawer registry):** 2 buttons = Cancel + Save right;
3 = destructive left + confirm group right (`justify-between`). That matches the spec's
"Delete left-aligned, separate from Save/Cancel" exactly.

## 6. Delete confirmation — `<obs-modal variant="confirm">`

**Also ships as a real web component**, and the `confirm` variant is purpose-built for this.

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `open` | Boolean | `false` | |
| `title` | String | `''` | |
| `width` | Number \| String | `560` | confirm variant is 450 in product |
| `variant` | String | `'default'` | **`confirm`** → icon + message + Cancel/action |
| `icon` | String | `''` | confirm-variant icon, a library key (e.g. `timesCircle`) |
| `confirm-text` | String | `'Save'` | → **"Delete"** (name the verb, never "Yes"/"OK") |
| `cancel-text` | String | — | |
| `confirm-variant` | String | — | → **`error`** for destructive |
| `hide-footer` / `no-padding` / `scrollable` / `restrict-width` | — | — | |
| `esc-closable` / `mask-closable` | — | — | |

**Events:** `confirm`, `cancel`, `close`, `show`, `hide`.

**Known issue F1 (medium):** no top-right × and no backdrop-close (both hardcoded false). Escape and the
footer Cancel are the only ways out — always keep a Cancel.

> **The `confirm` variant does not render the `title` attribute.** It draws icon + message + footer
> only, so a title set via `title="…"` is silently dropped. Put the heading in the content instead
> (`deleteConfirmDialog.js` does). Verified by rendering.
>
> **`confirm-variant="error"` renders a red *outline* button, not the solid red fill** that
> `obs-button variant="error"` gives. The modal's own error treatment (red ring around the dialog +
> red icon) carries the destructive signal instead. Noted rather than fought — the shipped component
> owns its chrome.

## 7. Category list container — `<obs-side-menu>`

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `mode` | String | `'sections'` | sections \| categories \| tree \| **list** ← used here |
| `items` | String \| Array | `''` | recursive `[{label, icon?, logo?, count?, favorite?, edit?, children?}]` |
| `active` | String | `''` | **matched by LABEL, not id** — a real gotcha when your model is id-keyed |
| `search` | Boolean \| String | `true` | |
| `placeholder` | String | `'Search'` | |
| `tabs` / `tab-style` / `active-tab` | — | — | `tab-style`: underline (tree/list) \| segmented (categories) |

**Events:** `select`, `search`, `tab` — and only these. `select` fires for **both** a row click and a
pencil click, with the same payload.

**Slots** (absent from `elements-api.json` — found by decompiling): `logo`, `default`, `tabs-action`,
`search-action`. **None of them project row content** — every mode renders rows from `items` alone.

**Empty-`logo` fallback:** `<obs-logo name="motadata" size="26">`. If the logo library has not been
loaded, that renders a "?" placeholder — see the Registration section.

`mode="list"` is the report / saved-views rail, and the registry's example for it is this exact panel.
Sizing: the element is `width: 100%` and fills its container — set the width on your layout column
(~15–25% of the viewport; ~340px if fixed).

Per the project's operating rules: `obs-side-menu` is a flush **white** panel with a right border —
never a gray or rounded card.

> **What it does not provide** — by design, per its own known-issue: create/delete affordances,
> inline-rename behaviour, and router/filter wiring are the consumer's. See
> [decision 2](#2-category-rows--obs-side-menu-modelist-extended-by-the-consumer).

---

## Resolved tokens

Every value below came from `resolve_token` or a component's `resolvedTokens`. **Use the `var(--token)`
name in code — never the hex.** The hexes are here only so the intent is reviewable.

| Use case | Token | Light | Dark |
|---|---|---|---|
| Panel background | `--page-background-color` | `#fff` | `#07101f` |
| Panel / side-menu border | `--border-color` | `#e3e8f2` | `#1d2a3e` |
| Body + panel title text | `--page-text-color` | `#1d2a3e` | `#cad3e2` |
| Lock icon, default icon button, hint text | `--neutral-light` | `#6a7fa0` | `#8e9fbc` |
| Destructive (trash icon, Delete button) | `--secondary-red` | `#ec5b5b` | `#ec5b5b` |
| Row hover / selected-segment fill | `--neutral-lightest` | `#ecf1f9` | `#172336` |
| Segmented selected fill | `--primary` | `#111c2c` | `#e3e8f2` |
| Card / widget surface | `--common-widget-bg` | `#fff` | `#172336` |
| Field border | `--field-border-color` | `#e3e8f2` | `#2b394f` |
| Error/validation surface | `--mesasge-error` | `#fcdbd8` | `#fcdbd8` |

Notes:
- `--secondary-red` resolves through `var(--severity-critical)` and is **identical in both themes**.
- `--mesasge-error` is spelled that way in the DS (typo is upstream, in `observeops-ds.css`). Use it
  verbatim or it won't resolve.
- The overlay/backdrop scrim is **not tokenized** — it's Ant's literal `rgba(0,0,0,.45)` inside the
  drawer/modal internals. We don't set it; `obs-drawer` / `obs-modal` bring their own.
- The purpose-map has **no entry** for a destructive colour by purpose — `"destructive delete danger
  action color"` returns no match. `--secondary-red` was resolved by name after finding it in the CSS.
  Flagging so nobody wastes a round-trip repeating that query.

---

## Gaps → see `docs/DS-GAPS.md`

This file is the **API reference**: what each element's contract actually is, verified by rendering.

The DS gap findings that used to live here have moved to **[`docs/DS-GAPS.md`](../../DS-GAPS.md)**,
which is the single source of truth for them — kept current, classed by where the fix belongs, and
written to be handed to the DS team on its own. Do not re-add gap entries here; two lists diverge.

For what the project is, see **[`docs/PROJECT-CONTEXT.md`](../../PROJECT-CONTEXT.md)**.

## Corrections to the plan's assumptions

Task 2 exists to replace guesses with facts. These plan statements are now known to be wrong:

1. **"Organisms are NOT shipped — compose the drawer and modal from atoms."**
   False for this feature. `obs-drawer` and `obs-modal` are real, registered, non-`referenceOnly`
   custom elements with full attribute/event contracts. `get_setup`'s prose still claims otherwise;
   `elements-api.json` and the registered-element list disprove it. **Tasks 5 and 6 get substantially
   simpler** — no hand-rolled backdrop, focus trap, or Escape handling.

2. **"Declare each organism reproduction via `list_gaps`."**
   Not possible. `list_gaps` takes **no parameters** — it's a read-only listing of what the DS is
   missing (charts, topology graph, dashboard widget-grid). Nothing can be declared through it.
   **Task 8 Step 1 cannot be performed as written.** Since we're using the shipped `obs-drawer` /
   `obs-modal` rather than reproducing organisms, there is also nothing left to declare.

3. **`⟪BUTTON_VARIANT_ATTR⟫` value `'destructive'`** — not in the enum. Use `variant="error"`.

4. **`⟪ICON_BUTTON_CLICK_EVENT⟫`** — `obs-button` declares no custom events; use native `click`.

5. **`⟪INPUT_VALUE_EVENT⟫`** — `input` (or `change`), not the Vue component's `update`.

6. **Project root** — the plan says `D:\Claude design\observeops-app` (Windows). This checkout is at
   `/Users/niravbhatt/Downloads/observeops-app 2`.

7. **The CSS import path in the plan (and in `get_setup`) does not resolve.**
   `@mtdt/observeops-ds-css/dist/observeops-ds.css` throws under Vite:
   *"is not exported under the conditions ["module","browser","development","import"]"*. The package's
   `exports` field only maps `.` and `./observeops-ds.css`. **Use:**

   ```js
   import '@mtdt/observeops-ds-css/observeops-ds.css'   // or: import '@mtdt/observeops-ds-css'
   ```

   Task 7's wiring module copies the broken path from the plan — fix it there.

## Resolved decisions

These were STOP-and-ASK items raised by Task 2 and answered by the user on 2026-08-06.

### 1. Inline banner — reproduction, with a documented token deviation

The design spec (lines 64–65) calls for an *info banner* carrying "Visible to all users in the
organization." / "Only the Users or User Profiles you add can view this dashboard." Four
`search_components` queries (inline banner / notice / alert / callout / helper text) return **no
matching component**, and `resolve_token` has no info-surface background under any purpose phrase
tried. The DS genuinely lacks this.

**Decision: build the tinted banner as a reproduction**, matching `ss4.png`.

**Declared deviation.** The banner surface uses `var(--neutral-lightest)` (`#ecf1f9` light /
`#172336` dark), whose catalogued purpose is *row hover / selected-segment fill*, **not** an
informational surface. This is a deliberate off-purpose reuse of an existing token, made because the
DS defines no info-surface token. It is **not** a hardcoded colour — the global "never hardcode a
hex/rgb/hsl" rule still holds. Text is `--page-text-color`; the leading ⓘ glyph is `--neutral-light`.

If the DS later adds an info-surface token, this is the single place to swap it.

> Note: `list_gaps` cannot record this (it takes no parameters — see correction 2 above), so this
> section **is** the declaration. Worth raising with the DS owners as a genuine catalogue gap.

### 2. Category rows — `obs-side-menu mode="list"`, extended by the consumer

> **This decision was reversed once.** The first verdict was "hand-roll the rows"; the final
> implementation uses the DS component. Both are recorded, because the reasoning behind the reversal
> is the useful part. **The final state is at the end of this section.**

`obs-side-menu` exposes `items: [{label, icon?, count?, favorite?, edit?, children?}]` — a built-in
per-row edit affordance. **Decision: spike it first.** Spike run 2026-08-06 against the live element
(`spike-side-menu.html`, since removed).

**Rendered structure** (shadow DOM):

```
<div class="sm m-categories">
  <div class="srow"><obs-input class="sinput">…</div>   ← built-in search
  <div class="rows">
    <div class="row leaf">
      <obs-icon class="r-ic">      ← the item's `icon` — our lock renders here
      <span class="lbl">           ← label
      <obs-tag class="count">      ← optional `count`
      <obs-icon class="pencil">    ← present only when item.edit is true
      <obs-icon class="fav">       ← optional `favorite` star
```

#### First verdict (superseded): hand-roll `renderCategoryRow`

Only `mode="categories"` was spiked, and the other three modes were inferred from CSS class names.
On that basis the component was rejected for four reasons — no per-row delete, zero focusable
controls, shadow-DOM rows that `[data-role]` hooks and hover CSS cannot reach, and no way to route a
pencil click to the settings panel. `categoryRow.js` was written and shipped (13 tests, still in the
repo but no longer used by the host page).

#### Why it was reversed

Two things surfaced later:

1. **There is a dedicated `side-menu` registry entry**, and its `list` variant names this exact panel:
   *"All Reports (active) · ★ Favorites · user categories"*, `asSeenIn: report-sidebar.vue`. It was
   never found because `search_components` returns `navigation` for every phrasing of "side menu" —
   the entry had to be located by grepping the package directory.
2. **`side-menu.json`'s own known-issue reframes the four objections**:

   > "obs-side-menu is a render-faithful reproduction of the four product side-menu forms…
   > Virtualisation, inline rename (pencil), **create/delete affordances**, and the router/filter
   > wiring **are the consumer's**; obs-side-menu provides the searchable accordion/tree chrome +
   > select/tab/search events."

   So the missing delete and the select-only events are a **deliberate scope boundary, not defects**.
   The component was rejected for doing exactly what it says it does. *(The earlier draft of this
   section, and of `DS-GAPS.md`, filed them as gaps — that was a mischaracterisation.)*

#### Corrections to the spike's findings

All four modes were later probed directly rather than inferred — `sections`, `categories`, `tree`,
`list` — with identical items:

| mode | rows | slots | focusable controls |
|---|---|---|---|
| `sections` | 4 | 0 | 0 |
| `categories` | 4 | 0 | 0 |
| `tree` | 4 | 0 | 0 |
| `list` | 4 | 0 | 0 |

- **Objection 4 was understated, not wrong.** It said "nothing fires on the pencil". In fact clicking
  the pencil fires **`select`**, with the same `detail` payload as clicking the row — so the problem
  is not silence but ambiguity: there is no way to distinguish "select this category" from "edit it".
- **The closing suggestion in the earlier draft was wrong.** It proposed using `obs-side-menu` as a
  container with a hand-rolled `<ul>` in its default slot. **No mode projects slotted children**
  (`slots = 0` everywhere), so that would render nothing.

#### Final state

**`obs-side-menu mode="list"` supplies the rail**; the consumer supplies the affordances the DS
explicitly leaves open, in `augmentSideMenu.js`:

| Provided by the DS | Added by the consumer |
|---|---|
| Search box, flat border-split rows, ★ favourite row | Trash beside the pencil (custom categories only) |
| Active row highlight (weight 500) | The `+` create button in the search row |
| Pencil on hover for `edit: true` rows | Click wiring for the pencil |
| `select` / `search` / `tab` events | `role`/`tabindex`/`aria-label` + Enter/Space on all three |

The augmentation binds through the **open shadow root** on the internal `.row`, `.lbl`, `.pencil` and
`.srow` class names, because no slot or event is exposed for any of it. It is written against a plain
root element so it is fully unit-tested (19 tests), and a `MutationObserver` re-applies it when the
component re-renders rows on search and active changes.

**This is the one piece of the build that could break on a DS patch release** — a rename of any of
those four internal classes would silently disable the row actions. If the DS ever adds a `delete`
field or distinct `edit`/`delete` events, `augmentSideMenu.js` should be deleted.

Worth keeping from the spike either way: the row anatomy (icon → label → count → actions), and the
confirmation that `lockAlt` reads correctly at 16px row size.

### 3. There is no open-lock glyph

The spec asks for an open lock (public) / closed lock (private) pair. Rendering every candidate at
56px showed the library has **no open padlock at all**: `lockAlt` and `locks` are both closed, and
`unlockAlt` is an undo arrow (see the icon table above). Available and correct-rendering alternatives
for "public": `globe`, `users`, `userFriends`, `eye`, `shieldCheck`.

**Decision (2026-08-06): `globe` for Public, `lockAlt` for Private.** Both render correctly and their
silhouettes stay distinct at 16px row size — unlike two padlock variants, which would be easy to
confuse at a glance. This supersedes the design spec's "open lock / closed lock" wording; the spec's
*intent* (an at-a-glance visibility indicator per row) is preserved.

Accessible names follow the glyph, not the metaphor: `aria-label="Public category"` /
`aria-label="Private category"`.
