# SLO on the design system — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship artboards 1, 2 and 6 of the Redundancy SLO design as two routed screens in this app, built from the published DS packages.

**Architecture:** Two screens registered in `src/app/registry.js`. `#/slo/list` is the SLO estate — tiles, and the same estate regrouped under its Business Services. `#/settings/slo-profile` holds two views of one screen: the profile table, and the Create SLO Profile form. Pure store modules (no DOM, no DS) carry the behaviour and the tests; `screen.js` files are wiring only. The Evaluation Logic control is composed at the app level because the DS cannot express it — see the spec's §5.

**Tech Stack:** Vanilla JS + Vite 8, `@mtdt/observeops-ds-elements` / `-ds-css` web components, Vitest + jsdom for units, playwright-core + real Chrome for render verification.

**Spec:** `docs/superpowers/specs/2026-09-08-slo-ds-port-design.md` (and its companion, `2026-09-01-redundancy-slo-design.md`, which owns the model and the copy)

## Global Constraints

- **Node 22.22.2+, 24.15+, or 26+** — `jsdom` refuses older.
- **No hardcoded colours.** Every colour is `var(--token)`. There is not one hex/rgb/hsl in this app's CSS and these files must not be the first. Verified tokens available: `--common-widget-bg`, `--common-main-bg`, `--border-color`, `--page-text-color`, `--common-padd-space`, `--btn-radius`, `--default-tag-bg`, `--default-tag-text-color`, `--input-placeholder-color`, `--neutral-light`, and the `--severity-*` family. Resolve anything else through the MCP `resolve_token` before using it.
- **No invented components — with one recorded exception.** The Evaluation Logic rows (Task 7) are app markup, decided 2026-09-08 and recorded as spec P4. Everywhere else, use the DS component.
- **Never guess a component's API.** `elements-api.json` is a starting point, never proof — it documents no slots for any component (G10) while several accept them. Confirm by rendering.
- **`N` runs `1..M-1`.** `N = M` is unrepresentable. Phase 1 D9.
- **Copy is verbatim from phase 1.** The consequence sentences and the lead line are behaviour, not decoration; they are asserted character-for-character in Task 6.
- **Commit only named paths.** A parallel session shares this branch. Every commit in this plan uses `git add <paths>` followed by `git commit -o <paths>`, never a bare `git commit`.
- **Verification is a probe, not the unit suite.** `npm test` passing is necessary and not sufficient; Task 9 is the verification.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/slo-list/sloStore.js` | The estate: SLOs, their services, grouping, the severest-status rule. No DOM, no DS. |
| `src/slo-list/sloStore.test.js` | Its units. |
| `src/slo-list/screen.js` | Wiring: store ↔ page header ↔ tiles ↔ the briefcase toggle. |
| `src/slo-list/sloList.css` | Tile grid, service headings. Token-only. |
| `src/slo-profile/profiles.js` | The seeded SLO profiles behind the settings table. No DOM, no DS. |
| `src/slo-profile/profiles.test.js` | Its units. |
| `src/slo-profile/evaluation.js` | Mode, quorum, the `1..M-1` clamp, the consequence sentences. No DOM, no DS. |
| `src/slo-profile/evaluation.test.js` | Its units — the heart of the feature. |
| `src/slo-profile/evaluationLogic.js` | The Option G control: two rows, consequence on both, expansion, quorum stepper. |
| `src/slo-profile/evaluationLogic.test.js` | Its units, including keyboard operation. |
| `src/slo-profile/createForm.js` | The Create SLO Profile form (artboard 2). |
| `src/slo-profile/screen.js` | Wiring: the table view, the form view, and the switch between them. |
| `src/slo-profile/sloProfile.css` | Form and control styling. Token-only. |
| `src/app/registry.js` | **Modify** — one new `slo` module, one new Settings screen. |
| `scripts/probe-slo.mjs` | Render verification of all three views, writing `docs/shots/slo-*.png`. |
| `docs/DS-GAPS.md` | **Modify** — G45, G46, G47. |

Tasks 1–3 deliver `#/slo/list` and are shippable without Tasks 4–8. Tasks 4–8 deliver `#/settings/slo-profile`.

---

### Task 1: The estate store

**Files:**
- Create: `src/slo-list/sloStore.js`
- Test: `src/slo-list/sloStore.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `createStore(seed?) -> { list(), services(), groups(), severestOf(slos) }`. `list()` returns SLO objects `{ id, name, service, status, frequency, evaluation, target, achieved, violation }` where `status` is `'up' | 'warning' | 'critical'` and `evaluation` is `null` (Strict) or a quorum string like `'2 of 3'`. `groups()` returns `[{ service, slos, status, count }]` in seed order.

- [ ] **Step 1: Write the failing test**

```js
// src/slo-list/sloStore.test.js
import { describe, it, expect } from 'vitest'
import { createStore } from './sloStore.js'

