# NX-OS WAN Link Monitor Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cisco NX-OS WAN Link monitor screen at `#/monitors/wan-link` — a probe list, a detail drawer per probe, and a probe-config drawer — built from the published `@mtdt/observeops-ds-*` packages.

**Architecture:** One new screen module, `src/wan-link/`, mounted by the existing screen registry. Pure data and pure render helpers live in their own files with their own tests; `screen.js` is wiring only. Charts are inline SVG produced by a pure function, because the DS ships no chart element — they are coloured entirely from the DS's `--chart-*` custom properties.

**Tech Stack:** Vanilla JS + Vite 8 · Vitest + jsdom · `@mtdt/observeops-ds-elements` `-ds-css` `-ds-spec` · Playwright-core + local Chrome for render verification.

**Spec:** `docs/superpowers/specs/2026-09-01-nxos-wan-link-design.md`

## Global Constraints

- **No hardcoded colours.** Not one hex, `rgb()` or `hsl()` in application CSS. Every colour is a `var(--token)`. The deploy workflow fails the build otherwise.
- **Never guess a DS component's API.** Read `node_modules/@mtdt/observeops-ds-spec/elements-api.json`, then confirm by rendering.
- **DS events deliver the value in `event.detail` as an ARRAY** — unwrap `detail[0]`.
- **Verify by rendering, not by reading.** jsdom passes have hidden real defects in this repo.
- **Every DS gap goes in `docs/DS-GAPS.md`** with a repro, evidence, the workaround used and a concrete ask.
- Node 22.22.2+, 24.15+, or 26+. Run everything from `observeops-app/`.
- Chart series are assigned **by order** — series *n* takes hue *n*, wrapping after the last. Never hand-pick a hue.
- Column order in the list is `… sourceInterface · rtt · status`. RTT comes **before** STATUS.

---

### Task 1: Register the screen and prove the route

**Files:**
- Create: `src/wan-link/screen.js`
- Create: `src/wan-link/screen.test.js`
- Modify: `src/app/registry.js` — the `monitors` module's `screens` array

**Interfaces:**
- Consumes: `pageHeaderHTML({ heading, icon })` from `src/app/pageHeader.js`
- Produces: `meta` (`{ pageHeader: { heading, icon } }`) and `mount(root)` returning an optional `unmount()` — the contract every screen in this app implements.

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link/screen.test.js
import { describe, it, expect } from 'vitest'
import { modules, findScreen } from '../app/registry.js'
import { resolve, parse } from '../app/router.js'
import { meta, mount } from './screen.js'