describe('slo store', () => {
  it('seeds the estate', () => {
    const slos = createStore().list()
    expect(slos).toHaveLength(5)
    expect(slos[0].name).toBe('Checkout Availability')
    expect(slos[0].service).toBe('E-commerce Platform')
  })

  it('groups by service, in seed order, without losing an SLO', () => {
    const groups = createStore().groups()
    expect(groups.map((g) => g.service)).toEqual([
      'E-commerce Platform', 'Network Core', 'Branch Connectivity',
    ])
    expect(groups.map((g) => g.count)).toEqual([3, 1, 1])
    expect(groups.reduce((n, g) => n + g.slos.length, 0)).toBe(5)
  })

  // The rule the whole grouped view exists to express.
  it('gives a service the SEVEREST status of its SLOs, not the first', () => {
    const ecom = createStore().groups()[0]
    expect(ecom.slos.map((s) => s.status)).toEqual(['up', 'up', 'critical'])
    expect(ecom.status).toBe('critical')
  })

  it('ranks warning above ok and below critical', () => {
    const { severestOf } = createStore()
    expect(severestOf([{ status: 'up' }, { status: 'warning' }])).toBe('warning')
    expect(severestOf([{ status: 'warning' }, { status: 'critical' }])).toBe('critical')
    expect(severestOf([{ status: 'up' }, { status: 'up' }])).toBe('up')
    expect(severestOf([])).toBe('up')
  })

  it('states a quorum for a redundant SLO and nothing for a strict one', () => {
    const byName = Object.fromEntries(createStore().list().map((s) => [s.name, s]))
    expect(byName['Checkout Availability'].evaluation).toBe('2 of 3')
    expect(byName['Core Switching Availability'].evaluation).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/slo-list/sloStore.test.js`
Expected: FAIL — `Failed to resolve import "./sloStore.js"`

- [ ] **Step 3: Write minimal implementation**

```js
// src/slo-list/sloStore.js
// The SLO estate behind artboard 1. No DOM and no DS — the screen renders this, and the tests
// assert it without a browser.
//
// `evaluation` is the quorum a redundant SLO holds (`2 of 3`), or null for Strict. It is NEVER a
// count of redundancy groups: one profile carries one group or is Strict, so a count says nothing.
// See 2026-09-01-redundancy-slo-design.md §4.

const SEED = [
  { id: 'slo-checkout', name: 'Checkout Availability', service: 'E-commerce Platform',
    status: 'up', frequency: 'Daily', evaluation: '2 of 3', target: '99%', achieved: '100%', violation: '0%' },
  { id: 'slo-payments', name: 'Payment Gateway Uptime', service: 'E-commerce Platform',
    status: 'up', frequency: 'Daily', evaluation: '3 of 4', target: '99%', achieved: '99.8%', violation: '0.2%' },
  { id: 'slo-search', name: 'Search & Catalogue', service: 'E-commerce Platform',
    status: 'critical', frequency: 'Daily', evaluation: null, target: '99%', achieved: '91.2%', violation: '8.8%' },
  { id: 'slo-core-sw', name: 'Core Switching Availability', service: 'Network Core',
    status: 'critical', frequency: 'Daily', evaluation: null, target: '95%', achieved: '23.9%', violation: '76.1%' },
  { id: 'slo-branch-wan', name: 'Branch WAN Links', service: 'Branch Connectivity',
    status: 'warning', frequency: 'Daily', evaluation: null, target: '98%', achieved: '98.4%', violation: '1.6%' },
]

// Severity order. A service shows the worst thing happening inside it; an average of SLOs with
// different Targets would not mean anything, and "the first one" would be an accident of order.
const RANK = { up: 0, warning: 1, critical: 2 }

export function createStore(seed = SEED) {
  const slos = seed.map((s) => ({ ...s }))

  const severestOf = (list) =>
    list.reduce((worst, s) => (RANK[s.status] > RANK[worst] ? s.status : worst), 'up')

  const services = () => [...new Set(slos.map((s) => s.service))]

  return {
    list: () => slos.map((s) => ({ ...s })),
    services,
    severestOf,
    groups: () =>
      services().map((service) => {
        const members = slos.filter((s) => s.service === service).map((s) => ({ ...s }))
        return { service, slos: members, count: members.length, status: severestOf(members) }
      }),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/slo-list/sloStore.test.js`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/slo-list/sloStore.js src/slo-list/sloStore.test.js
git commit -o src/slo-list/sloStore.js src/slo-list/sloStore.test.js \
  -m "feat(slo): the estate store, and the severest-status rule"
```

---

### Task 2: The SLO list screen — flat tiles, routed

**Files:**
- Create: `src/slo-list/screen.js`, `src/slo-list/sloList.css`
- Modify: `src/app/registry.js` — add the `slo` module
- Test: `src/slo-list/screen.test.js`

**Interfaces:**
- Consumes: `createStore()` from Task 1.
- Produces: `meta`, `mount(root) -> unmount`. Exports `tileHTML(slo)` for Task 3 to reuse.

- [ ] **Step 1: Write the failing test**

```js
// src/slo-list/screen.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from './screen.js'

describe('slo list screen', () => {
  let root
  beforeEach(() => { root = document.createElement('div'); document.body.append(root); mount(root) })

  it('renders one tile per SLO', () => {
    expect(root.querySelectorAll('.slo-tile')).toHaveLength(5)
  })

  it('names the SLO and not its service', () => {
    const first = root.querySelector('.slo-tile')
    expect(first.querySelector('.slo-tile__name').textContent).toBe('Checkout Availability')
    expect(first.querySelector('.slo-tile__service')).toBeNull()
  })

  it('states the quorum in the Evaluation slot, and never a group count', () => {
    const evals = [...root.querySelectorAll('.slo-tile__eval')].map((e) => e.textContent.trim())
    expect(evals[0]).toBe('Redundant · 2 of 3')
    expect(evals.join(' ')).not.toMatch(/group/i)
  })

  it('shows a Strict SLO as Strict', () => {
    const evals = [...root.querySelectorAll('.slo-tile__eval')].map((e) => e.textContent.trim())
    expect(evals).toContain('Strict')
  })

  it('carries the status as a DS severity, not a hand-rolled pill', () => {
    const sev = root.querySelector('.slo-tile obs-severity')
    expect(sev.getAttribute('severity')).toBe('up')
    expect(sev.getAttribute('value')).toBe('Ok')
    expect(sev.getAttribute('shape')).toBe('bg')
  })

  it('draws the shipped list-view control, inert', () => {
    const btn = root.querySelector('#slo-list-view')
    expect(btn).not.toBeNull()
    expect(btn.hasAttribute('disabled')).toBe(true)
  })

  it('does not navigate — the detail screen is not in this build', () => {
    expect(root.querySelector('.slo-tile a')).toBeNull()
    expect(root.querySelector('.slo-tile').getAttribute('href')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/slo-list/screen.test.js`
Expected: FAIL — `Failed to resolve import "./screen.js"`

- [ ] **Step 3: Write the screen**

```js
// src/slo-list/screen.js
// Artboard 1 — the SLO estate. The shipped SLO_1 tile grid plus an Evaluation slot.
//
// The tiles are app markup because the DS has no card component (G47); src/app/cardList.js sets
// the precedent. Everything inside them that the DS does have — the status — is the DS's.

import { pageHeaderHTML } from '../app/pageHeader.js'
import { createStore } from './sloStore.js'
import './sloList.css'

export const meta = { pageHeader: { heading: 'SLO', icon: 'monitor' } }

// obs-severity carries the level; `value` overrides its label so `critical` reads `Breached`.
const STATUS_LABEL = { up: 'Ok', warning: 'Warning', critical: 'Breached' }

export const severityHTML = (status) =>
  `<obs-severity severity="${status}" shape="bg" value="${STATUS_LABEL[status]}"></obs-severity>`

export const tileHTML = (slo) => `
  <article class="slo-tile">
    <header class="slo-tile__head">
      <span class="slo-tile__name">${slo.name}</span>
      ${severityHTML(slo.status)}
    </header>
    <div class="slo-tile__slots">
      <div class="slo-tile__slot"><span class="slo-tile__lb">Type</span><span>Availability</span></div>
      <div class="slo-tile__slot"><span class="slo-tile__lb">Frequency</span><span>${slo.frequency}</span></div>
      <div class="slo-tile__slot">
        <span class="slo-tile__lb">Evaluation</span>
        <span class="slo-tile__eval">${slo.evaluation ? `Redundant · ${slo.evaluation}` : 'Strict'}</span>
      </div>
    </div>
    <div class="slo-tile__nums">
      <div class="slo-tile__num"><b>${slo.target}</b><span>Target</span></div>
      <div class="slo-tile__num"><b>${slo.achieved}</b><span>Achieved</span></div>
      <div class="slo-tile__num"><b>${slo.violation}</b><span>Violation</span></div>
    </div>
  </article>
`

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'SLO', icon: 'monitor' })}
  <div class="app-shell__body">
    <main class="app-shell__content" id="slo-content">
      <obs-toolbar data-role="content-toolbar">
        <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
      </obs-toolbar>
      <div id="slo-cards"></div>
    </main>
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE
  const store = createStore()

  // Tiles do not navigate: artboards 3-5 are not in this build, so a click would lead nowhere.
  // Spec P3.
  root.querySelector('#slo-cards').innerHTML =
    `<div class="slo-grid">${store.list().map(tileHTML).join('')}</div>`

  return function unmount() {}
}
```

- [ ] **Step 4: Write the stylesheet**

```css
/* src/slo-list/sloList.css
   Token-only. Resolve every value through the MCP `resolve_token` before adding it; there is not
   one hex/rgb/hsl in this app's CSS and this file must not be the first. */

#slo-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.slo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--common-padd-space);
}

.slo-tile {
  background: var(--common-widget-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--btn-radius);
  padding: var(--common-padd-space);
  color: var(--page-text-color);
}

.slo-tile__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.slo-tile__name { font-weight: 600; }
.slo-tile__head obs-severity { margin-left: auto; }

.slo-tile__slots,
.slo-tile__nums { display: flex; gap: 14px; }
.slo-tile__slots { margin-bottom: 12px; }

.slo-tile__slot,
.slo-tile__num { flex: 1; min-width: 0; }

.slo-tile__lb,
.slo-tile__num span {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--input-placeholder-color);
}

.slo-tile__num b { display: block; font-size: 19px; font-weight: 600; }
.slo-tile__eval { white-space: nowrap; }
```

- [ ] **Step 5: Register the screen**

In `src/app/registry.js`, add a `slo` module between `monitors` and `alerts`:

```js
  {
    key: 'slo', label: 'SLO', icon: 'monitor',
    screens: [
      {
        key: 'list',
        label: 'SLO',
        description:
          'The SLO estate: Strict and Redundant SLOs side by side, and the same estate regrouped ' +
          'under its Business Services with each service carrying the severest status of its SLOs.',
        load: () => import('../slo-list/screen.js'),
      },
    ],
  },
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- src/slo-list/`
Expected: PASS — 6 screen tests, 5 store tests

- [ ] **Step 7: See it in the browser**

Run `npm run dev`, open `http://localhost:5173/#/slo/list`. Confirm five tiles render with status pills. **Do not skip this**: jsdom has passed on screens that painted nothing in Chrome.

- [ ] **Step 8: Commit**

```bash
git add src/slo-list/screen.js src/slo-list/screen.test.js src/slo-list/sloList.css src/app/registry.js
git commit -o src/slo-list/screen.js src/slo-list/screen.test.js src/slo-list/sloList.css src/app/registry.js \
  -m "feat(slo): the SLO list screen"
```

---

### Task 3: The Business Service view

**Files:**
- Modify: `src/slo-list/screen.js`, `src/slo-list/sloList.css`
- Test: `src/slo-list/screen.test.js`

**Interfaces:**
- Consumes: `store.groups()` from Task 1, `tileHTML` and `severityHTML` from Task 2.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing test**

Append to `src/slo-list/screen.test.js`:

```js
describe('the business service view', () => {
  let root
  const toggle = () => root.querySelector('#slo-bs-toggle').click()
  beforeEach(() => { root = document.createElement('div'); document.body.append(root); mount(root) })

  it('offers a briefcase toggle, off by default', () => {
    const btn = root.querySelector('#slo-bs-toggle')
    expect(btn.querySelector('obs-icon').getAttribute('name')).toBe('businessService')
    expect(root.querySelectorAll('.slo-group')).toHaveLength(0)
  })

  it('regroups the estate under its services', () => {
    toggle()
    const heads = [...root.querySelectorAll('.slo-group__name')].map((e) => e.textContent.trim())
    expect(heads).toEqual(['E-commerce Platform', 'Network Core', 'Branch Connectivity'])
  })

  it('counts each service, singular and plural', () => {
    toggle()
    const counts = [...root.querySelectorAll('.slo-group__count')].map((e) => e.textContent.trim())
    expect(counts).toEqual(['3 SLOs', '1 SLO', '1 SLO'])
  })

  it('shows every SLO exactly once, as a full tile', () => {
    toggle()
    expect(root.querySelectorAll('.slo-group .slo-tile')).toHaveLength(5)
    expect(root.querySelectorAll('.slo-group .slo-tile__nums')).toHaveLength(5)
  })

  // The reason this view exists.
  it('gives a heading the severest status, not the first', () => {
    toggle()
    const ecom = root.querySelector('.slo-group')
    expect(ecom.querySelector('.slo-group__head obs-severity').getAttribute('value')).toBe('Breached')
    const tiles = [...ecom.querySelectorAll('.slo-tile obs-severity')].map((s) => s.getAttribute('value'))
    expect(tiles).toEqual(['Ok', 'Ok', 'Breached'])
  })

  it('toggles back to the flat list', () => {
    toggle(); toggle()
    expect(root.querySelectorAll('.slo-group')).toHaveLength(0)
    expect(root.querySelectorAll('.slo-tile')).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/slo-list/screen.test.js`
Expected: FAIL — `Cannot read properties of null (reading 'querySelector')` on `#slo-bs-toggle`

- [ ] **Step 3: Add the toggle to the template**

In `src/slo-list/screen.js`, replace the `obs-toolbar` block in `TEMPLATE` with:

```js
      <obs-toolbar data-role="content-toolbar">
        <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
        <obs-button id="slo-bs-toggle" variant="default" title="Group by Business Service">
          <obs-icon name="businessService" size="16" label="Group by Business Service"></obs-icon>
        </obs-button>
        <!-- Drawn because SLO_1 has it; inert because the table alternative is out of scope. -->
        <obs-button id="slo-list-view" variant="default" title="List view" disabled>
          <obs-icon name="list" size="16" label="List view"></obs-icon>
        </obs-button>
      </obs-toolbar>
```

- [ ] **Step 4: Render the two views**

In `src/slo-list/screen.js`, add the group renderer above `mount`:

```js
// A service heading names the service once for every SLO beneath it, which is why the tile itself
// does not repeat it. Its status is the SEVEREST among its SLOs — see sloStore.js.
export const groupHTML = (group) => `
  <section class="slo-group">
    <header class="slo-group__head">
      <obs-icon name="businessService" size="16"></obs-icon>
      <span class="slo-group__name">${group.service}</span>
      <span class="slo-group__count">${group.count} ${group.count === 1 ? 'SLO' : 'SLOs'}</span>
      ${severityHTML(group.status)}
    </header>
    <div class="slo-grid">${group.slos.map(tileHTML).join('')}</div>
  </section>
`
```

and replace the body of `mount` after `const store = createStore()` with:

```js
  const cards = root.querySelector('#slo-cards')
  const toggle = root.querySelector('#slo-bs-toggle')
  let grouped = false

  const render = () => {
    cards.innerHTML = grouped
      ? store.groups().map(groupHTML).join('')
      : `<div class="slo-grid">${store.list().map(tileHTML).join('')}</div>`
  }

  const onToggle = () => { grouped = !grouped; toggle.toggleAttribute('active', grouped); render() }
  toggle.addEventListener('click', onToggle)
  render()

  return function unmount() {
    toggle.removeEventListener('click', onToggle)
  }
```

- [ ] **Step 5: Style the headings**

Append to `src/slo-list/sloList.css`:

```css
.slo-group + .slo-group { margin-top: 18px; }

.slo-group__head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 8px;
  color: var(--page-text-color);
}

.slo-group__name { font-weight: 600; }

.slo-group__count {
  font-size: 11px;
  background: var(--default-tag-bg);
  color: var(--default-tag-text-color);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1px 8px;
  white-space: nowrap;
}
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- src/slo-list/`
Expected: PASS — 12 screen tests, 5 store tests

- [ ] **Step 7: Commit**

```bash
git add src/slo-list/screen.js src/slo-list/screen.test.js src/slo-list/sloList.css
git commit -o src/slo-list/screen.js src/slo-list/screen.test.js src/slo-list/sloList.css \
  -m "feat(slo): regroup the estate by business service"
```

---

### Task 4: The SLO profile store

**Files:**
- Create: `src/slo-profile/profiles.js`, `src/slo-profile/profiles.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `createProfileStore(seed?) -> { list(), rows() }`. `rows()` returns table-ready objects with keys `type, name, frequency, evaluation, warning, target, service, start`.

- [ ] **Step 1: Write the failing test**

```js
// src/slo-profile/profiles.test.js
import { describe, it, expect } from 'vitest'
import { createProfileStore } from './profiles.js'

describe('slo profile store', () => {
  it('seeds the shipped profile list', () => {
    expect(createProfileStore().list()).toHaveLength(5)
  })

  it('produces one row per profile, with the shipped columns', () => {
    const [first] = createProfileStore().rows()
    expect(first).toEqual({
      id: 'sp-1', type: 'Availability', name: 'Checkout Availability', frequency: 'Daily',
      evaluation: 'Redundancy', warning: '99.5', target: '99',
      service: 'E-commerce Platform', start: '01-09-2026',
    })
  })

  // A Performance SLO has no evaluation logic — redundancy is an Availability concept, and
  // leaving the cell blank would have it misread as Strict.
  it('reads an em dash for a Performance SLO, never Strict', () => {
    const perf = createProfileStore().rows().find((r) => r.type === 'Performance')
    expect(perf.evaluation).toBe('—')
  })

  it('shows Strict and Redundancy side by side', () => {
    const evals = createProfileStore().rows().map((r) => r.evaluation)
    expect(evals).toContain('Strict')
    expect(evals).toContain('Redundancy')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/slo-profile/profiles.test.js`
Expected: FAIL — `Failed to resolve import "./profiles.js"`

- [ ] **Step 3: Write the store**

```js
// src/slo-profile/profiles.js
// The SLO profiles behind Settings -> Service Level Objective -> SLO Profile (artboard 6).
// Columns are the shipped set from SLO_setup_1, plus EVALUATION LOGIC beside FREQUENCY so the
// evaluation parameters read together.

const SEED = [
  { id: 'sp-1', type: 'Availability', name: 'Checkout Availability', frequency: 'Daily',
    evaluation: 'Redundancy', warning: '99.5', target: '99', service: 'E-commerce Platform', start: '01-09-2026' },
  { id: 'sp-2', type: 'Availability', name: 'API-Gateway-Availability', frequency: 'Weekly',
    evaluation: 'Strict', warning: '91', target: '90', service: 'SLO FOR MAXIS', start: '30-06-2026' },
  { id: 'sp-3', type: 'Performance', name: 'Storage-Volume-Availability', frequency: 'Daily',
    evaluation: '—', warning: '71', target: '70', service: 'SLO RENASUS', start: '31-05-2027' },
  { id: 'sp-4', type: 'Availability', name: 'Up time', frequency: 'Weekly',
    evaluation: 'Strict', warning: '99.29', target: '99.27', service: 'ABC', start: '30-06-2026' },
  { id: 'sp-5', type: 'Availability', name: 'WANLink SLO', frequency: 'Daily',
    evaluation: 'Redundancy', warning: '99', target: '98', service: 'WANLINK Juhu', start: '15-08-2026' },
]

export function createProfileStore(seed = SEED) {
  const profiles = seed.map((p) => ({ ...p }))
  return {
    list: () => profiles.map((p) => ({ ...p })),
    rows: () => profiles.map((p) => ({ ...p })),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/slo-profile/profiles.test.js`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/slo-profile/profiles.js src/slo-profile/profiles.test.js
git commit -o src/slo-profile/profiles.js src/slo-profile/profiles.test.js \
  -m "feat(slo): the SLO profile store"
```

---

### Task 5: The SLO Profile settings screen — the table

**Files:**
- Create: `src/slo-profile/screen.js`, `src/slo-profile/sloProfile.css`, `src/slo-profile/screen.test.js`
- Modify: `src/app/registry.js`

**Interfaces:**
- Consumes: `createProfileStore()` from Task 4.
- Produces: `meta`, `mount(root) -> unmount`.

- [ ] **Step 1: Write the failing test**

```js
// src/slo-profile/screen.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from './screen.js'

describe('slo profile screen', () => {
  let root
  beforeEach(() => { root = document.createElement('div'); document.body.append(root); mount(root) })

  it('renders the profile table', () => {
    expect(root.querySelector('#slo-profile-table')).not.toBeNull()
    expect(root.querySelector('#slo-profile-table').rows).toHaveLength(5)
  })

  it('leads with SLO Type and puts Evaluation Logic beside Frequency', () => {
    const titles = root.querySelector('#slo-profile-table').columns.map((c) => c.title)
    expect(titles[0]).toBe('SLO TYPE')
    expect(titles[titles.indexOf('FREQUENCY') + 1]).toBe('EVALUATION LOGIC')
  })

  it('keeps Warning before Target, as shipped', () => {
    const titles = root.querySelector('#slo-profile-table').columns.map((c) => c.title)
    expect(titles.indexOf('WARNING')).toBeLessThan(titles.indexOf('TARGET'))
  })

  // G1: obs-table cannot host a component in a cell. The column does not need one.
  it('renders Evaluation Logic as plain text', () => {
    const values = root.querySelector('#slo-profile-table').rows.map((r) => r.evaluation)
    expect(values.every((v) => !/[<>]/.test(v))).toBe(true)
    expect(new Set(values)).toEqual(new Set(['Redundancy', 'Strict', '—']))
  })

  it('offers Create SLO Profile', () => {
    expect(root.querySelector('#slo-profile-create')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/slo-profile/screen.test.js`
Expected: FAIL — `Failed to resolve import "./screen.js"`

- [ ] **Step 3: Write the screen**

```js
// src/slo-profile/screen.js
// Settings -> Service Level Objective (BETA) -> SLO Profile. Two views of one screen: the profile
// table (artboard 6) and the Create SLO Profile form (artboard 2). Creating does not change route,
// which is how the shipped product behaves.

import { pageHeaderHTML } from '../app/pageHeader.js'
import { createProfileStore } from './profiles.js'
import './sloProfile.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Settings', icon: 'settings' })}
  <div class="app-shell__body">
    <main class="app-shell__content" id="slo-profile-content">
      <section id="slo-profile-list">
        <obs-toolbar data-role="content-toolbar">
          <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
          <obs-button id="slo-profile-create" variant="primary">Create SLO Profile</obs-button>
        </obs-toolbar>
        <obs-table id="slo-profile-table" row-key="id" page-size="0" sticky-header max-height="100%"></obs-table>
      </section>
      <section id="slo-profile-form" hidden></section>
    </main>
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE
  const store = createProfileStore()

  const table = root.querySelector('#slo-profile-table')
  table.columns = [
    { key: 'type', title: 'SLO TYPE', width: 130, sortable: true },
    { key: 'name', title: 'SLO NAME', sortable: true },
    { key: 'frequency', title: 'FREQUENCY', width: 120, sortable: true },
    // Beside FREQUENCY so the evaluation parameters read together. Plain text: G1 records that
    // obs-table cannot put a component or an icon in a cell.
    { key: 'evaluation', title: 'EVALUATION LOGIC', width: 170, sortable: true },
    { key: 'warning', title: 'WARNING', width: 110, align: 'center' },
    { key: 'target', title: 'TARGET', width: 110, align: 'center' },
    { key: 'service', title: 'BUSINESS SERVICE NAME', width: 220, sortable: true },
    { key: 'start', title: 'START DATE', width: 140 },
  ]
  table.rows = store.rows()

  return function unmount() {}
}
```

- [ ] **Step 4: Write the stylesheet**

```css
/* src/slo-profile/sloProfile.css
   Token-only. Resolve every value through the MCP `resolve_token` before adding it. */

#slo-profile-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

#slo-profile-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

/* The UA's `[hidden] { display: none }` is the weakest rule in the cascade — any author rule
   setting `display` beats it, leaving the element painted while `el.hidden` reads true. jsdom
   reads the property and passes; Chrome shows both views stacked. See wanLinkDiscovery.css. */
#slo-profile-list[hidden],
#slo-profile-form[hidden] { display: none; }
```

- [ ] **Step 5: Register the screen**

In `src/app/registry.js`, add to the `settings` module's `screens` array, after `wan-link-discovery`:

```js
      {
        key: 'slo-profile',
        label: 'SLO Profile',
        description:
          'Settings -> Service Level Objective -> SLO Profile: the shipped profile table with ' +
          'Evaluation Logic beside Frequency, and the Create SLO Profile form behind it.',
        load: () => import('../slo-profile/screen.js'),
      },
```

- [ ] **Step 6: Run the tests, then look at it**

Run: `npm test -- src/slo-profile/`
Expected: PASS — 6 screen tests, 4 store tests

Run `npm run dev`, open `http://localhost:5173/#/settings/slo-profile`. Confirm the table renders with eight columns and five rows.

- [ ] **Step 7: Commit**

```bash
git add src/slo-profile/screen.js src/slo-profile/screen.test.js src/slo-profile/sloProfile.css src/app/registry.js
git commit -o src/slo-profile/screen.js src/slo-profile/screen.test.js src/slo-profile/sloProfile.css src/app/registry.js \
  -m "feat(slo): the SLO Profile settings table"
```

---

### Task 6: Evaluation — the behaviour, without any DOM

**Files:**
- Create: `src/slo-profile/evaluation.js`, `src/slo-profile/evaluation.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `createEvaluation({ members }) -> { mode, quorum, maxQuorum(), setMode(m), setQuorum(n), bump(d), lead(), rule(mode), meta(mode), sentence(mode) }`. `mode` is `'strict' | 'redundant'`.

This is the heart of the feature. The copy is asserted verbatim because it is behaviour: it is recomputed from the numbers and cannot be allowed to drift from them.

- [ ] **Step 1: Write the failing test**

```js
// src/slo-profile/evaluation.test.js
import { describe, it, expect } from 'vitest'
import { createEvaluation } from './evaluation.js'

const ev = (over = {}) => createEvaluation({ members: 3, ...over })

describe('evaluation', () => {
  it('starts Redundant, holding 2 of 3', () => {
    const e = ev()
    expect(e.mode).toBe('redundant')
    expect(e.quorum).toBe(2)
  })

  // Phase 1 D9. Asking for all of them is what Strict is for.
  it('cannot express N = M', () => {
    const e = ev()
    expect(e.maxQuorum()).toBe(2)
    e.setQuorum(3)
    expect(e.quorum).toBe(2)
    e.bump(1)
    expect(e.quorum).toBe(2)
  })

  it('clamps at a floor of 1', () => {
    const e = ev()
    e.bump(-1); expect(e.quorum).toBe(1)
    e.bump(-1); expect(e.quorum).toBe(1)
  })

  it('keeps the quorum across a mode round trip', () => {
    const e = ev()
    e.bump(-1)
    e.setMode('strict')
    e.setMode('redundant')
    expect(e.quorum).toBe(1)
  })

  it('states what each mode tolerates, on both rows', () => {
    const e = ev()
    expect(e.meta('strict')).toBe('tolerates 0 failures')
    expect(e.meta('redundant')).toBe('tolerates 1 failure')
  })

  // From inside Strict, Redundant advertises its ceiling rather than a stale quorum.
  it('advertises the ceiling from inside Strict', () => {
    const e = ev()
    e.setMode('strict')
    expect(e.meta('redundant')).toBe('tolerates up to 2 failures')
  })

  it('pluralises failures correctly', () => {
    const e = ev({ members: 5 })
    e.setQuorum(4); expect(e.meta('redundant')).toBe('tolerates 1 failure')
    e.setQuorum(2); expect(e.meta('redundant')).toBe('tolerates 3 failures')
  })

  it('writes the full sentence each mode means', () => {
    const e = ev()
    expect(e.sentence('strict')).toBe('All 3 monitors added under Source must stay up.')
    expect(e.sentence('redundant')).toBe(
      '2 of the 3 monitors added under Source must stay up — survives 1 simultaneous failure.')
  })

  it('leads with the member count, taken from Source', () => {
    expect(ev().lead()).toBe(
      'Decides how the 3 monitors you added under Source combine into a single SLO result — ' +
      'whether every one of them has to stay up, or whether they can cover for each other.')
  })

  it('gives each mode its rule', () => {
    const e = ev()
    expect(e.rule('strict')).toBe('Every member must stay up. A single failure degrades the SLO.')
    expect(e.rule('redundant')).toBe(
      'Members back each other up. Only a drop below your threshold degrades the SLO.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/slo-profile/evaluation.test.js`
Expected: FAIL — `Failed to resolve import "./evaluation.js"`

- [ ] **Step 3: Write the module**

```js
// src/slo-profile/evaluation.js
// Evaluation Logic, with no DOM in it. An SLO profile carries exactly ONE redundancy group, or it
// is Strict; the group IS the member set, so `of M` is the Source count and nothing sits outside.
//
// The quorum runs 1..M-1. Asking for all M of them is what Strict is for, and the row above says
// so — which is why there is no invalid state here to warn about. See phase 1 D9.

const fails = (k) => `${k} ${k === 1 ? 'failure' : 'failures'}`

export function createEvaluation({ members, mode = 'redundant', quorum = 2 }) {
  const api = {
    mode,
    quorum,
    maxQuorum: () => members - 1,

    setMode(next) { api.mode = next },

    setQuorum(n) { api.quorum = Math.max(1, Math.min(api.maxQuorum(), n)) },

    bump(delta) { api.setQuorum(api.quorum + delta) },

    lead: () =>
      `Decides how the ${members} monitors you added under Source combine into a single SLO ` +
      'result — whether every one of them has to stay up, or whether they can cover for each other.',

    rule: (m) =>
      m === 'strict'
        ? 'Every member must stay up. A single failure degrades the SLO.'
        : 'Members back each other up. Only a drop below your threshold degrades the SLO.',

    // Read on BOTH rows, so the mode you are not on still states what it would cost. From inside
    // Strict, Redundant advertises its ceiling instead of a quorum you have not chosen.
    meta(m) {
      if (m === 'strict') return 'tolerates 0 failures'
      return api.mode === 'redundant'
        ? `tolerates ${fails(members - api.quorum)}`
        : `tolerates up to ${fails(api.maxQuorum())}`
    },

    sentence(m) {
      if (m === 'strict') return `All ${members} monitors added under Source must stay up.`
      const slack = members - api.quorum
      return `${api.quorum} of the ${members} monitors added under Source must stay up — ` +
        `survives ${slack} simultaneous ${slack === 1 ? 'failure' : 'failures'}.`
    },
  }
  api.setQuorum(quorum)
  return api
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/slo-profile/evaluation.test.js`
Expected: PASS, 10 tests

- [ ] **Step 5: Commit**

```bash
git add src/slo-profile/evaluation.js src/slo-profile/evaluation.test.js
git commit -o src/slo-profile/evaluation.js src/slo-profile/evaluation.test.js \
  -m "feat(slo): evaluation logic, quorum clamp and consequences"
```

---

### Task 7: The Option G control

**Files:**
- Create: `src/slo-profile/evaluationLogic.js`, `src/slo-profile/evaluationLogic.test.js`
- Modify: `src/slo-profile/sloProfile.css`

**Interfaces:**
- Consumes: `createEvaluation` from Task 6.
- Produces: `renderEvaluationLogic(host, { members }) -> { evaluation }`, rendering into `host`.

**This is the one place the plan builds a control the DS does not have.** Spec P4 records the decision and G45 will carry it to the DS team. The rules that still apply: colour is tokens only, and anything inside the row the DS already has comes from the DS — `obs-input` for the quorum, `obs-tooltip` for the sentence.

- [ ] **Step 1: Write the failing test**

```js
// src/slo-profile/evaluationLogic.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderEvaluationLogic } from './evaluationLogic.js'

describe('the evaluation logic control', () => {
  let host
  const rows = () => [...host.querySelectorAll('.ev-row')]
  const selected = () => host.querySelector('.ev-row.is-on')
  beforeEach(() => { host = document.createElement('div'); renderEvaluationLogic(host, { members: 3 }) })

  it('offers exactly two modes, as a radio group', () => {
    expect(host.querySelector('[role="radiogroup"]')).not.toBeNull()
    expect(rows()).toHaveLength(2)
    expect(rows().every((r) => r.getAttribute('role') === 'radio')).toBe(true)
  })

  it('starts on Redundant', () => {
    expect(selected().dataset.mode).toBe('redundant')
    expect(selected().getAttribute('aria-checked')).toBe('true')
    expect(host.querySelector('[data-mode="strict"]').getAttribute('aria-checked')).toBe('false')
  })

  // The reason Option G was chosen over a toggle.
  it('states what BOTH modes tolerate, including the one not chosen', () => {
    expect(host.querySelector('[data-mode="strict"] .ev-row__meta').textContent)
      .toBe('tolerates 0 failures')
    expect(host.querySelector('[data-mode="redundant"] .ev-row__meta').textContent)
      .toBe('tolerates 1 failure')
  })

  it('expands only the selected row', () => {
    expect(host.querySelector('[data-mode="redundant"] .ev-row__body').hidden).toBe(false)
    expect(host.querySelector('[data-mode="strict"] .ev-row__body').hidden).toBe(true)
  })

  it('puts the quorum in a DS input with both addons', () => {
    const input = host.querySelector('#ev-quorum')
    expect(input.tagName.toLowerCase()).toBe('obs-input')
    expect(input.getAttribute('type')).toBe('number')
    expect(input.getAttribute('addon-before')).toBe('at least')
    expect(input.getAttribute('addon-after')).toBe('of 3 must stay up')
    expect(input.getAttribute('value')).toBe('2')
  })

  it('cannot raise the quorum to M', () => {
    const input = host.querySelector('#ev-quorum')
    input.value = '3'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(host.querySelector('#ev-quorum').getAttribute('value')).toBe('2')
  })

  it('follows the quorum down, in the meta and the sentence', () => {
    const input = host.querySelector('#ev-quorum')
    input.value = '1'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(host.querySelector('[data-mode="redundant"] .ev-row__meta').textContent)
      .toBe('tolerates 2 failures')
    expect(host.querySelector('[data-mode="redundant"] obs-tooltip').textContent.trim())
      .toBe('1 of the 3 monitors added under Source must stay up — survives 2 simultaneous failures.')
  })

  it('switches mode on click, and keeps the quorum', () => {
    host.querySelector('[data-mode="strict"]').click()
    expect(selected().dataset.mode).toBe('strict')
    expect(host.querySelector('[data-mode="strict"] .ev-row__body').hidden).toBe(false)
    expect(host.querySelector('[data-mode="redundant"] .ev-row__meta').textContent)
      .toBe('tolerates up to 2 failures')
    host.querySelector('[data-mode="redundant"]').click()
    expect(host.querySelector('#ev-quorum').getAttribute('value')).toBe('2')
  })

  // obs-radio would have given us this for free; it is ours to keep correct now.
  it('is operable by keyboard alone', () => {
    const strict = host.querySelector('[data-mode="strict"]')
    expect(strict.getAttribute('tabindex')).toBe('0')
    strict.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(selected().dataset.mode).toBe('strict')
    const redundant = host.querySelector('[data-mode="redundant"]')
    redundant.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(selected().dataset.mode).toBe('redundant')
  })

  it('never offers an N = M state to warn about', () => {
    expect(host.textContent).not.toMatch(/same as Strict/i)
    expect(host.textContent).not.toMatch(/3 of 3/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/slo-profile/evaluationLogic.test.js`
Expected: FAIL — `Failed to resolve import "./evaluationLogic.js"`

- [ ] **Step 3: Write the control**

```js
// src/slo-profile/evaluationLogic.js
// Option G: two selectable rows, each stating what it tolerates, the selected one expanding to its
// rule and — under Redundant — its quorum.
//
// THIS IS THE ONE INVENTED CONTROL IN THIS APP, and it is deliberate. obs-radio renders the choice
// and nothing else: its shadow root has no <slot>, so a light-DOM child placed inside it is present
// and unpainted. Rather than downgrade the design to fit the component, the design is built and
// handed to the DS team as G45 — a working reference implementation instead of a description.
// Everything inside the row that the DS DOES have is the DS's: obs-input for the quorum,
// obs-tooltip for the sentence. Colour is tokens only.

import { createEvaluation } from './evaluation.js'

const MODES = [
  { mode: 'strict', label: 'Strict' },
  { mode: 'redundant', label: 'Redundant' },
]

export function renderEvaluationLogic(host, { members }) {
  const evaluation = createEvaluation({ members })

  host.innerHTML = `
    <div class="ev">
      <div class="ev__label">Evaluation Logic <i class="ev__req">*</i></div>
      <p class="ev__lead" id="ev-lead"></p>
      <div class="ev__rows" role="radiogroup" aria-label="Evaluation Logic">
        ${MODES.map(({ mode, label }) => `
          <div class="ev-row" data-mode="${mode}" role="radio" tabindex="0" aria-checked="false">
            <div class="ev-row__top">
              <span class="ev-row__dot" aria-hidden="true"></span>
              <span class="ev-row__name">${label}</span>
              <span class="ev-row__meta"></span>
              <obs-tooltip placement="top-end"></obs-tooltip>
            </div>
            <div class="ev-row__body" hidden>
              <p class="ev-row__rule"></p>
              ${mode === 'redundant' ? `
                <obs-input id="ev-quorum" type="number" value="2"
                           addon-before="at least" addon-after=""></obs-input>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>
  `

  const row = (mode) => host.querySelector(`[data-mode="${mode}"]`)
  const quorumInput = host.querySelector('#ev-quorum')

  const render = () => {
    host.querySelector('#ev-lead').textContent = evaluation.lead()

    for (const { mode } of MODES) {
      const el = row(mode)
      const on = evaluation.mode === mode
      el.classList.toggle('is-on', on)
      el.setAttribute('aria-checked', String(on))
      el.querySelector('.ev-row__body').hidden = !on
      el.querySelector('.ev-row__meta').textContent = evaluation.meta(mode)
      el.querySelector('.ev-row__rule').textContent = evaluation.rule(mode)
      el.querySelector('obs-tooltip').textContent = evaluation.sentence(mode)
    }

    quorumInput.setAttribute('value', String(evaluation.quorum))
    quorumInput.setAttribute('addon-after', `of ${members} must stay up`)
  }

  const pick = (mode) => { evaluation.setMode(mode); render() }

  for (const { mode } of MODES) {
    row(mode).addEventListener('click', (e) => {
      // The quorum input lives inside the Redundant row; typing in it must not re-pick the row.
      if (e.target.closest('#ev-quorum')) return
      pick(mode)
    })
    row(mode).addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(mode) }
    })
  }

  // The clamp lives in evaluation.js, not in the input: `min`/`max` on a number field is a hint a
  // user can type past, and N = M must be unreachable rather than merely discouraged.
  quorumInput.addEventListener('change', (e) => {
    evaluation.setQuorum(Number(e.target.value))
    render()
  })

  render()
  return { evaluation }
}
```

- [ ] **Step 4: Style the rows**

Append to `src/slo-profile/sloProfile.css`:

```css
/* Option G. The one invented control in this app — see evaluationLogic.js for why, and G45 for
   the ask that retires it. Colour is tokens only, as everywhere else. */

.ev__label { font-weight: 600; margin-bottom: 2px; }
.ev__req { color: var(--secondary-red); font-style: normal; }

.ev__lead {
  margin: 0 0 9px;
  color: var(--input-placeholder-color);
  line-height: 1.55;
}

.ev__rows { display: flex; flex-direction: column; gap: 6px; }

.ev-row {
  background: var(--common-main-bg);
  border-radius: var(--btn-radius);
  padding: 11px 14px;
  cursor: pointer;
  color: var(--page-text-color);
}

.ev-row.is-on { background: var(--default-tag-bg); padding: 13px 14px; cursor: default; }
.ev-row:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

.ev-row__top { display: flex; align-items: center; gap: 11px; }
.ev-row__name { font-weight: 600; }
.ev-row__meta { margin-left: auto; color: var(--input-placeholder-color); }

.ev-row__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--common-widget-bg);
  flex: none;
}

.ev-row.is-on .ev-row__dot {
  border-color: var(--primary);
  box-shadow: inset 0 0 0 4px var(--common-widget-bg), inset 0 0 0 8px var(--primary);
}

/* See the note in wanLinkDiscovery.css: an author `display` rule beats the UA's `[hidden]`, so a
   body toggled with `el.hidden` stays painted unless this override exists. */
.ev-row__body[hidden] { display: none; }
.ev-row__body { margin-top: 8px; padding-left: 27px; }
.ev-row__rule { margin: 0 0 12px; color: var(--input-placeholder-color); line-height: 1.55; }
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/slo-profile/evaluationLogic.test.js`
Expected: PASS, 11 tests

- [ ] **Step 6: Commit**

```bash
git add src/slo-profile/evaluationLogic.js src/slo-profile/evaluationLogic.test.js src/slo-profile/sloProfile.css
git commit -o src/slo-profile/evaluationLogic.js src/slo-profile/evaluationLogic.test.js src/slo-profile/sloProfile.css \
  -m "feat(slo): Option G, the evaluation logic control"
```

---

### Task 8: The Create SLO Profile form

**Files:**
- Create: `src/slo-profile/createForm.js`, `src/slo-profile/createForm.test.js`
- Modify: `src/slo-profile/screen.js`, `src/slo-profile/screen.test.js`, `src/slo-profile/sloProfile.css`

**Interfaces:**
- Consumes: `renderEvaluationLogic` from Task 7.
- Produces: `renderCreateForm(host, { onCancel }) -> { evaluation }`.

- [ ] **Step 1: Write the failing test**

```js
// src/slo-profile/createForm.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderCreateForm } from './createForm.js'

describe('create slo profile form', () => {
  let host
  beforeEach(() => { host = document.createElement('div'); renderCreateForm(host, { onCancel() {} }) })

  it('carries the shipped fields', () => {
    const labels = [...host.querySelectorAll('obs-input, obs-select')].map((e) => e.getAttribute('label'))
    for (const field of ['SLO Name', 'SLO Description', 'Business Service Name', 'SLO For',
      'Source Filter', 'Source', 'Frequency', 'Target', 'Warning', 'Start Date']) {
      expect(labels).toContain(field)
    }
  })

  // BS_Setup: the business service is an entity, picked and creatable, not typed.
  it('makes Business Service Name a searchable picker that can add a value', () => {
    const bs = host.querySelector('#slo-bs')
    expect(bs.tagName.toLowerCase()).toBe('obs-select')
    expect(bs.hasAttribute('searchable')).toBe(true)
    expect(bs.hasAttribute('can-user-add-options')).toBe(true)
    expect(bs.getAttribute('add-label')).toBe('Create Business Service')
  })

  it('places Evaluation Logic between Start Date and Tags', () => {
    const fields = [...host.querySelectorAll('[data-field]')].map((e) => e.dataset.field)
    expect(fields.indexOf('evaluation')).toBe(fields.indexOf('start') + 1)
    expect(fields.indexOf('tags')).toBe(fields.indexOf('evaluation') + 1)
  })

  it('mounts the Option G control', () => {
    expect(host.querySelectorAll('.ev-row')).toHaveLength(2)
  })

  it('offers Reset and Create', () => {
    expect(host.querySelector('#slo-form-create').textContent).toContain('Create SLO Profile')
    expect(host.querySelector('#slo-form-reset')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/slo-profile/createForm.test.js`
Expected: FAIL — `Failed to resolve import "./createForm.js"`

- [ ] **Step 3: Write the form**

```js
// src/slo-profile/createForm.js
// Artboard 2 — the shipped Create SLO Profile form (SLO_setup_2), field for field, with Evaluation
// Logic as the ONLY addition, full width between Start Date and Tags.

import { renderEvaluationLogic } from './evaluationLogic.js'

const SERVICES = ['E-commerce Platform', 'Network Core', 'Branch Connectivity', 'SLO FOR MAXIS', 'ABC']

export function renderCreateForm(host, { onCancel }) {
  host.innerHTML = `
    <div class="slo-form">
      <div class="slo-form__grid">
        <div data-field="name"><obs-input label="SLO Name" required value="Checkout Availability"></obs-input></div>
        <div data-field="description"><obs-input label="SLO Description" placeholder="Optional"></obs-input></div>
        <div data-field="service">
          <obs-select id="slo-bs" label="Business Service Name" required searchable
                      can-user-add-options add-label="Create Business Service"
                      value="E-commerce Platform"></obs-select>
        </div>
        <div data-field="for"><obs-select label="SLO For" required value="Monitor"></obs-select></div>
        <div data-field="filter"><obs-select label="Source Filter" required value="Tag = platform:ecom"></obs-select></div>
        <div data-field="source"><obs-input label="Source" required readonly value="3 monitors selected"></obs-input></div>
        <div data-field="frequency"><obs-select label="Frequency" required value="Daily"></obs-select></div>
        <div data-field="target"><obs-input label="Target" required suffix="%" value="99"></obs-input></div>
        <div data-field="warning"><obs-input label="Warning" required suffix="%" value="99.5"></obs-input></div>
        <div data-field="start"><obs-input label="Start Date" required value="01-09-2026"></obs-input></div>
        <div data-field="evaluation" class="slo-form__span" id="slo-evaluation"></div>
        <div data-field="tags" class="slo-form__span"><obs-tags label="Tags" type="loose"></obs-tags></div>
        <div data-field="notify" class="slo-form__span">
          <obs-input label="Notify Team" placeholder="@User or Email or /Handle or #User Profile"></obs-input>
        </div>
      </div>
      <footer class="slo-form__actions">
        <span class="slo-form__note"><i class="ev__req">*</i> fields are mandatory</span>
        <obs-button id="slo-form-reset" variant="default">Reset</obs-button>
        <obs-button id="slo-form-create" variant="primary">Create SLO Profile</obs-button>
      </footer>
    </div>
  `

  host.querySelector('#slo-bs').options = SERVICES.map((s) => ({ value: s, text: s }))

  // Source says "3 monitors selected", so M is 3 and `of M` is derived, never typed.
  const { evaluation } = renderEvaluationLogic(host.querySelector('#slo-evaluation'), { members: 3 })

  host.querySelector('#slo-form-reset').addEventListener('click', onCancel)
  host.querySelector('#slo-form-create').addEventListener('click', onCancel)

  return { evaluation }
}
```

- [ ] **Step 4: Style the form**

Append to `src/slo-profile/sloProfile.css`:

```css
.slo-form__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--common-padd-space);
}

.slo-form__span { grid-column: 1 / -1; }

.slo-form__actions {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
}

.slo-form__note { margin-right: auto; color: var(--input-placeholder-color); }
```

- [ ] **Step 5: Wire the two views together**

In `src/slo-profile/screen.js`, add the import:

```js
import { renderCreateForm } from './createForm.js'
```

and replace `return function unmount() {}` with:

```js
  const list = root.querySelector('#slo-profile-list')
  const form = root.querySelector('#slo-profile-form')

  const showList = () => { form.hidden = true; list.hidden = false; form.innerHTML = '' }
  const showForm = () => {
    list.hidden = true
    form.hidden = false
    renderCreateForm(form, { onCancel: showList })
  }

  const onCreate = () => showForm()
  root.querySelector('#slo-profile-create').addEventListener('click', onCreate)

  return function unmount() {
    root.querySelector('#slo-profile-create')?.removeEventListener('click', onCreate)
  }
```

- [ ] **Step 6: Add the view-switch tests**

Append to `src/slo-profile/screen.test.js`:

```js
describe('the two views', () => {
  let root
  beforeEach(() => { root = document.createElement('div'); document.body.append(root); mount(root) })

  it('starts on the table', () => {
    expect(root.querySelector('#slo-profile-list').hidden).toBe(false)
    expect(root.querySelector('#slo-profile-form').hidden).toBe(true)
  })

  it('opens the Create form without changing route', () => {
    const before = window.location.hash
    root.querySelector('#slo-profile-create').click()
    expect(root.querySelector('#slo-profile-form').hidden).toBe(false)
    expect(root.querySelector('#slo-profile-list').hidden).toBe(true)
    expect(root.querySelectorAll('.ev-row')).toHaveLength(2)
    expect(window.location.hash).toBe(before)
  })

  it('comes back to the table', () => {
    root.querySelector('#slo-profile-create').click()
    root.querySelector('#slo-form-reset').click()
    expect(root.querySelector('#slo-profile-list').hidden).toBe(false)
    expect(root.querySelector('#slo-profile-form').innerHTML).toBe('')
  })
})
```

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS — every existing test plus the new ones. If an existing test fails, the registry edit is the likely cause; read the failure before changing anything.

- [ ] **Step 8: Commit**

```bash
git add src/slo-profile/createForm.js src/slo-profile/createForm.test.js src/slo-profile/screen.js src/slo-profile/screen.test.js src/slo-profile/sloProfile.css
git commit -o src/slo-profile/createForm.js src/slo-profile/createForm.test.js src/slo-profile/screen.js src/slo-profile/screen.test.js src/slo-profile/sloProfile.css \
  -m "feat(slo): the Create SLO Profile form"
```

---

### Task 9: Verify by rendering

**Files:**
- Create: `scripts/probe-slo.mjs`

**Interfaces:**
- Consumes: the running dev server.
- Produces: `docs/shots/slo-*.png`, and a non-zero exit on any failed check.

Every claim above has so far been checked by jsdom, which on this project has passed screens that painted nothing. This task is the verification.

- [ ] **Step 1: Write the probe**

```js
// scripts/probe-slo.mjs
// Verify the SLO screens by RENDERING them. jsdom and static checks have both hidden real defects
// in this repo — see CLAUDE.md, "How we work".
//
//   npm run dev
//   node scripts/probe-slo.mjs
//
//   CHROME  path to a Chrome/Chromium executable
//   ORIGIN  where `npm run dev` is serving  (default http://localhost:5173)
//   SHOTS   screenshot directory            (default docs/shots)

import { chromium } from 'playwright-core'

const EXE = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173'
const SHOTS = process.env.SHOTS || 'docs/shots'

const checks = []
const check = (name, ok, detail) => {
  checks.push({ name, ok: Boolean(ok) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  — ${JSON.stringify(detail)}`}`)
}
const section = (t) => console.log(`\n──────── ${t} ────────`)

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE ${m.text()}`) })

const go = async (hash) => {
  await page.goto(`${ORIGIN}/#${hash}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true })
const texts = (sel) => page.$$eval(sel, (els) => els.map((e) => e.innerText.trim()))

section('Artboard 1 — the SLO list')
await go('/slo/list')
check('five tiles render', (await page.$$('.slo-tile')).length === 5)
// A painted tile, not merely a present one: an unstyled screen still has nodes.
check('a tile has real size', await page.$eval('.slo-tile', (e) => e.getBoundingClientRect().height > 60))
{
  const evals = await texts('.slo-tile__eval')
  check('the scenario SLO states a quorum', evals[0] === 'Redundant · 2 of 3', evals[0])
  check('no tile counts groups', !/group/i.test(evals.join(' ')), evals)
}
check('status is a DS severity that painted',
  await page.$eval('.slo-tile obs-severity', (e) => e.getBoundingClientRect().width > 0))
await shot('slo-list')

section('Artboard 1 — the Business Service view')
await page.click('#slo-bs-toggle')
await page.waitForTimeout(400)
{
  const heads = await texts('.slo-group__name')
  check('three services', heads.length === 3, heads)
  const counts = await texts('.slo-group__count')
  check('counts are right, singular and plural',
    counts.join(' | ') === '3 SLOs | 1 SLO | 1 SLO', counts)
  check('every SLO appears once', (await page.$$('.slo-group .slo-tile')).length === 5)
  // The rule the view exists for: a heading worse than some of its members.
  const head = await page.$eval('.slo-group .slo-group__head obs-severity', (e) => e.getAttribute('value'))
  const tiles = await page.$$eval('.slo-group:first-of-type .slo-tile obs-severity',
    (els) => els.map((e) => e.getAttribute('value')))
  check('a service takes the severest status of its SLOs',
    head === 'Breached' && tiles.filter((t) => t === 'Ok').length === 2, { head, tiles })
}
await shot('slo-list-bs')

section('Artboard 6 — the profile table')
await go('/settings/slo-profile')
check('the table painted', await page.$eval('#slo-profile-table', (e) => e.getBoundingClientRect().height > 100))
{
  const cells = await page.$$eval('#slo-profile-table', (t) => t.rows.map((r) => r.evaluation))
  check('Evaluation Logic reads only Strict, Redundancy or an em dash',
    cells.every((c) => ['Strict', 'Redundancy', '—'].includes(c)), cells)
}
await shot('slo-profile-table')

section('Artboard 2 — Create SLO Profile')
await page.click('#slo-profile-create')
await page.waitForTimeout(500)
check('two evaluation rows', (await page.$$('.ev-row')).length === 2)
check('the rows painted', await page.$eval('.ev-row', (e) => e.getBoundingClientRect().height > 20))
{
  const metas = await texts('.ev-row__meta')
  check('BOTH rows state what they tolerate',
    metas[0] === 'tolerates 0 failures' && metas[1] === 'tolerates 1 failure', metas)
}
check('only the selected row is expanded',
  await page.$eval('[data-mode="strict"] .ev-row__body', (e) => e.getBoundingClientRect().height === 0) &&
  await page.$eval('[data-mode="redundant"] .ev-row__body', (e) => e.getBoundingClientRect().height > 0))
check('the quorum input painted with its addons',
  await page.$eval('#ev-quorum', (e) => e.getBoundingClientRect().width > 0))
// N = M must be unreachable, not merely discouraged.
await page.$eval('#ev-quorum', (el) => {
  el.value = '3'
  el.dispatchEvent(new Event('change', { bubbles: true }))
})
await page.waitForTimeout(300)
check('N = M is unreachable',
  (await page.$eval('#ev-quorum', (e) => e.getAttribute('value'))) === '2')
check('the business service picker is a select, not a text field',
  await page.$eval('#slo-bs', (e) => e.tagName.toLowerCase() === 'obs-select'))
await shot('slo-create')

section('Deck')
check('no console or page errors', errors.length === 0, errors.slice(0, 3))

const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length} passed, ${failed.length} failed`)
await browser.close()
// A probe that exits 0 on failure is worse than no probe: CI would go green over a broken screen.
process.exit(failed.length === 0 ? 0 : 1)
```

- [ ] **Step 2: Run the probe**

```bash
npm run dev            # in one terminal
node scripts/probe-slo.mjs
```

Expected: every check PASS, exit 0, four screenshots in `docs/shots/`.

- [ ] **Step 3: Read the screenshots**

Open `docs/shots/slo-list.png`, `slo-list-bs.png`, `slo-profile-table.png`, `slo-create.png` and look at them. A passing count is not the verification — the count has been green while a grid header was the wrong style and while a drawer footer floated mid-panel. Confirm in particular that the Evaluation Logic rows read as two selectable rows and not as two stacked paragraphs.

- [ ] **Step 4: Commit**

```bash
git add scripts/probe-slo.mjs docs/shots/slo-list.png docs/shots/slo-list-bs.png docs/shots/slo-profile-table.png docs/shots/slo-create.png
git commit -o scripts/probe-slo.mjs docs/shots/slo-list.png docs/shots/slo-list-bs.png docs/shots/slo-profile-table.png docs/shots/slo-create.png \
  -m "test(slo): verify the three views by rendering"
```

---

### Task 10: File the gaps and update the docs

**Files:**
- Modify: `docs/DS-GAPS.md`, `docs/PROJECT-CONTEXT.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: the evidence gathered in Tasks 7 and 9.
- Produces: nothing code depends on.

- [ ] **Step 1: Re-confirm each gap by rendering before writing it**

A gap filed from a manifest is worthless. For each, drive it in Chrome and keep the measurement:

1. **G45** — put a light-DOM child inside `obs-radio`; record that the shadow root contains zero `<slot>` elements and the child's `getBoundingClientRect()` is 0×0 while it is present in the DOM.
2. **G46** — render `obs-icon` with `shield`, `shieldAlt`, `security`, `protect` and a known-good control such as `businessService`; record which painted.
3. **G47** — record that no element in `elements-api.json` is a card, and that `src/app/cardList.js` and `src/slo-list/sloList.css` both hand-roll one.

**Load `@mtdt/observeops-ds-css` in the probe page.** A probe without it reports false negatives: components coloured through `--severity-*` render invisibly rather than failing, and read as "not rendered". This produced a wrong finding while the spec was being written.

- [ ] **Step 2: Write the three entries**

Follow the file's existing format exactly — repro, evidence, consumer workaround, ask, and a class of *DS — capability*, *DS — discoverability*, *DS — packaging* or *consumer*. Add each to the summary table at the top as well as the body. Numbering continues from G44.

- [ ] **Step 3: Correct the record on OQ5**

Phase 1's spec guessed `obs-table` had no collapsible group rows. It has `group-by` and `group-collapsible`, plus `sticky-header`, `max-height`, `sort` and `sortable`. Note the correction in `DS-GAPS.md` rather than leaving the guess standing — a gap report that keeps disproved claims is worth less than one that retires them, which is why G21 and G40 are kept as withdrawn.

- [ ] **Step 4: Update the app docs**

In `CLAUDE.md`, add both screens to the screen table and the structure tree, and add `node scripts/probe-slo.mjs` to the "Verify by rendering" list. In `docs/PROJECT-CONTEXT.md`, add what was built and why — including the one invented control and the reason it exists.

- [ ] **Step 5: Prove there is no hardcoded colour (success criterion 8)**

```bash
grep -nEi "#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(" src/slo-list/*.css src/slo-profile/*.css
```

Expected: no output. One match is a failure — this app has never had a hex in its CSS and these
files must not be the first. Replace the value with a token resolved through the MCP
`resolve_token`.

- [ ] **Step 6: Run conformance and record the score (PQ1)**

```bash
npm run dev
node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs http://localhost:5173/#/slo/list
node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs http://localhost:5173/#/settings/slo-profile
```

The SLO list is mostly hand-rolled tiles, and the checker counts light-DOM
`obs-button/input/select/switch/checkbox/radio/link` — so a low element count there is expected
rather than a defect. Two traps, both of which have caught this project before: screens load by
dynamic `import()`, so Chromium can sample an almost-empty page and score it highly — confirm the
screen actually mounted before believing a number; and conformance only ever sees a screen's FIRST
view, so the Create form is never scored.

**Record both scores and the element counts in `docs/PROJECT-CONTEXT.md`, with the reason the list
scores as it does.** PQ1 exists so a low number is explained here rather than rediscovered as alarm
later.

- [ ] **Step 7: Run the full suite one last time**

```bash
npm test
node scripts/probe-slo.mjs
```

Expected: both green.

- [ ] **Step 8: Commit**

```bash
git add docs/DS-GAPS.md docs/PROJECT-CONTEXT.md CLAUDE.md
git commit -o docs/DS-GAPS.md docs/PROJECT-CONTEXT.md CLAUDE.md \
  -m "docs(slo): file G45-G47 and record the screens"
```

---

## Notes for the executor

- **A parallel session works in this repo on the same branch.** Never run a bare `git commit`; every commit above names its paths with `-o`. If `git status` shows files you did not touch, leave them alone.
- **`src/app/registry.js` is the one shared file.** Two tasks edit it, two lines each. If it has changed since the plan was written, re-read it before editing.
- **When something looks wrong in the browser, ask: DS or ours?** Answer it with evidence from the package source, not a guess. Roughly half of this project's findings turned out to be ours.
- **The copy in `evaluation.js` is asserted character-for-character.** If a sentence needs to change, change the spec first — it is behaviour, recomputed from the numbers so that it cannot drift from them.