describe('wan-link screen registration', () => {
  it('is registered under the monitors module', () => {
    const screen = findScreen(modules, 'monitors', 'wan-link')
    expect(screen).toBeDefined()
    expect(screen.label).toBe('WAN Link')
  })

  it('resolves #/monitors/wan-link to the screen', () => {
    const route = resolve(parse('#/monitors/wan-link'), modules)
    expect(route.kind).toBe('screen')
    expect(route.screen.key).toBe('wan-link')
  })

  it('declares its page header', () => {
    expect(meta.pageHeader.heading).toBe('Monitors')
  })

  it('mounts the WAN Link tab as the active tab', () => {
    const root = document.createElement('div')
    mount(root)
    const tabs = root.querySelector('#wan-link-tabs')
    expect(tabs.getAttribute('value')).toBe('wan-link')
    const keys = JSON.parse(tabs.getAttribute('tabs')).map((t) => t.key)
    expect(keys).toContain('wan-link')
    expect(keys).toContain('inventory')
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- src/wan-link/screen.test.js`
Expected: FAIL — cannot resolve `./screen.js`.

- [ ] **Step 3: Write the screen skeleton**

```js
// src/wan-link/screen.js
import { pageHeaderHTML } from '../app/pageHeader.js'

export const meta = { pageHeader: { heading: 'Monitors', icon: 'monitor' } }

// The product's Monitors category bar. WAN Link is one tab among many; the rest render and do
// nothing, exactly as the other screens in this app treat their inert chrome.
const CATEGORIES = [
  'Inventory', 'Network', 'SDN', 'Server & Apps', 'Storage', 'Virtualization', 'HCI',
  'Database', 'Container Orchestration', 'Cloud', 'Interface', 'WAN Link', 'Process',
  'Container', 'Service', 'Service Check', 'Other',
]

const tabKey = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Monitors', icon: 'monitor' })}
  <div class="module-tabs">
    <obs-tabs id="wan-link-tabs"></obs-tabs>
  </div>
  <div class="app-shell__body">
    <main class="app-shell__content" id="wan-link-content"></main>
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE

  // Set as a JSON attribute so the value survives regardless of custom-element upgrade timing —
  // the same reason report-categories does it this way.
  const tabs = root.querySelector('#wan-link-tabs')
  tabs.setAttribute('tabs', JSON.stringify(CATEGORIES.map((label) => ({ key: tabKey(label), label }))))
  tabs.setAttribute('value', 'wan-link')

  return function unmount() {}
}
```

- [ ] **Step 4: Add the registry entry**

In `src/app/registry.js`, replace the `monitors` module line with:

```js
  {
    key: 'monitors', label: 'Monitors', icon: 'monitor',
    screens: [
      {
        key: 'wan-link',
        label: 'WAN Link',
        description:
          'Cisco NX-OS WAN Link monitoring: ICMP Echo, UDP Echo and UDP Jitter probes, each with ' +
          'a detail drawer built from the counters `show ip sla statistics` actually reports.',
        load: () => import('../wan-link/screen.js'),
      },
    ],
  },
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `npm test -- src/wan-link/screen.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 6: Run the whole suite — the registry is shared**

Run: `npm test`
Expected: PASS. `registry.test.js` and `router.test.js` both read the module list; if either asserts a screen count, update it to match.

- [ ] **Step 7: Commit**

```bash
git add src/wan-link/ src/app/registry.js
git commit -m "feat(wan-link): register the NX-OS WAN Link screen under Monitors"
```

---

### Task 2: The probe data model

**Files:**
- Create: `src/wan-link/probes.js`
- Create: `src/wan-link/probes.test.js`

**Interfaces:**
- Produces:
  - `PROBES` — `{ 'icmp-echo': {…}, 'udp-echo': {…}, 'udp-jitter': {…} }`, each `{ key, label, needsPort }`
  - `LINKS` — array of `{ id, name, monitor, probe, sourceIp, destinationIp, sourceInterface, rtt, status }`
  - `availabilityWindows(probeKey)` → `string[]`
  - `tilesFor(probeKey)` → `[{ title, caption, values: [{ label, value, unit }] }]`
  - `chartsFor(probeKey)` → `[{ title, span, series: string[], yTicks, xTicks, flat? }]`

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link/probes.test.js
import { describe, it, expect } from 'vitest'
import { PROBES, LINKS, availabilityWindows, tilesFor, chartsFor } from './probes.js'

describe('probes', () => {
  it('defines exactly the three NX-OS probes', () => {
    expect(Object.keys(PROBES)).toEqual(['icmp-echo', 'udp-echo', 'udp-jitter'])
  })

  it('needs a destination port only for the UDP probes', () => {
    expect(PROBES['icmp-echo'].needsPort).toBe(false)
    expect(PROBES['udp-echo'].needsPort).toBe(true)
    expect(PROBES['udp-jitter'].needsPort).toBe(true)
  })

  it('seeds every probe several times', () => {
    for (const key of Object.keys(PROBES)) {
      expect(LINKS.filter((l) => l.probe === key).length).toBeGreaterThanOrEqual(4)
    }
  })

  it('leaves RTT blank on links that are down', () => {
    const down = LINKS.filter((l) => l.status === 'down')
    expect(down.length).toBeGreaterThan(0)
    expect(down.every((l) => l.rtt === '')).toBe(true)
  })

  it('uses NX-OS interface names', () => {
    expect(LINKS.every((l) => /^Eth\d+\/\d+$/.test(l.sourceInterface))).toBe(true)
  })

  it('uses the jitter availability windows only for jitter', () => {
    expect(availabilityWindows('icmp-echo')).toEqual(['Last Day', 'Last 7 Days', 'Last 15 Days'])
    expect(availabilityWindows('udp-jitter')).toEqual(['7 Days', '15 Days', '30 Days'])
  })

  it('gives the echo probes no tiles and three charts', () => {
    for (const key of ['icmp-echo', 'udp-echo']) {
      expect(tilesFor(key)).toEqual([])
      expect(chartsFor(key)).toHaveLength(3)
    }
  })

  it('gives the echo probes one RTT series, since NX-OS reports no min or max', () => {
    const rtt = chartsFor('icmp-echo').find((c) => c.title === 'RTT History')
    expect(rtt.series).toEqual(['ipsla.latency.ms.avg'])
  })

  it('caps the jitter tile row at six and gives it ten charts', () => {
    expect(tilesFor('udp-jitter')).toHaveLength(6)
    expect(chartsFor('udp-jitter')).toHaveLength(10)
  })

  it('has no MOS or ICPIF tile', () => {
    const titles = tilesFor('udp-jitter').map((t) => t.title)
    expect(titles).not.toContain('MOS')
    expect(titles).not.toContain('ICPIF')
  })

  it('splits loss periods by direction, both halves of each pair', () => {
    const loss = chartsFor('udp-jitter').filter((c) => c.title.endsWith('Loss Periods'))
    expect(loss).toHaveLength(2)
    expect(loss[0].series).toEqual([
      'Loss Periods', 'Period Length Min', 'Period Length Max',
      'Inter-Loss Length Min', 'Inter-Loss Length Max',
    ])
  })

  it('drops the Average Jitter and Avg Latency charts', () => {
    const titles = chartsFor('udp-jitter').map((c) => c.title)
    expect(titles).not.toContain('Average Jitter')
    expect(titles).not.toContain('Avg Latency')
  })

  it('fills each chart row to twelve columns', () => {
    const rows = {}
    for (const c of chartsFor('udp-jitter')) (rows[c.row] = rows[c.row] || []).push(c.span)
    for (const spans of Object.values(rows)) {
      expect(spans.reduce((a, b) => a + b, 0)).toBe(12)
    }
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- src/wan-link/probes.test.js`
Expected: FAIL — cannot resolve `./probes.js`.

- [ ] **Step 3: Write the data model**

```js
// src/wan-link/probes.js
//
// The NX-OS WAN Link template, derived from what `show ip sla statistics` actually reports.
// See docs/superpowers/specs/2026-09-01-nxos-wan-link-design.md for the counter mapping.

export const PROBES = {
  'icmp-echo':  { key: 'icmp-echo',  label: 'ICMP Echo',  needsPort: false },
  'udp-echo':   { key: 'udp-echo',   label: 'UDP Echo',   needsPort: true },
  'udp-jitter': { key: 'udp-jitter', label: 'UDP Jitter', needsPort: true },
}

const link = (id, probe, carrier, src, dst, iface, status, rtt) => ({
  id,
  probe,
  name: `nxos${probe.replace('-', '')}-${carrier}-${src}\u2192${dst}`,
  monitor: 'site2.test2.com',
  sourceIp: src,
  destinationIp: dst,
  sourceInterface: iface,
  // The product leaves RTT empty on a down link rather than showing a stale number.
  rtt: status === 'down' ? '' : rtt,
  status,
})

export const LINKS = [
  link('l1',  'icmp-echo',  'Jio',      '70.70.70.2',   '70.70.70.1',   'Eth1/1', 'up',    '12 ms'),
  link('l2',  'icmp-echo',  'Airtel',   '70.70.70.2',   '172.16.14.53', 'Eth1/2', 'up',    '8 ms'),
  link('l3',  'icmp-echo',  'Vodafone', '172.16.14.52', '70.70.70.1',   'Eth1/3', 'down',  ''),
  link('l4',  'icmp-echo',  'Docomo',   '172.16.14.52', '65.65.65.1',   'Eth1/4', 'up',    '19 ms'),
  link('l5',  'icmp-echo',  'Aircel',   '192.168.60.1', '172.16.14.51', 'Eth1/5', 'clear', '7 ms'),
  link('l6',  'udp-echo',   'Airtel',   '70.70.70.2',   '70.70.70.1',   'Eth1/6', 'up',    '9 ms'),
  link('l7',  'udp-echo',   'Jio',      '70.70.70.2',   '65.65.65.2',   'Eth1/7', 'up',    '14 ms'),
  link('l8',  'udp-echo',   'Vodafone', '172.16.14.52', '70.70.70.1',   'Eth1/8', 'down',  ''),
  link('l9',  'udp-echo',   'Docomo',   '172.16.14.52', '172.16.14.53', 'Eth1/9', 'warning', '31 ms'),
  link('l10', 'udp-jitter', 'VI',       '70.70.70.2',   '70.70.70.1',   'Eth2/1', 'up',    '15 ms'),
  link('l11', 'udp-jitter', 'Airtel',   '172.16.14.52', '70.70.70.1',   'Eth2/2', 'up',    '11 ms'),
  link('l12', 'udp-jitter', 'Jio',      '60.60.60.2',   '60.60.60.1',   'Eth2/3', 'down',  ''),
  link('l13', 'udp-jitter', 'Aircel',   '172.16.14.52', '65.65.65.2',   'Eth2/4', 'critical', '87 ms'),
  link('l14', 'udp-jitter', 'Docomo',   '192.168.60.1', '172.16.14.53', 'Eth2/5', 'up',    '22 ms'),
]

const ECHO_WINDOWS = ['Last Day', 'Last 7 Days', 'Last 15 Days']
const JITTER_WINDOWS = ['7 Days', '15 Days', '30 Days']

export const availabilityWindows = (probeKey) =>
  probeKey === 'udp-jitter' ? JITTER_WINDOWS : ECHO_WINDOWS

const XT = ['12:00', '18:00', '24:00', '06:00', '12:00']
const YT = ['120', '85', '65', '35', '0']

// Both echo probes report a single timing value, `Latest RTT`. There is no min or max, so the two
// extra RTT History charts in the XE/XR template have no source and are not carried over.
const ECHO_CHARTS = [
  { row: 'A', title: "Today's Availability", span: 2, kind: 'donut', series: [] },
  { row: 'A', title: 'Availability Statistics', span: 4, kind: 'bars', series: [] },
  {
    row: 'A', title: 'RTT History', span: 6, kind: 'line', flat: true,
    series: ['ipsla.latency.ms.avg'],
    yTicks: ['8 ms'], xTicks: ['1. Sep', '04:00', '08:00', '12:00', '16:00'],
  },
]

const LOSS_SERIES = [
  'Loss Periods', 'Period Length Min', 'Period Length Max',
  'Inter-Loss Length Min', 'Inter-Loss Length Max',
]

const JITTER_CHARTS = [
  { row: 'A', title: "Today's Availability", span: 2, kind: 'donut', series: [] },
  { row: 'A', title: 'Availability Last 30 Days', span: 4, kind: 'bars', series: [] },
  { row: 'A', title: 'RTT History', span: 6, kind: 'line',
    series: ['Min. RTT', 'Avg. RTT', 'Max. RTT'], yTicks: ['25', '20', '15', '10', '5', '0'], xTicks: XT },

  { row: 'B', title: 'Source to Destination Jitter', span: 4, kind: 'line',
    series: ['Min. Jitter', 'Avg. Jitter', 'Max. Jitter'], yTicks: YT, xTicks: XT },
  { row: 'B', title: 'Destination to Source Jitter', span: 4, kind: 'line',
    series: ['Min. Jitter', 'Avg. Jitter', 'Max. Jitter'], yTicks: YT, xTicks: XT },
  { row: 'B', title: 'Packet Loss Statistics', span: 4, kind: 'line',
    series: ['Packet Skipped', 'Out Of Sequence', 'Packet Late Arrival', 'Tail Drop'], yTicks: YT, xTicks: XT },

  { row: 'C', title: 'Source to Destination Latency', span: 6, kind: 'line',
    series: ['Min. Latency', 'Avg. Latency', 'Max. Latency'], yTicks: YT, xTicks: XT },
  { row: 'C', title: 'Destination to Source Latency', span: 6, kind: 'line',
    series: ['Min. Latency', 'Avg. Latency', 'Max. Latency'], yTicks: YT, xTicks: XT },

  { row: 'D', title: 'Source to Destination Loss Periods', span: 6, kind: 'line',
    series: LOSS_SERIES, yTicks: ['20', '15', '10', '5', '0'], xTicks: XT },
  { row: 'D', title: 'Destination to Source Loss Periods', span: 6, kind: 'line',
    series: LOSS_SERIES, yTicks: ['20', '15', '10', '5', '0'], xTicks: XT },
]

// Values are the ones from the NX-OS sample output, so every tile traces to a CLI line.
const JITTER_TILES = [
  { title: 'RTT', caption: 'Avg: 2 ms', values: [{ label: 'Min', value: '1', unit: 'ms' }, { label: 'Max', value: '4', unit: 'ms' }] },
  { title: 'SRC to DST Jitter',  caption: '', values: [{ label: '', value: '1', unit: 'ms' }] },
  { title: 'DST to SRC Jitter',  caption: '', values: [{ label: '', value: '1', unit: 'ms' }] },
  { title: 'SRC to DST Latency', caption: '', values: [{ label: '', value: '0', unit: 'ms' }] },
  { title: 'DST to SRC Latency', caption: '', values: [{ label: '', value: '0', unit: 'ms' }] },
  { title: 'Packet Lost', caption: '', values: [{ label: 'SRC to DST', value: '0', unit: '' }, { label: 'DST to SRC', value: '0', unit: '' }] },
]

export const tilesFor = (probeKey) => (probeKey === 'udp-jitter' ? JITTER_TILES : [])

export const chartsFor = (probeKey) => (probeKey === 'udp-jitter' ? JITTER_CHARTS : ECHO_CHARTS)
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npm test -- src/wan-link/probes.test.js`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/wan-link/probes.js src/wan-link/probes.test.js
git commit -m "feat(wan-link): the NX-OS probe data model, tiles and chart definitions"
```

---

### Task 3: The chart renderer

The DS ships no chart element, so this is ours. It must still hold the no-hardcoded-colours rule, which the DS's `--chart-*` tokens make possible.

**Files:**
- Create: `src/wan-link/chart.js`
- Create: `src/wan-link/chart.test.js`

**Interfaces:**
- Consumes: chart definitions from `chartsFor()` — `{ title, span, kind, series, yTicks, xTicks, flat? }`
- Produces:
  - `SERIES_TOKENS` — ordered array of DS chart-hue custom-property names
  - `seriesToken(index)` → `string`, wrapping after the last
  - `trace(seed, base)` → `string` of SVG polyline points, deterministic
  - `chartHTML(def)` → `string` of HTML for one chart card

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link/chart.test.js
import { describe, it, expect } from 'vitest'
import { SERIES_TOKENS, seriesToken, trace, chartHTML } from './chart.js'

describe('chart', () => {
  it('uses only DS chart tokens for series colour', () => {
    expect(SERIES_TOKENS.length).toBeGreaterThanOrEqual(8)
    expect(SERIES_TOKENS.every((t) => t.startsWith('--chart-'))).toBe(true)
  })

  it('assigns hues by order and wraps after the last', () => {
    expect(seriesToken(0)).toBe(SERIES_TOKENS[0])
    expect(seriesToken(SERIES_TOKENS.length)).toBe(SERIES_TOKENS[0])
  })

  it('produces a deterministic trace', () => {
    expect(trace(7, 50)).toBe(trace(7, 50))
    expect(trace(7, 50)).not.toBe(trace(8, 50))
  })

  it('keeps every plotted point inside the viewBox', () => {
    const ys = trace(3, 50).split(' ').map((p) => Number(p.split(',')[1]))
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...ys)).toBeLessThanOrEqual(104)
  })

  it('renders one polyline per series and a legend entry each', () => {
    const html = chartHTML({
      title: 'RTT History', span: 6, kind: 'line',
      series: ['Min. RTT', 'Avg. RTT', 'Max. RTT'], yTicks: ['5', '0'], xTicks: ['12:00'],
    })
    expect(html.match(/<polyline/g)).toHaveLength(3)
    expect(html).toContain('Min. RTT')
    expect(html).toContain('Avg. RTT')
    expect(html).toContain('Max. RTT')
  })

  it('draws a flat single-series chart as one line, not a trace', () => {
    const html = chartHTML({
      title: 'RTT History', span: 6, kind: 'line', flat: true,
      series: ['ipsla.latency.ms.avg'], yTicks: ['8 ms'], xTicks: ['1. Sep'],
    })
    expect(html).toContain('<line')
    expect(html.match(/<polyline/g)).toBeNull()
  })

  it('contains no hardcoded colour', () => {
    const html = chartHTML({
      title: 'Jitter', span: 4, kind: 'line',
      series: ['Min', 'Avg'], yTicks: ['0'], xTicks: ['12:00'],
    })
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(html).not.toMatch(/\b(rgb|hsl)a?\(/i)
  })

  it('escapes series names rather than interpolating markup', () => {
    const html = chartHTML({
      title: '<img src=x>', span: 4, kind: 'line', series: ['<b>x</b>'], yTicks: [], xTicks: [],
    })
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<b>')
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- src/wan-link/chart.test.js`
Expected: FAIL — cannot resolve `./chart.js`.

- [ ] **Step 3: Write the renderer**

```js
// src/wan-link/chart.js
//
// The DS ships no chart element — its 47 components include obs-dataviz-tooltip and
// obs-metric-list, but nothing that draws a series, because the product's charts are Highcharts
// (see @mtdt/observeops-ds-spec/tokens/chart-palette.json). These charts are therefore ours, but
// every colour still comes from a DS --chart-* custom property, so the no-hardcoded-colours rule
// holds and light/dark come for free.

/** The DS categorical series palette, in the order the palette's own rules require. */
export const SERIES_TOKENS = [
  '--chart-vivid-teal',
  '--chart-sunset-orange',
  '--chart-neon-purple',
  '--chart-lime-green',
  '--chart-hot-pink',
  '--chart-aqua',
  '--chart-golden-yellow',
  '--chart-rose-red',
]

/** Series n takes hue n, wrapping after the last. Never hand-picked. */
export const seriesToken = (index) => SERIES_TOKENS[index % SERIES_TOKENS.length]

const escape = (value) =>
  String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

const VIEW_W = 600
const VIEW_H = 104
const POINTS = 70

/**
 * A deterministic pseudo-random trace, so a chart looks the same on every open. Real data would
 * replace this; the shape is what is being designed.
 */
export function trace(seed, base) {
  let s = seed >>> 0
  const points = []
  for (let i = 0; i < POINTS; i += 1) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    const v = Math.max(5, Math.min(VIEW_H - 5, base + (s / 4294967295 - 0.5) * 46))
    points.push(`${((i / (POINTS - 1)) * VIEW_W).toFixed(1)},${v.toFixed(1)}`)
  }
  return points.join(' ')
}

const BASES = [70, 52, 34, 86, 62, 44]

export function chartHTML(def) {
  const { title, span, series = [], yTicks = [], xTicks = [], flat } = def

  const plot = flat
    ? `<line x1="0" y1="34" x2="${VIEW_W}" y2="34" style="stroke:var(${seriesToken(0)})"/>`
    : series
        .map((_, i) => {
          const points = trace(title.length * 7717 + i * 9973 + 31, BASES[i % BASES.length])
          return `<polyline points="${points}" style="stroke:var(${seriesToken(i)})"/>`
        })
        .join('')

  const legend = series
    .map((name, i) => `<span class="wl-chart__key"><i style="background:var(${seriesToken(i)})"></i>${escape(name)}</span>`)
    .join('')

  return `
    <section class="wl-card wl-card--chart" style="--wl-span:${Number(span) || 12}">
      <h3 class="wl-card__title">${escape(title)}</h3>
      <div class="wl-chart">
        <div class="wl-chart__y">${yTicks.map((t) => `<span>${escape(t)}</span>`).join('')}</div>
        <svg class="wl-chart__plot" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none" aria-hidden="true">${plot}</svg>
        <div class="wl-chart__x">${xTicks.map((t) => `<span>${escape(t)}</span>`).join('')}</div>
        <div class="wl-chart__legend">${legend}</div>
      </div>
    </section>`
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npm test -- src/wan-link/chart.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/wan-link/chart.js src/wan-link/chart.test.js
git commit -m "feat(wan-link): SVG chart renderer coloured from DS --chart-* tokens"
```

---

### Task 4: The list

**Files:**
- Modify: `src/wan-link/screen.js`
- Create: `src/wan-link/wanLink.css`
- Modify: `src/wan-link/screen.test.js`

**Interfaces:**
- Consumes: `LINKS`, `PROBES` from `./probes.js`
- Produces: `#wan-link-table` in the mounted DOM, its `columns` set to the nine spec columns and `rows` to the seeded links.

- [ ] **Step 1: Write the failing test**

Append to `src/wan-link/screen.test.js`:

```js
describe('wan-link list', () => {
  it('renders the nine columns with RTT before STATUS', () => {
    const root = document.createElement('div')
    mount(root)
    const keys = root.querySelector('#wan-link-table').columns.map((c) => c.key)
    expect(keys).toEqual([
      'name', 'monitor', 'type', 'probe', 'sourceIp',
      'destinationIp', 'sourceInterface', 'rtt', 'status',
    ])
  })

  it('lists every seeded link, labelled by probe', () => {
    const root = document.createElement('div')
    mount(root)
    const rows = root.querySelector('#wan-link-table').rows
    expect(rows).toHaveLength(14)
    expect(new Set(rows.map((r) => r.probe))).toEqual(
      new Set(['ICMP Echo', 'UDP Echo', 'UDP Jitter']),
    )
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- src/wan-link/screen.test.js`
Expected: FAIL — `#wan-link-table` is null.

- [ ] **Step 3: Add the toolbar, filter bar and table to the template**

Replace the `app-shell__content` block in `TEMPLATE` with:

```js
    <main class="app-shell__content" id="wan-link-content">
      <obs-toolbar data-role="content-toolbar">
        <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
        <obs-button variant="primary" data-role="add-probe">Add WAN Link Probe</obs-button>
        <obs-button variant="neutral-lightest" squared aria-label="Export as PDF">
          <obs-icon name="exportPdf" size="14"></obs-icon>
        </obs-button>
        <obs-button variant="neutral-lightest" squared aria-label="Export as spreadsheet">
          <obs-icon name="exportXlsx" size="14"></obs-icon>
        </obs-button>
      </obs-toolbar>
      <obs-filters id="wan-link-filters" kind="bar"></obs-filters>
      <obs-table id="wan-link-table" row-key="id" sort="name:asc" page-size="50" sticky-header max-height="100%"></obs-table>
    </main>
```

Add `import './wanLink.css'` at the top of `screen.js`.

- [ ] **Step 4: Wire the table inside `mount`**

Insert before the `return function unmount()`:

```js
  const table = root.querySelector('#wan-link-table')

  table.columns = [
    { key: 'name', title: 'WAN LINK NAME', sortable: true, cls: 'wl-name' },
    { key: 'monitor', title: 'MONITOR', sortable: true, width: 200 },
    { key: 'type', title: 'TYPE', width: 70, align: 'center', type: 'icon' },
    { key: 'probe', title: 'WAN PROBE TYPE', sortable: true, width: 160 },
    { key: 'sourceIp', title: 'SOURCE IP', width: 140 },
    { key: 'destinationIp', title: 'DESTINATION IP', width: 150 },
    { key: 'sourceInterface', title: 'SOURCE INTERFACE', width: 160 },
    // RTT sits BEFORE status, per the reference screenshot.
    { key: 'rtt', title: 'RTT', width: 90 },
    { key: 'status', title: 'STATUS', width: 110 },
  ]

  const toRow = (l) => ({
    ...l,
    probe: PROBES[l.probe].label,
    type: { icon: 'networkTopology' },
  })

  table.rows = LINKS.map(toRow)

  const distinct = (key) => [...new Set(table.rows.map((r) => r[key]))].sort()
  const filters = root.querySelector('#wan-link-filters')
  filters.fields = [
    { key: 'probe', label: 'WAN Probe Type', type: 'enum', values: distinct('probe') },
    { key: 'status', label: 'Status', type: 'enum', values: distinct('status') },
  ]
  filters.value = []
```

Add the import: `import { LINKS, PROBES } from './probes.js'`.

- [ ] **Step 5: Write the stylesheet**

```css
/* src/wan-link/wanLink.css — token-only. No hex, rgb or hsl anywhere in this file. */

.wl-name { font-family: var(--chart-font-family, monospace); }

.wl-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 14px;
  padding: 16px 0;
}

.wl-card {
  grid-column: span var(--wl-span, 12);
  border: 1px solid var(--chart-border-color);
  border-radius: 6px;
  background: var(--card-background-color);
  padding: 12px 14px;
}

.wl-card__title { margin: 0 0 6px; font-size: 13px; font-weight: 600; color: var(--text-color); }

.wl-card--chart { min-height: 218px; display: flex; flex-direction: column; }

.wl-chart { display: grid; grid-template-columns: auto 1fr; gap: 5px 9px; flex: 1; margin-top: 10px; }

.wl-chart__y {
  grid-column: 1; grid-row: 1;
  display: flex; flex-direction: column; justify-content: space-between;
  height: 104px; text-align: right;
  font: 10px var(--chart-font-family, monospace); color: var(--chart-legend-color);
}

.wl-chart__plot {
  grid-column: 2; grid-row: 1;
  width: 100%; height: 104px;
  border-left: 1px solid var(--chart-grid-line-color);
  border-bottom: 1px solid var(--chart-grid-line-color);
}

.wl-chart__plot polyline { fill: none; stroke-width: 1.2; vector-effect: non-scaling-stroke; }
.wl-chart__plot line { stroke-width: 1.5; vector-effect: non-scaling-stroke; }

.wl-chart__x {
  grid-column: 2; grid-row: 2;
  display: flex; justify-content: space-between;
  font: 10px var(--chart-font-family, monospace); color: var(--chart-legend-color);
}

.wl-chart__legend {
  grid-column: 1 / -1; grid-row: 3;
  display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px; margin-top: 8px;
  font: 10.5px var(--chart-font-family, monospace); color: var(--chart-legend-color);
}

.wl-chart__key { display: flex; align-items: center; gap: 6px; }
.wl-chart__key i { width: 15px; height: 2px; }

.wl-tiles {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  padding-bottom: 4px;
}

.wl-tile__values { display: flex; gap: 18px; }
.wl-tile__label { font-size: 11px; color: var(--secondary-text-color); }
.wl-tile__value { font-size: 19px; font-weight: 600; color: var(--text-color); }
.wl-tile__unit { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); margin-left: 2px; }
```

- [ ] **Step 6: Run the tests and make sure they pass**

Run: `npm test -- src/wan-link/screen.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 7: Verify no hardcoded colour crept in**

Run: `grep -nEi "#[0-9a-f]{3,8}\b|\b(rgb|hsl)a?\(" src/wan-link/*.css src/wan-link/*.js`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/wan-link/
git commit -m "feat(wan-link): the WAN Link list, toolbar and filter bar"
```

---

### Task 5: The detail drawer

**Files:**
- Modify: `src/wan-link/screen.js`
- Create: `src/wan-link/detailDrawer.js`
- Create: `src/wan-link/detailDrawer.test.js`

**Interfaces:**
- Consumes: `tilesFor`, `chartsFor`, `availabilityWindows`, `PROBES` from `./probes.js`; `chartHTML` from `./chart.js`
- Produces: `renderDetailDrawer({ link, onClose })` → an `obs-drawer` element, `open` already set.

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link/detailDrawer.test.js
import { describe, it, expect, vi } from 'vitest'
import { renderDetailDrawer } from './detailDrawer.js'
import { LINKS } from './probes.js'

const linkOf = (probe) => LINKS.find((l) => l.probe === probe)

describe('detail drawer', () => {
  it('opens on the right, titled by the link', () => {
    const drawer = renderDetailDrawer({ link: linkOf('icmp-echo'), onClose: () => {} })
    expect(drawer.tagName.toLowerCase()).toBe('obs-drawer')
    expect(drawer.getAttribute('placement')).toBe('right')
    expect(drawer.hasAttribute('open')).toBe(true)
    expect(drawer.textContent).toContain(linkOf('icmp-echo').name)
  })

  it('gives an echo probe three charts and no tiles', () => {
    const drawer = renderDetailDrawer({ link: linkOf('udp-echo'), onClose: () => {} })
    expect(drawer.querySelectorAll('.wl-card--chart')).toHaveLength(3)
    expect(drawer.querySelectorAll('.wl-tile')).toHaveLength(0)
  })

  it('gives UDP Jitter six tiles and ten charts', () => {
    const drawer = renderDetailDrawer({ link: linkOf('udp-jitter'), onClose: () => {} })
    expect(drawer.querySelectorAll('.wl-tile')).toHaveLength(6)
    expect(drawer.querySelectorAll('.wl-card--chart')).toHaveLength(10)
  })

  it('labels the availability windows per probe', () => {
    const echo = renderDetailDrawer({ link: linkOf('icmp-echo'), onClose: () => {} })
    expect(echo.textContent).toContain('Last 15 Days')
    const jitter = renderDetailDrawer({ link: linkOf('udp-jitter'), onClose: () => {} })
    expect(jitter.textContent).toContain('30 Days')
  })

  it('calls onClose when the drawer closes', () => {
    const onClose = vi.fn()
    const drawer = renderDetailDrawer({ link: linkOf('icmp-echo'), onClose })
    drawer.dispatchEvent(new CustomEvent('close'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- src/wan-link/detailDrawer.test.js`
Expected: FAIL — cannot resolve `./detailDrawer.js`.

- [ ] **Step 3: Write the drawer**

```js
// src/wan-link/detailDrawer.js
import { PROBES, tilesFor, chartsFor, availabilityWindows } from './probes.js'
import { chartHTML } from './chart.js'

const escape = (value) =>
  String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

const tileHTML = (tile) => `
  <div class="wl-card wl-tile" style="--wl-span:2">
    <h3 class="wl-card__title">${escape(tile.title)}</h3>
    ${tile.caption ? `<div class="wl-tile__label">${escape(tile.caption)}</div>` : ''}
    <div class="wl-tile__values">
      ${tile.values.map((v) => `
        <div>
          ${v.label ? `<div class="wl-tile__label">${escape(v.label)}</div>` : ''}
          <div class="wl-tile__value">${escape(v.value)}${v.unit ? `<span class="wl-tile__unit">${escape(v.unit)}</span>` : ''}</div>
        </div>`).join('')}
    </div>
  </div>`

const donutHTML = (def) => `
  <section class="wl-card" style="--wl-span:${def.span}">
    <h3 class="wl-card__title">${escape(def.title)}</h3>
    <div class="wl-donut">Up <b>100%</b></div>
  </section>`

const barsHTML = (def, windows) => `
  <section class="wl-card" style="--wl-span:${def.span}">
    <h3 class="wl-card__title">${escape(def.title)}</h3>
    ${windows.map((w) => `
      <div class="wl-bar">
        <div class="wl-tile__label">${escape(w)}</div>
        <div class="wl-bar__track"></div>
      </div>`).join('')}
  </section>`

export function renderDetailDrawer({ link, onClose }) {
  const probe = PROBES[link.probe]
  const windows = availabilityWindows(link.probe)

  const body = chartsFor(link.probe)
    .map((def) => {
      if (def.kind === 'donut') return donutHTML(def)
      if (def.kind === 'bars') return barsHTML(def, windows)
      return chartHTML(def)
    })
    .join('')

  const tiles = tilesFor(link.probe)

  const drawer = document.createElement('obs-drawer')
  drawer.setAttribute('placement', 'right')
  drawer.setAttribute('width', '92%')
  drawer.setAttribute('mask-closable', '')
  drawer.setAttribute('use-padding', '')
  drawer.setAttribute('open', '')

  drawer.innerHTML = `
    <div slot="title" class="wl-drawer__title">
      <span class="wl-name">${escape(link.name)}</span>
      <span class="wl-drawer__probe">${escape(probe.label)}</span>
      <obs-severity severity="${escape(link.status)}" shape="chip" display-text></obs-severity>
    </div>
    ${tiles.length ? `<div class="wl-tiles">${tiles.map(tileHTML).join('')}</div>` : ''}
    <div class="wl-grid">${body}</div>
  `

  drawer.addEventListener('close', () => onClose())
  return drawer
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npm test -- src/wan-link/detailDrawer.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Open the drawer from a row click**

In `screen.js`, after `table.rows = …`:

```js
  // The shell provides one #overlay-root per screen and clears it between navigations.
  const overlay = document.getElementById('overlay-root')
  const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

  table.addEventListener('rowclick', (event) => {
    const id = detailValue(event)?.id
    const link = LINKS.find((l) => l.id === id)
    if (!link) return
    overlay.replaceChildren(renderDetailDrawer({ link, onClose: () => overlay.replaceChildren() }))
  })
```

Add `import { renderDetailDrawer } from './detailDrawer.js'`, and make `unmount` clear the overlay:

```js
  return function unmount() {
    overlay.replaceChildren()
  }
```

- [ ] **Step 6: Add the remaining styles**

Append to `src/wan-link/wanLink.css`:

```css
.wl-drawer__title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.wl-drawer__probe { color: var(--secondary-text-color); font-weight: 400; }

.wl-donut {
  width: 112px; height: 112px; margin: 14px auto 8px;
  border: 15px solid var(--chart-vivid-teal); border-radius: 50%;
  display: grid; place-items: center; text-align: center;
  font-size: 11px; color: var(--secondary-text-color);
}
.wl-donut b { display: block; font-size: 15px; color: var(--text-color); }

.wl-bar { margin-bottom: 12px; }
.wl-bar__track {
  height: 9px; border-radius: 3px;
  border: 1px solid var(--chart-border-color);
  background: var(--chart-emerald-green);
}
```

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/wan-link/
git commit -m "feat(wan-link): per-probe detail drawer with tiles and charts"
```

---

### Task 6: The probe config drawer

**Files:**
- Create: `src/wan-link/configDrawer.js`
- Create: `src/wan-link/configDrawer.test.js`
- Modify: `src/wan-link/screen.js`

**Interfaces:**
- Consumes: `PROBES` from `./probes.js`
- Produces: `renderConfigDrawer({ onClose })` → an `obs-drawer` element with `footer="cancel-save"`.

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link/configDrawer.test.js
import { describe, it, expect, vi } from 'vitest'
import { renderConfigDrawer } from './configDrawer.js'

describe('config drawer', () => {
  it('offers the three probes, ICMP Echo first', () => {
    const drawer = renderConfigDrawer({ onClose: () => {} })
    const select = drawer.querySelector('#wl-probe-type')
    expect(select.options.map((o) => o.value)).toEqual(['icmp-echo', 'udp-echo', 'udp-jitter'])
    expect(select.getAttribute('value')).toBe('icmp-echo')
  })

  it('hides Destination Port for ICMP Echo', () => {
    const drawer = renderConfigDrawer({ onClose: () => {} })
    expect(drawer.querySelector('#wl-dst-port').hidden).toBe(true)
  })

  it('shows Destination Port once a UDP probe is chosen', () => {
    const drawer = renderConfigDrawer({ onClose: () => {} })
    const select = drawer.querySelector('#wl-probe-type')
    select.dispatchEvent(new CustomEvent('change', { detail: ['udp-jitter'] }))
    expect(drawer.querySelector('#wl-dst-port').hidden).toBe(false)
  })

  it('names the jitter-specific fields only for jitter', () => {
    const drawer = renderConfigDrawer({ onClose: () => {} })
    const specific = drawer.querySelector('#wl-specific')
    expect(specific.textContent).toContain('XE/XR field set')
    drawer.querySelector('#wl-probe-type').dispatchEvent(new CustomEvent('change', { detail: ['udp-jitter'] }))
    expect(specific.textContent).toContain('codec')
  })

  it('closes on the footer cancel action', () => {
    const onClose = vi.fn()
    const drawer = renderConfigDrawer({ onClose })
    drawer.dispatchEvent(new CustomEvent('footer-action', { detail: ['cancel'] }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- src/wan-link/configDrawer.test.js`
Expected: FAIL — cannot resolve `./configDrawer.js`.

- [ ] **Step 3: Write the config drawer**

```js
// src/wan-link/configDrawer.js
import { PROBES } from './probes.js'

const SPECIFIC = {
  'icmp-echo': 'ICMP Echo reuses the XE/XR field set — no NX-OS-specific field is needed.',
  'udp-echo': 'UDP Echo reuses the XE/XR field set — no NX-OS-specific field is needed.',
  'udp-jitter': 'UDP Jitter adds packet count, packet interval and codec.',
}

const field = (label, id = '') =>
  `<obs-input ${id ? `id="${id}"` : ''} label="${label}" block placeholder="—"></obs-input>`

export function renderConfigDrawer({ onClose }) {
  const drawer = document.createElement('obs-drawer')
  drawer.setAttribute('placement', 'right')
  drawer.setAttribute('width', '520')
  drawer.setAttribute('title', 'Configure WAN Link Probe')
  drawer.setAttribute('footer', 'cancel-save')
  drawer.setAttribute('use-padding', '')
  drawer.setAttribute('open', '')

  drawer.innerHTML = `
    <section class="wl-form">
      <h4 class="wl-form__legend">Probe</h4>
      <obs-select id="wl-probe-type" block value="icmp-echo"></obs-select>
      ${field('Probe Name')}

      <h4 class="wl-form__legend">Source &amp; Destination</h4>
      ${field('Source Monitor (NX-OS device)')}
      <div class="wl-form__row">${field('Source IP')}${field('Source Interface')}</div>
      <div class="wl-form__row">
        ${field('Destination IP')}
        <div id="wl-dst-port">${field('Destination Port')}</div>
      </div>

      <h4 class="wl-form__legend">Schedule &amp; Thresholds</h4>
      <div class="wl-form__row">${field('Frequency')}${field('Timeout')}</div>
      <div class="wl-form__row">${field('ToS / DSCP')}${field('VRF')}</div>

      <h4 class="wl-form__legend">Probe-specific</h4>
      <p id="wl-specific" class="wl-form__note"></p>
    </section>
  `

  const select = drawer.querySelector('#wl-probe-type')
  // A real JS array, not a JSON attribute — obs-select accepts el.options = [...].
  select.options = Object.values(PROBES).map((p) => ({ value: p.key, text: p.label }))

  const port = drawer.querySelector('#wl-dst-port')
  const specific = drawer.querySelector('#wl-specific')

  const sync = (key) => {
    // UDP probes address a port; ICMP does not.
    port.hidden = !PROBES[key].needsPort
    specific.textContent = SPECIFIC[key]
  }

  const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)
  select.addEventListener('change', (event) => sync(detailValue(event) ?? 'icmp-echo'))
  sync('icmp-echo')

  drawer.addEventListener('footer-action', () => onClose())
  drawer.addEventListener('close', () => onClose())
  return drawer
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npm test -- src/wan-link/configDrawer.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Wire the toolbar button**

In `screen.js`, after the `rowclick` listener:

```js
  root.querySelector('[data-role="add-probe"]').addEventListener('click', () => {
    overlay.replaceChildren(renderConfigDrawer({ onClose: () => overlay.replaceChildren() }))
  })
```

Add `import { renderConfigDrawer } from './configDrawer.js'`, and append to `wanLink.css`:

```css
.wl-form__legend {
  margin: 22px 0 10px; padding-bottom: 8px;
  border-bottom: 1px solid var(--chart-border-color);
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--secondary-text-color);
}
.wl-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.wl-form__note { font-size: 12px; color: var(--secondary-text-color); }
```

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/wan-link/
git commit -m "feat(wan-link): probe configuration drawer"
```

---

### Task 7: Verify by rendering, then document

jsdom has hidden real defects in this repo — a passing suite is not evidence the screen works.

**Files:**
- Create: `scripts/verify-wan-link.mjs`
- Modify: `docs/DS-GAPS.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write the render probe**

```js
// scripts/verify-wan-link.mjs — run against `npm run dev`, not the built bundle.
import { chromium } from 'playwright-core'

const EXE = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.env.URL || 'http://localhost:5173/#/monitors/wan-link'

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

await page.goto(URL, { waitUntil: 'networkidle' })

const rows = await page.locator('obs-table').evaluate((t) => t.rows.length)
await page.screenshot({ path: 'docs/shots/wan-link-list.png' })

// A real click, not a synthetic event: open the UDP Jitter drawer.
await page.getByText('UDP Jitter').first().click()
await page.waitForTimeout(400)
const tiles = await page.locator('.wl-tile').count()
const charts = await page.locator('.wl-card--chart').count()
const polylines = await page.locator('.wl-chart__plot polyline').count()
await page.screenshot({ path: 'docs/shots/wan-link-jitter.png' })

// Every stroke must resolve to a real colour — an unresolved var() computes to '' or 'none'.
const strokes = await page.locator('.wl-chart__plot polyline').evaluateAll((els) =>
  els.map((e) => getComputedStyle(e).stroke))
const unresolved = strokes.filter((s) => !s || s === 'none')

console.log(JSON.stringify({ rows, tiles, charts, polylines, unresolved: unresolved.length, errors }, null, 2))
await browser.close()

if (errors.length || unresolved.length || tiles !== 6 || charts !== 10) process.exit(1)
```

- [ ] **Step 2: Run the dev server and the probe**

```bash
npm run dev &
node scripts/verify-wan-link.mjs
```

Expected: `rows: 14`, `tiles: 6`, `charts: 10`, `polylines: 29`, `unresolved: 0`, `errors: []`.

- [ ] **Step 3: Look at the screenshots**

Open `docs/shots/wan-link-list.png` and `docs/shots/wan-link-jitter.png`. Confirm by eye: nine columns with RTT before STATUS, down rows blank in RTT, six tiles in one row, four chart rows each filling the full width, series colours distinguishable.

- [ ] **Step 4: Run the no-hardcoded-colours guard and the conformance checker**

```bash
grep -nEi "#[0-9a-f]{3,8}\b|\b(rgb|hsl)a?\(" src/wan-link/*.css src/wan-link/*.js
node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs ./index.html
```

Expected: no grep output; conformance 100/100. The checker exits 2 after one line if `playwright-core` is missing, which reads like a pass — confirm it printed a score.

- [ ] **Step 5: Record the DS gap**

Append to `docs/DS-GAPS.md` a finding in the file's existing format: **the DS ships no chart element**, so a screen whose whole purpose is time-series has to hand-roll SVG. Evidence: `elements-api.json` lists 47 elements, none of which draws a series; `tokens/chart-palette.json` states the product uses Highcharts. Workaround: inline SVG coloured from the `--chart-*` custom properties. Class it *DS — capability*. Ask: expose the product's Highcharts wrapper as `obs-chart`, or publish the axis/legend/tooltip chrome so consumers stop rebuilding it.

- [ ] **Step 6: Update CLAUDE.md**

Add the WAN Link screen to the Structure section and to the pages table, and note that `#/monitors/wan-link` is the first screen in the Monitors module.

- [ ] **Step 7: Commit**

```bash
git add scripts/verify-wan-link.mjs docs/ CLAUDE.md
git commit -m "test(wan-link): headless-Chrome verification, DS gap and docs"
```

---

## Self-Review

**Spec coverage** — every section maps to a task: route and landing path → Task 1; list columns and seed → Tasks 2 and 4; echo layout → Tasks 2 and 5; jitter tiles and charts → Tasks 2, 3 and 5; config drawer → Task 6; charts-from-tokens → Task 3; constraints → Tasks 4 step 7 and 7 steps 4–5.

**Placeholders** — none. Every code step carries the code; every test step carries the assertions.

**Type consistency** — `chartsFor()` returns `{ row, title, span, kind, series, yTicks, xTicks, flat? }` in Task 2 and is consumed with exactly those keys by `chartHTML` in Task 3 and `renderDetailDrawer` in Task 5. `tilesFor()` returns `{ title, caption, values:[{label,value,unit}] }` in Task 2 and is read with those keys in Task 5. `PROBES[key].needsPort` is defined in Task 2 and used in Task 6.

**One risk carried forward:** `obs-table`'s `type: 'icon'` cell and `obs-filters`' `kind="bar"` are used from `elements-api.json` rather than from a rendered check. Task 7 step 3 is where that gets confirmed; if either misbehaves it becomes a DS-GAPS entry, not a silent workaround.
