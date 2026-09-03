# WAN Link Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the WAN Link discovery flow as a new screen in this app — a Create Discovery Profile form that starts from an already-monitored network device, then a run, then a provision grid.

**Architecture:** Five pure data/logic modules carry the whole domain (the platform matrix, the seeded monitors, CSV parsing, the run simulation, the profile store) and are unit-tested without any DOM. Three DOM modules render the form, the progress panel and the provision grid from those. `screen.js` is wiring only: it owns which of the four views is showing and passes callbacks between them. This mirrors how `src/report-categories/` splits `store.js` from its panels.

**Tech Stack:** Vanilla JS ES modules, Vite 8, Vitest + jsdom, `@mtdt/observeops-ds-elements` web components, the `observeops-ds` MCP server for component discovery.

**Spec:** `docs/superpowers/specs/2026-09-02-wan-link-discovery-design.md`

## Global Constraints

- **Node 22.22.2+, 24.15+, or 26+.** `jsdom` refuses older.
- **No hardcoded colours.** Every colour is `var(--token)` resolved via the MCP `resolve_token`. There is not one hex/rgb/hsl in the application CSS, and this plan must not add one.
- **Never guess a component's API.** Look it up (`search_components` / `get_component`, or `node_modules/@mtdt/observeops-ds-spec/elements-api.json`), then confirm by rendering. Every DOM task below has a lookup step; do not skip it.
- **`obs-select` has NO `label` attribute** — `obs-input` does, `obs-select` and `obs-radio` do not. Selects need an external `<label>`. Confirmed in `src/lama/lamaProfileDrawer.js:43`.
- **`obs-select` takes a real JS array**, not a JSON attribute: `el.options = [{ value, text }]`. Confirmed in `src/wan-link/configDrawer.js:45`.
- **DS `change` events carry an array**: `event.detail` is `['udp-echo']`, not `'udp-echo'`. Use the `detailValue` helper pattern from `src/wan-link/screen.js:135`.
- **`obs-table` emits `rowclick` with the bare row key as a string**, e.g. `['p1']`. Confirmed by rendering; see `src/wan-link/screen.js:139`.
- **Verify by rendering, never by reading.** jsdom and static reads have both produced confidently wrong answers in this repo. Task 12 is not optional.
- **Probe labels are the platform's own vocabulary** and are not normalised. `Path Echo` (IOS XE) and `ICMP Path Echo` (IOS XR) are different strings on purpose.
- **Run `npm test` after every task.** The suite is currently 458 tests across 26 files; it must stay green.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/wan-link-discovery/platforms.js` | The platform matrix: vendors, device OS, method, probe lists, `needsPort`, the vendor-specific Operations title. Pure. |
| `src/wan-link-discovery/monitors.js` | Seeded monitored devices, their interfaces and collectors, plus credential profiles and the prefill rule. Pure. |
| `src/wan-link-discovery/csv.js` | The CSV column contract, sample-file text, and a parser returning rows plus errors. Pure. |
| `src/wan-link-discovery/runner.js` | The four-stage push: stage text per platform, and where each simulated outcome fails. Pure. |
| `src/wan-link-discovery/profileStore.js` | Discovery profiles, their run results, and the immutability rule. Pure. |
| `src/wan-link-discovery/createForm.js` | The Create Discovery Profile form — all five blocks, the reactive rules, Single/CSV modes, validation. |
| `src/wan-link-discovery/progressPanel.js` | The progress view — tiles, per-link cards, the four-stage narration. |
| `src/wan-link-discovery/provisionGrid.js` | The provision grid — columns, N/P/U badges, selection, inline rename. |
| `src/wan-link-discovery/screen.js` | Wiring: the profile list, and which of the four views is showing. Exports `meta` and `mount`. |
| `src/wan-link-discovery/wanLinkDiscovery.css` | Token-only layout for the form grid, progress cards and badges. |
| `src/app/registry.js` | One new entry under the `settings` module. |
| `src/wan-link/screen.js` | Gains an `Add WAN Link` button that deep-links into the new form. |

Route: `#/settings/wan-link-discovery`.

---

### Task 1: The platform matrix

**Files:**
- Create: `src/wan-link-discovery/platforms.js`
- Test: `src/wan-link-discovery/platforms.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `VENDORS: string[]`, `PLATFORMS: Record<string, {key, vendor, label, method, probes: string[]}>`, `osOptions(vendor) → {value,text}[]`, `probeOptions(osKey) → {value,text}[]`, `needsPort(probe) → boolean`, `hasTemplate(probe) → boolean`, `slaTitle(vendor) → string`.

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link-discovery/platforms.test.js
import { describe, it, expect } from 'vitest'
import {
  VENDORS, PLATFORMS, osOptions, probeOptions, needsPort, hasTemplate, slaTitle,
} from './platforms.js'

describe('platform matrix', () => {
  it('carries exactly the four platforms', () => {
    expect(Object.keys(PLATFORMS)).toEqual(['ios-xe', 'ios-xr', 'nx-os', 'rpm'])
  })

  it('gives every platform exactly one method', () => {
    expect(PLATFORMS['ios-xe'].method).toBe('SNMP')
    expect(PLATFORMS['ios-xr'].method).toBe('SSH')
    expect(PLATFORMS['nx-os'].method).toBe('SSH')
    expect(PLATFORMS['rpm'].method).toBe('SNMP')
  })

  it('lists each platform its own probes', () => {
    expect(PLATFORMS['ios-xe'].probes).toEqual(['ICMP Echo', 'ICMP Jitter', 'Path Echo'])
    expect(PLATFORMS['ios-xr'].probes).toEqual([
      'ICMP Echo', 'UDP Echo', 'UDP Jitter', 'ICMP Path Echo', 'ICMP Path Jitter',
    ])
    expect(PLATFORMS['nx-os'].probes).toEqual(['ICMP Echo', 'UDP Echo', 'UDP Jitter'])
    expect(PLATFORMS['rpm'].probes).toEqual(['ICMP Ping'])
  })

  it('does not normalise probe names across platforms', () => {
    expect(PLATFORMS['ios-xe'].probes).toContain('Path Echo')
    expect(PLATFORMS['ios-xr'].probes).toContain('ICMP Path Echo')
    expect(PLATFORMS['rpm'].probes).toContain('ICMP Ping')
    expect(PLATFORMS['rpm'].probes).not.toContain('ICMP Echo')
  })

  it('cascades Device OS from Vendor', () => {
    expect(VENDORS).toEqual(['Cisco Systems', 'Juniper'])
    expect(osOptions('Cisco Systems').map((o) => o.value)).toEqual(['ios-xe', 'ios-xr', 'nx-os'])
    expect(osOptions('Juniper').map((o) => o.value)).toEqual(['rpm'])
    expect(osOptions('Cisco Systems')[2].text).toBe('NX-OS')
  })

  it('needs a UDP port for exactly the two UDP probes', () => {
    expect(needsPort('UDP Echo')).toBe(true)
    expect(needsPort('UDP Jitter')).toBe(true)
    expect(needsPort('ICMP Echo')).toBe(false)
    expect(needsPort('ICMP Ping')).toBe(false)
    expect(needsPort('ICMP Path Jitter')).toBe(false)
  })

  it('marks the probes that have no monitor template', () => {
    expect(hasTemplate('ICMP Echo')).toBe(true)
    expect(hasTemplate('UDP Echo')).toBe(true)
    expect(hasTemplate('UDP Jitter')).toBe(true)
    expect(hasTemplate('Path Echo')).toBe(false)
    expect(hasTemplate('ICMP Path Jitter')).toBe(false)
    expect(hasTemplate('ICMP Ping')).toBe(false)
  })

  it('labels the untemplated probes in the dropdown', () => {
    const xe = probeOptions('ios-xe')
    expect(xe[0]).toEqual({ value: 'ICMP Echo', text: 'ICMP Echo' })
    expect(xe[2].value).toBe('Path Echo')
    expect(xe[2].text).toContain('no monitor template yet')
  })

  it('names the Operations block after the vendor', () => {
    expect(slaTitle('Cisco Systems')).toBe('IP SLA Operations Test Parameters')
    expect(slaTitle('Juniper')).toBe('Juniper RPM Operations Test Parameters')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wan-link-discovery/platforms.test.js`
Expected: FAIL — `Failed to resolve import "./platforms.js"`

- [ ] **Step 3: Write the implementation**

```js
// src/wan-link-discovery/platforms.js
// The platform matrix behind WAN Link discovery.
// See docs/superpowers/specs/2026-09-02-wan-link-discovery-design.md.
//
// Two independent tables, not four bespoke forms: the probe list varies by PLATFORM, and the field
// set varies by PROBE. Everything else on the form is shared.

export const VENDORS = ['Cisco Systems', 'Juniper']

export const PLATFORMS = {
  'ios-xe': {
    key: 'ios-xe', vendor: 'Cisco Systems', label: 'IOS XE', method: 'SNMP',
    probes: ['ICMP Echo', 'ICMP Jitter', 'Path Echo'],
  },
  'ios-xr': {
    key: 'ios-xr', vendor: 'Cisco Systems', label: 'IOS XR', method: 'SSH',
    probes: ['ICMP Echo', 'UDP Echo', 'UDP Jitter', 'ICMP Path Echo', 'ICMP Path Jitter'],
  },
  'nx-os': {
    key: 'nx-os', vendor: 'Cisco Systems', label: 'NX-OS', method: 'SSH',
    probes: ['ICMP Echo', 'UDP Echo', 'UDP Jitter'],
  },
  rpm: {
    key: 'rpm', vendor: 'Juniper', label: 'RPM', method: 'SNMP',
    probes: ['ICMP Ping'],
  },
}

// Probe names are the platform's OWN vocabulary and are deliberately not unified: IOS XE says
// `Path Echo` where IOS XR says `ICMP Path Echo`, and Juniper says `ICMP Ping` where Cisco says
// `ICMP Echo`. The device CLI is what a network engineer will check the UI against.

/** The only conditional field on the form. UDP addresses a port; ICMP does not. */
const PORT_PROBES = ['UDP Echo', 'UDP Jitter']
export const needsPort = (probe) => PORT_PROBES.includes(probe)

// Only the three NX-OS probes have a monitor template today. The others create a valid operation
// that nothing can yet render, so the dropdown says so rather than leaving it silent.
const TEMPLATED = ['ICMP Echo', 'UDP Echo', 'UDP Jitter']
export const hasTemplate = (probe) => TEMPLATED.includes(probe)

export const platformsFor = (vendor) =>
  Object.values(PLATFORMS).filter((p) => p.vendor === vendor)

export const osOptions = (vendor) =>
  platformsFor(vendor).map((p) => ({ value: p.key, text: p.label }))

export const probeOptions = (osKey) =>
  (PLATFORMS[osKey]?.probes ?? []).map((probe) => ({
    value: probe,
    text: hasTemplate(probe) ? probe : `${probe}   (no monitor template yet)`,
  }))

/** The Operations block is named by the vendor — the product already varies this string. */
export const slaTitle = (vendor) =>
  vendor === 'Juniper'
    ? 'Juniper RPM Operations Test Parameters'
    : 'IP SLA Operations Test Parameters'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wan-link-discovery/platforms.test.js`
Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/wan-link-discovery/platforms.js src/wan-link-discovery/platforms.test.js
git commit -m "feat(wan-link-discovery): the platform matrix

Four platforms, one method each, each with its own probe vocabulary.
needsPort is the only field rule; hasTemplate marks the probes nothing
renders yet.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Seeded monitors and credential prefill

**Files:**
- Create: `src/wan-link-discovery/monitors.js`
- Test: `src/wan-link-discovery/monitors.test.js`

**Interfaces:**
- Consumes: `PLATFORMS` from `./platforms.js`.
- Produces: `MONITORS: {id,name,ip,vendor,os,collector,interfaces:string[],credential:string|null}[]`, `CREDENTIALS: {SSH:string[], SNMP:string[]}`, `findMonitor(id)`, `monitorOptions()`, `credentialOptions(method)`, `interfaceOptions(monitor)`, `prefillCredential(monitor, method) → string`.

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link-discovery/monitors.test.js
import { describe, it, expect } from 'vitest'
import { PLATFORMS } from './platforms.js'
import {
  MONITORS, CREDENTIALS, findMonitor, monitorOptions,
  credentialOptions, interfaceOptions, prefillCredential,
} from './monitors.js'

describe('seeded monitors', () => {
  it('covers every platform at least once', () => {
    for (const key of Object.keys(PLATFORMS)) {
      expect(MONITORS.filter((m) => m.os === key).length).toBeGreaterThan(0)
    }
  })

  it('gives every monitor an OS the matrix knows and a matching vendor', () => {
    for (const m of MONITORS) {
      expect(PLATFORMS[m.os]).toBeDefined()
      expect(PLATFORMS[m.os].vendor).toBe(m.vendor)
    }
  })

  it('gives every monitor interfaces to offer as Source Interface', () => {
    expect(MONITORS.every((m) => m.interfaces.length > 0)).toBe(true)
  })

  it('labels each option with name, IP and platform', () => {
    const opt = monitorOptions().find((o) => o.value === 'm-nxos')
    expect(opt.text).toContain('CORE-NX-01.test.com')
    expect(opt.text).toContain('10.20.40.12')
    expect(opt.text).toContain('NX-OS')
  })

  it('finds a monitor by id', () => {
    expect(findMonitor('m-nxos').name).toBe('CORE-NX-01.test.com')
    expect(findMonitor('nope')).toBeUndefined()
  })
})

describe('credential prefill', () => {
  it('filters the dropdown to the platform protocol', () => {
    expect(credentialOptions('SSH').map((o) => o.value)).toEqual(CREDENTIALS.SSH)
    expect(credentialOptions('SNMP').map((o) => o.value)).toEqual(CREDENTIALS.SNMP)
  })

  it('prefills when the monitor credential matches the protocol', () => {
    expect(prefillCredential(findMonitor('m-nxos'), 'SSH')).toBe('NXOS-SSH-Ops')
  })

  it('leaves it empty when the protocol does not match', () => {
    // The NX-OS box is monitored over SSH; asking for its SNMP credential must not invent one.
    expect(prefillCredential(findMonitor('m-nxos'), 'SNMP')).toBe('')
  })

  it('leaves it empty when the monitor has no credential on record', () => {
    expect(findMonitor('m-juniper').credential).toBeNull()
    expect(prefillCredential(findMonitor('m-juniper'), 'SNMP')).toBe('')
  })
})

describe('source interfaces', () => {
  it('offers the selected monitor its own interfaces', () => {
    const opts = interfaceOptions(findMonitor('m-nxos'))
    expect(opts.map((o) => o.value)).toContain('Ethernet1/48')
    expect(opts.map((o) => o.value)).not.toContain('ge-0/0/0')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wan-link-discovery/monitors.test.js`
Expected: FAIL — `Failed to resolve import "./monitors.js"`

- [ ] **Step 3: Write the implementation**

```js
// src/wan-link-discovery/monitors.js
// The already-monitored network devices a WAN link can be created on, and the credential profiles
// that reach them. Seeded in memory — this app has no backend.
//
// The whole point of the redesign is that these devices are ALREADY monitored, so their vendor, OS,
// collector, interfaces and credential are known before the form asks anything.

import { PLATFORMS } from './platforms.js'

export const CREDENTIALS = {
  SSH: ['Router-SSH-Admin', 'NXOS-SSH-Ops', 'Branch-SSH'],
  SNMP: ['Core-SNMP-v2c', 'Edge-SNMP-v3'],
}

export const MONITORS = [
  {
    id: 'm-xe', name: 'PMG-Router.test.com', ip: '172.16.9.41',
    vendor: 'Cisco Systems', os: 'ios-xe', collector: 'COL-DC1',
    interfaces: ['GigabitEthernet0/0/0', 'GigabitEthernet0/0/1', 'GigabitEthernet0/0/2', 'Loopback0'],
    credential: 'Core-SNMP-v2c',
  },
  {
    id: 'm-xr', name: 'EDGE-RTR-XR.test.com', ip: '10.100.1.7',
    vendor: 'Cisco Systems', os: 'ios-xr', collector: 'COL-DC1',
    interfaces: ['TenGigE0/0/0/0', 'TenGigE0/0/0/1', 'BVI100'],
    credential: 'Router-SSH-Admin',
  },
  {
    id: 'm-nxos', name: 'CORE-NX-01.test.com', ip: '10.20.40.12',
    vendor: 'Cisco Systems', os: 'nx-os', collector: 'COL-DC2',
    interfaces: ['Ethernet1/1', 'Ethernet1/2', 'Ethernet1/48', 'mgmt0'],
    credential: 'NXOS-SSH-Ops',
  },
  {
    id: 'm-juniper', name: 'BR-JUN-01.test.com', ip: '10.100.54.11',
    vendor: 'Juniper', os: 'rpm', collector: 'COL-BR1',
    interfaces: ['ge-0/0/0', 'ge-0/0/1', 'lo0'],
    // Deliberately null: the empty-prefill branch needs a monitor that exercises it.
    credential: null,
  },
]

export const findMonitor = (id) => MONITORS.find((m) => m.id === id)

export const monitorOptions = () =>
  MONITORS.map((m) => ({
    value: m.id,
    text: `${m.name}  ·  ${m.ip}  ·  ${m.vendor} ${PLATFORMS[m.os].label}`,
  }))

export const credentialOptions = (method) =>
  (CREDENTIALS[method] ?? []).map((c) => ({ value: c, text: c }))

export const interfaceOptions = (monitor) =>
  (monitor?.interfaces ?? []).map((i) => ({ value: i, text: i }))

/**
 * The monitor already has a credential, but it is the one used to MONITOR the device — which may
 * speak a different protocol than the WAN link needs. Prefill only on a match; otherwise the field
 * stays empty and required.
 */
export const prefillCredential = (monitor, method) =>
  monitor?.credential && (CREDENTIALS[method] ?? []).includes(monitor.credential)
    ? monitor.credential
    : ''
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wan-link-discovery/monitors.test.js`
Expected: PASS — 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/wan-link-discovery/monitors.js src/wan-link-discovery/monitors.test.js
git commit -m "feat(wan-link-discovery): seeded monitors and the credential prefill rule

Prefill only when the monitor's own credential speaks the protocol the
platform needs; the Juniper seed carries no credential so the empty
branch stays covered.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: The CSV contract

**Files:**
- Create: `src/wan-link-discovery/csv.js`
- Test: `src/wan-link-discovery/csv.test.js`

**Interfaces:**
- Consumes: `PLATFORMS`, `needsPort` from `./platforms.js` — and nothing else. `findMonitor` appears in the TEST only; do not import monitors.js into csv.js.
- Produces: `CSV_COLUMNS: string[]`, `sampleCsv(monitor, osKey) → string`, `parseCsv(text) → {rows: Link[], errors: string[]}` where `Link = {probe, isp, iface, srcLocation, dip, dstLocation, port}`.

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link-discovery/csv.test.js
import { describe, it, expect } from 'vitest'
import { CSV_COLUMNS, sampleCsv, parseCsv } from './csv.js'
import { findMonitor } from './monitors.js'

describe('csv contract', () => {
  it('carries exactly the per-link fields the Single form asks for', () => {
    expect(CSV_COLUMNS).toEqual([
      'wan_probe', 'isp', 'source_interface', 'source_router_location',
      'destination_ip', 'destination_router_location', 'udp_port',
    ])
  })

  it('writes a sample whose header is the contract', () => {
    const text = sampleCsv(findMonitor('m-nxos'), 'nx-os')
    expect(text.split('\n')[0]).toBe(CSV_COLUMNS.join(','))
  })

  it('samples only probes the chosen platform actually has', () => {
    const rows = parseCsv(sampleCsv(findMonitor('m-juniper'), 'rpm')).rows
    expect(rows.every((r) => r.probe === 'ICMP Ping')).toBe(true)
  })

  it('leaves udp_port blank on rows whose probe is not a UDP probe', () => {
    const rows = parseCsv(sampleCsv(findMonitor('m-nxos'), 'nx-os')).rows
    const icmp = rows.find((r) => r.probe === 'ICMP Echo')
    const udp = rows.find((r) => r.probe === 'UDP Echo')
    expect(icmp.port).toBe('')
    expect(udp.port).not.toBe('')
  })
})

describe('csv parsing', () => {
  const HEADER = CSV_COLUMNS.join(',')

  it('parses one row per link', () => {
    const { rows, errors } = parseCsv(
      `${HEADER}\nUDP Echo,Airtel,Ethernet1/1,Pune DC,8.8.8.8,Mumbai DC,5000`,
    )
    expect(errors).toEqual([])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      probe: 'UDP Echo', isp: 'Airtel', iface: 'Ethernet1/1', srcLocation: 'Pune DC',
      dip: '8.8.8.8', dstLocation: 'Mumbai DC', port: '5000',
    })
  })

  it('ignores blank lines and trims cells', () => {
    const { rows } = parseCsv(`${HEADER}\n\n  ICMP Echo , Jio ,Eth1/2,,1.1.1.1,, \n\n`)
    expect(rows).toHaveLength(1)
    expect(rows[0].probe).toBe('ICMP Echo')
    expect(rows[0].isp).toBe('Jio')
    expect(rows[0].port).toBe('')
  })

  it('rejects a file whose header is not the contract', () => {
    const { rows, errors } = parseCsv('probe,isp\nICMP Echo,Airtel')
    expect(rows).toEqual([])
    expect(errors[0]).toContain('header')
  })

  it('reports the row number when a UDP row has no port', () => {
    const { errors } = parseCsv(`${HEADER}\nUDP Jitter,Tata,Eth1/1,,9.9.9.9,,`)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('row 1')
    expect(errors[0]).toContain('udp_port')
  })

  it('reports a row missing a mandatory cell', () => {
    const { errors } = parseCsv(`${HEADER}\nICMP Echo,,Eth1/1,,8.8.8.8,,`)
    expect(errors.some((e) => e.includes('isp'))).toBe(true)
  })

  it('accepts a file that mixes probe types', () => {
    const { rows, errors } = parseCsv(
      `${HEADER}\nICMP Echo,Airtel,Eth1/1,,8.8.8.8,,\nUDP Echo,Jio,Eth1/2,,1.1.1.1,,5000`,
    )
    expect(errors).toEqual([])
    expect(rows.map((r) => r.probe)).toEqual(['ICMP Echo', 'UDP Echo'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wan-link-discovery/csv.test.js`
Expected: FAIL — `Failed to resolve import "./csv.js"`

- [ ] **Step 3: Write the implementation**

```js
// src/wan-link-discovery/csv.js
// Bulk mode. One row per link, carrying exactly the fields the Single form asks per link — the
// same shape for every Device OS. Credential Profile, Timeout and the Operations Test Parameters
// stay on the form and apply to every row.
//
// The Bulk tab in the product shows no WAN Probe field, so the probe must be a column, and one file
// may therefore mix probe types. That is inferred from the screenshots, not observed in a CSV.

import { PLATFORMS, needsPort } from './platforms.js'

export const CSV_COLUMNS = [
  'wan_probe', 'isp', 'source_interface', 'source_router_location',
  'destination_ip', 'destination_router_location', 'udp_port',
]

const KEYS = ['probe', 'isp', 'iface', 'srcLocation', 'dip', 'dstLocation', 'port']
const MANDATORY = { probe: 'wan_probe', isp: 'isp', dip: 'destination_ip' }

const SAMPLE_ISPS = ['Airtel', 'Jio', 'Tata']
const SAMPLE_DIPS = ['8.8.8.8', '1.1.1.1', '9.9.9.9']

/** Three rows, cycling the platform's own probes and the monitor's own interfaces. */
export function sampleCsv(monitor, osKey) {
  const probes = PLATFORMS[osKey]?.probes ?? []
  const ifaces = monitor?.interfaces ?? []
  const rows = [0, 1, 2].map((i) => {
    const probe = probes[i % probes.length]
    return [
      probe,
      SAMPLE_ISPS[i],
      ifaces[i % ifaces.length] ?? '',
      'Pune DC',
      SAMPLE_DIPS[i],
      'Mumbai DC',
      needsPort(probe) ? String(5000 + i) : '',
    ].join(',')
  })
  return [CSV_COLUMNS.join(','), ...rows].join('\n')
}

export function parseCsv(text) {
  const lines = String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { rows: [], errors: ['The file is empty.'] }

  const header = lines[0].split(',').map((c) => c.trim())
  if (header.join(',') !== CSV_COLUMNS.join(',')) {
    return { rows: [], errors: [`Unexpected header. Expected: ${CSV_COLUMNS.join(', ')}`] }
  }

  const rows = []
  const errors = []
  lines.slice(1).forEach((line, i) => {
    const cells = line.split(',').map((c) => c.trim())
    const row = Object.fromEntries(KEYS.map((k, n) => [k, cells[n] ?? '']))
    const at = `row ${i + 1}`

    for (const [key, column] of Object.entries(MANDATORY)) {
      if (!row[key]) errors.push(`${at}: ${column} is required.`)
    }
    // The one conditional field, enforced per row rather than per file — a mixed file is legal.
    if (needsPort(row.probe) && !row.port) {
      errors.push(`${at}: udp_port is required for ${row.probe}.`)
    }
    rows.push(row)
  })

  return errors.length ? { rows: [], errors } : { rows, errors }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wan-link-discovery/csv.test.js`
Expected: PASS — 11 tests

- [ ] **Step 5: Commit**

```bash
git add src/wan-link-discovery/csv.js src/wan-link-discovery/csv.test.js
git commit -m "feat(wan-link-discovery): the bulk CSV contract

One row per link, one shape for every Device OS. udp_port is enforced
per row, so a file may mix probe types.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The four-stage run

**Files:**
- Create: `src/wan-link-discovery/runner.js`
- Test: `src/wan-link-discovery/runner.test.js`

**Interfaces:**
- Consumes: `PLATFORMS` from `./platforms.js`.
- Produces: `OUTCOMES: string[]`, `stagesFor({monitorName, method, vendor}) → string[]` (4 entries), `planRun({monitor, osKey, outcome, index}) → {stages, failIndex, failText, successText, ok}`.

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link-discovery/runner.test.js
import { describe, it, expect } from 'vitest'
import { OUTCOMES, stagesFor, planRun } from './runner.js'
import { findMonitor } from './monitors.js'

describe('run stages', () => {
  it('narrates four stages, not one', () => {
    const stages = stagesFor({ monitorName: 'CORE-NX-01', method: 'SSH', vendor: 'Cisco Systems' })
    expect(stages).toHaveLength(4)
  })

  it('names the transport in the first stage', () => {
    expect(stagesFor({ monitorName: 'A', method: 'SSH', vendor: 'Cisco Systems' })[0])
      .toBe('Connecting to A over SSH')
    expect(stagesFor({ monitorName: 'B', method: 'SNMP', vendor: 'Juniper' })[0])
      .toBe('Connecting to B over SNMP')
  })

  it('names what it creates after the vendor', () => {
    expect(stagesFor({ monitorName: 'A', method: 'SSH', vendor: 'Cisco Systems' })[2])
      .toBe('Creating IP SLA operation')
    expect(stagesFor({ monitorName: 'B', method: 'SNMP', vendor: 'Juniper' })[2])
      .toBe('Creating RPM probe')
  })
})

describe('run outcomes', () => {
  it('offers the four outcomes', () => {
    expect(OUTCOMES).toEqual(['ok', 'auth', 'operation', 'unreachable'])
  })

  it('succeeds with no failing stage', () => {
    const plan = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'ok', index: 0 })
    expect(plan.ok).toBe(true)
    expect(plan.failIndex).toBe(-1)
    expect(plan.successText).toContain('RTT')
  })

  it('fails auth at stage 1, and words it per transport', () => {
    const ssh = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'auth', index: 0 })
    expect(ssh.failIndex).toBe(0)
    expect(ssh.failText).toBe('SSH authentication failed')

    const snmp = planRun({ monitor: findMonitor('m-xe'), osKey: 'ios-xe', outcome: 'auth', index: 0 })
    expect(snmp.failText).toContain('SNMP')
  })

  it('separates a configuration failure from a dead path', () => {
    const op = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'operation', index: 0 })
    const un = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'unreachable', index: 0 })
    expect(op.failIndex).toBe(2)
    expect(un.failIndex).toBe(3)
    expect(op.failText).not.toBe(un.failText)
    expect(op.ok).toBe(false)
    expect(un.ok).toBe(false)
  })

  it('varies the reported RTT per link so a bulk run does not read as copied', () => {
    const a = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'ok', index: 0 })
    const b = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'ok', index: 1 })
    expect(a.successText).not.toBe(b.successText)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wan-link-discovery/runner.test.js`
Expected: FAIL — `Failed to resolve import "./runner.js"`

- [ ] **Step 3: Write the implementation**

```js
// src/wan-link-discovery/runner.js
// Declare -> push -> verify. The profile declares a link; the run pushes that operation to the
// router and waits for its first result.
//
// A device discovery card narrates one line ("Ping successful"). A WAN link push has four stages
// that fail DIFFERENTLY, and the difference is the diagnosis: a stage-3 failure is bad
// configuration, a stage-4 failure is a dead path. One generic "failed" hides that.

import { PLATFORMS } from './platforms.js'

export const OUTCOMES = ['ok', 'auth', 'operation', 'unreachable']

export const stagesFor = ({ monitorName, method, vendor }) => [
  `Connecting to ${monitorName} over ${method}`,
  'Credential validated',
  `Creating ${vendor === 'Juniper' ? 'RPM probe' : 'IP SLA operation'}`,
  'Waiting for first result…',
]

const FAILURES = {
  auth: {
    index: 0,
    text: (method) =>
      method === 'SSH' ? 'SSH authentication failed' : 'SNMP timeout — no response from device',
  },
  operation: { index: 2, text: () => 'Operation id already in use' },
  unreachable: { index: 3, text: () => 'Destination unreachable — no result within timeout' },
}

/**
 * Everything the progress panel needs to animate one link, with no timing in it.
 * `index` is the link's position in the run, used only to vary the reported RTT.
 */
export function planRun({ monitor, osKey, outcome, index = 0 }) {
  const platform = PLATFORMS[osKey]
  const stages = stagesFor({
    monitorName: monitor.name, method: platform.method, vendor: platform.vendor,
  })
  const failure = FAILURES[outcome]
  return {
    stages,
    failIndex: failure ? failure.index : -1,
    failText: failure ? failure.text(platform.method) : '',
    successText: `First result received — RTT ${2 + index} ms`,
    ok: !failure,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wan-link-discovery/runner.test.js`
Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/wan-link-discovery/runner.js src/wan-link-discovery/runner.test.js
git commit -m "feat(wan-link-discovery): the four-stage push, without timing

planRun returns stages, failIndex and failText so the panel animates it
and the tests assert it, with no timers in the logic.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The profile store and the immutability rule

**Files:**
- Create: `src/wan-link-discovery/profileStore.js`
- Test: `src/wan-link-discovery/profileStore.test.js`

**Interfaces:**
- Consumes: `PLATFORMS` from `./platforms.js`; `findMonitor` from `./monitors.js`.
- Produces: `createStore(seed?) → { list, add, recordRun, provision, canEdit, canRun, menuFor, gridRows }`. A profile is `{id, name, monitorId, osKey, mode, links, discovered, failed, ranAt, provisioned}`.

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link-discovery/profileStore.test.js
import { describe, it, expect } from 'vitest'
import { createStore } from './profileStore.js'

const draft = (over = {}) => ({
  name: 'NX Core → Airtel', monitorId: 'm-nxos', osKey: 'nx-os', mode: 'single',
  links: [{ probe: 'ICMP Echo', isp: 'Airtel', iface: 'Ethernet1/48', dip: '8.8.8.8', port: '' }],
  ...over,
})

describe('profile store', () => {
  it('starts from the seed', () => {
    expect(createStore().list().length).toBeGreaterThan(0)
  })

  it('adds a profile that has never run', () => {
    const store = createStore([])
    const p = store.add(draft())
    expect(store.list()).toHaveLength(1)
    expect(p.ranAt).toBeNull()
    expect(p.provisioned).toBe(false)
    expect(p.discovered).toBe(0)
  })

  it('records a run without provisioning it', () => {
    const store = createStore([])
    const p = store.add(draft())
    store.recordRun(p.id, { discovered: 1, failed: 0, ranAt: '2026-09-03 11:04:12' })
    const after = store.list()[0]
    expect(after.discovered).toBe(1)
    expect(after.provisioned).toBe(false)
  })
})

describe('immutability after provisioning', () => {
  it('lets you edit and run a profile that has never run', () => {
    const store = createStore([])
    const p = store.add(draft())
    expect(store.canEdit(p)).toBe(true)
    expect(store.canRun(p)).toBe(true)
  })

  it('still lets you edit and run one whose run failed', () => {
    const store = createStore([])
    const p = store.add(draft())
    store.recordRun(p.id, { discovered: 0, failed: 1, ranAt: '2026-09-03 11:04:12' })
    expect(store.canEdit(store.list()[0])).toBe(true)
    expect(store.canRun(store.list()[0])).toBe(true)
  })

  it('freezes a profile once it is provisioned', () => {
    const store = createStore([])
    const p = store.add(draft())
    store.recordRun(p.id, { discovered: 1, failed: 0, ranAt: '2026-09-03 11:04:12' })
    store.provision(p.id)
    const after = store.list()[0]
    expect(after.provisioned).toBe(true)
    expect(store.canEdit(after)).toBe(false)
    expect(store.canRun(after)).toBe(false)
  })

  it('offers only View and Delete on a provisioned profile', () => {
    const store = createStore([])
    const p = store.add(draft())
    store.provision(p.id)
    expect(store.menuFor(store.list()[0])).toEqual(['View Discovered Objects', 'Delete'])
  })

  it('offers the full menu otherwise', () => {
    const store = createStore([])
    const p = store.add(draft())
    expect(store.menuFor(p)).toEqual(['Edit', 'Run', 'View Discovered Objects', 'Delete'])
  })
})

describe('grid rows', () => {
  it("puts the monitor's IP in the IP/Host column and the destination on the title", () => {
    const store = createStore([])
    store.add(draft())
    const row = store.gridRows()[0]
    expect(row.target).toBe('10.20.40.12')
    expect(row.targetTitle).toContain('8.8.8.8')
  })

  it('shows the platform label and the collector inherited from the monitor', () => {
    const store = createStore([])
    store.add(draft())
    const row = store.gridRows()[0]
    expect(row.platform).toBe('NX-OS')
    expect(row.collector).toBe('COL-DC2')
  })

  it('reads Never ran until it has run, then the timestamp', () => {
    const store = createStore([])
    const p = store.add(draft())
    expect(store.gridRows()[0].status).toBe('Never ran')
    store.recordRun(p.id, { discovered: 1, failed: 0, ranAt: '2026-09-03 11:04:12' })
    expect(store.gridRows()[0].status).toBe('Last ran at 2026-09-03 11:04:12')
  })

  it('says the run failed when nothing was discovered', () => {
    const store = createStore([])
    const p = store.add(draft())
    store.recordRun(p.id, { discovered: 0, failed: 1, ranAt: '2026-09-03 11:04:12' })
    expect(store.gridRows()[0].status).toBe('Last ran failed at 2026-09-03 11:04:12')
  })

  it('counts discovered objects, which is N in CSV mode', () => {
    const store = createStore([])
    const p = store.add(draft({ mode: 'csv', links: [{}, {}, {}] }))
    store.recordRun(p.id, { discovered: 3, failed: 0, ranAt: '2026-09-03 11:04:12' })
    expect(store.gridRows()[0].discovered).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wan-link-discovery/profileStore.test.js`
Expected: FAIL — `Failed to resolve import "./profileStore.js"`

- [ ] **Step 3: Write the implementation**

```js
// src/wan-link-discovery/profileStore.js
// Discovery profiles of type WAN Link, and the one rule that makes them different from every other
// discovery profile: once provisioned, a profile CANNOT be edited and CANNOT be re-run.
//
// The reason is physical rather than cosmetic. The profile's identity IS an IP SLA operation living
// on a router. Editing Monitor, WAN Probe or Destination IP would describe a DIFFERENT operation,
// and re-running would leave the original still executing on the device with nothing watching it.

import { PLATFORMS } from './platforms.js'
import { findMonitor } from './monitors.js'

const SEED = [
  {
    id: 'p-seed-1', name: 'NX Core → Airtel', monitorId: 'm-nxos', osKey: 'nx-os', mode: 'single',
    links: [{ probe: 'ICMP Echo', isp: 'Airtel', iface: 'Ethernet1/48', dip: '8.8.8.8', port: '' }],
    discovered: 1, failed: 0, ranAt: '2026-09-02 11:04:12', provisioned: true,
  },
  {
    id: 'p-seed-2', name: 'XR Edge → Jio', monitorId: 'm-xr', osKey: 'ios-xr', mode: 'single',
    links: [{ probe: 'UDP Echo', isp: 'Jio', iface: 'TenGigE0/0/0/0', dip: '1.1.1.1', port: '5000' }],
    discovered: 0, failed: 1, ranAt: '2026-09-01 18:22:40', provisioned: false,
  },
]

let seq = 0
const nextId = () => `p-${++seq}`

export function createStore(seed = SEED) {
  const profiles = seed.map((p) => ({ ...p }))

  const byId = (id) => profiles.find((p) => p.id === id)

  const gridRow = (p) => {
    const monitor = findMonitor(p.monitorId)
    const destinations = p.links.map((l) => l.dip).filter(Boolean)
    return {
      id: p.id,
      name: p.name,
      // The profile's TARGET is the monitor, so its IP fills the IP/Host column. The destination
      // is what the operation points AT, and rides in the title attribute.
      target: monitor?.ip ?? '',
      targetTitle: destinations.length ? `Destination ${destinations.join(', ')}` : '',
      platform: PLATFORMS[p.osKey]?.label ?? '',
      discovered: p.discovered,
      status: !p.ranAt
        ? 'Never ran'
        : `Last ran${p.discovered === 0 ? ' failed' : ''} at ${p.ranAt}`,
      collector: monitor?.collector ?? '',
      provisioned: p.provisioned,
    }
  }

  return {
    list: () => profiles.map((p) => ({ ...p })),

    add(draft) {
      const profile = {
        id: nextId(),
        discovered: 0,
        failed: 0,
        ranAt: null,
        provisioned: false,
        ...draft,
      }
      profiles.push(profile)
      return { ...profile }
    },

    recordRun(id, { discovered, failed, ranAt }) {
      const p = byId(id)
      if (!p) return
      Object.assign(p, { discovered, failed, ranAt })
    },

    provision(id) {
      const p = byId(id)
      if (p) p.provisioned = true
    },

    canEdit: (p) => !p.provisioned,
    canRun: (p) => !p.provisioned,

    menuFor: (p) =>
      p.provisioned
        ? ['View Discovered Objects', 'Delete']
        : ['Edit', 'Run', 'View Discovered Objects', 'Delete'],

    gridRows: () => profiles.map(gridRow),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wan-link-discovery/profileStore.test.js`
Expected: PASS — 12 tests

- [ ] **Step 5: Commit**

```bash
git add src/wan-link-discovery/profileStore.js src/wan-link-discovery/profileStore.test.js
git commit -m "feat(wan-link-discovery): the profile store and the immutability rule

A provisioned profile cannot be edited or re-run — its identity is an
IP SLA operation living on a router. Edit and Run stay available while
it has never run or ran and failed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: The screen shell — registry, route and the profile list

**Files:**
- Create: `src/wan-link-discovery/screen.js`
- Create: `src/wan-link-discovery/wanLinkDiscovery.css`
- Create: `src/wan-link-discovery/screen.test.js`
- Modify: `src/app/registry.js` — add one entry to the `settings` module's `screens` array

**Interfaces:**
- Consumes: `createStore` from `./profileStore.js`; `pageHeaderHTML` from `../app/pageHeader.js`.
- Produces: `meta: {pageHeader:{heading,icon}}`, `mount(root) → unmount()`. Later tasks add views to this file behind a `show(view)` switch.

- [ ] **Step 1: Look up the components before writing markup**

Run the MCP `search_components` for `table`, `toolbar`, `button`, `icon`, then `get_component` on each you use. Cross-check against `src/wan-link/screen.js:85-130`, which is the closest working example in this repo. Record anything the registry gets wrong in `docs/DS-GAPS.md`.

- [ ] **Step 2: Write the failing test**

```js
// src/wan-link-discovery/screen.test.js
import { describe, it, expect } from 'vitest'
import { modules, findScreen } from '../app/registry.js'
import { resolve, parse } from '../app/router.js'
import { meta, mount } from './screen.js'

describe('wan-link-discovery registration', () => {
  it('is registered under the settings module', () => {
    const screen = findScreen(modules, 'settings', 'wan-link-discovery')
    expect(screen).toBeDefined()
    expect(screen.label).toBe('WAN Link discovery')
  })

  it('resolves #/settings/wan-link-discovery to the screen', () => {
    const route = resolve(parse('#/settings/wan-link-discovery'), modules)
    expect(route.kind).toBe('screen')
    expect(route.screen.key).toBe('wan-link-discovery')
  })

  it('declares its page header', () => {
    expect(meta.pageHeader.heading).toBe('Settings')
  })
})

describe('discovery profile list', () => {
  it('renders the grid columns the product uses', () => {
    const root = document.createElement('div')
    mount(root)
    const titles = root.querySelector('#wld-table').columns.map((c) => c.title)
    expect(titles).toEqual([
      'DISCOVERY PROFILE NAME', 'IP/HOST/IP RANGE/CIDR/CSV', 'TYPE',
      'DISCOVERED OBJECTS', 'STATUS', 'COLLECTOR', 'ACTIONS',
    ])
  })

  it('seeds WAN Link rows carrying the monitor IP as the target', () => {
    const root = document.createElement('div')
    mount(root)
    const rows = root.querySelector('#wld-table').rows
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].target).toBe('10.20.40.12')
  })

  it('offers a WAN Link value on the Type filter', () => {
    const root = document.createElement('div')
    mount(root)
    const type = root.querySelector('#wld-filters').fields.find((f) => f.key === 'platform')
    expect(type.values).toContain('NX-OS')
  })

  it('opens the create form from the toolbar', () => {
    const root = document.createElement('div')
    mount(root)
    expect(root.querySelector('#wld-create')).toBeTruthy()
    expect(root.querySelector('#wld-create').textContent).toContain('Create Discovery Profile')
  })

  it('returns a callable unmount', () => {
    const root = document.createElement('div')
    expect(typeof mount(root)).toBe('function')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/wan-link-discovery/screen.test.js`
Expected: FAIL — `Failed to resolve import "./screen.js"`

- [ ] **Step 4: Add the registry entry**

In `src/app/registry.js`, inside the `settings` module's `screens` array, after the `lama` entry:

```js
      {
        key: 'wan-link-discovery',
        label: 'WAN Link discovery',
        description:
          'WAN Link as a category in the Discovery Profile tree: pick an already-monitored router, ' +
          'declare the link, push the IP SLA operation and provision what verified. Cisco IOS XE, ' +
          'IOS XR and NX-OS, plus Juniper RPM.',
        load: () => import('../wan-link-discovery/screen.js'),
      },
```

- [ ] **Step 5: Write the screen**

```js
// src/wan-link-discovery/screen.js
import { pageHeaderHTML } from '../app/pageHeader.js'
import { createStore } from './profileStore.js'
import './wanLinkDiscovery.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Settings', icon: 'settings' })}
  <div class="app-shell__body">
    <main class="app-shell__content" id="wld-content">
      <section id="wld-list">
        <obs-toolbar data-role="content-toolbar">
          <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
          <obs-button id="wld-create" variant="primary">Create Discovery Profile</obs-button>
        </obs-toolbar>
        <obs-filters id="wld-filters" kind="bar"></obs-filters>
        <obs-table id="wld-table" row-key="id" sort="name:asc" page-size="0" sticky-header max-height="100%"></obs-table>
      </section>
    </main>
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE
  const store = createStore()

  const table = root.querySelector('#wld-table')
  table.columns = [
    { key: 'name', title: 'DISCOVERY PROFILE NAME', sortable: true },
    // The profile's target is the MONITOR, so its IP fills this column; the destination is on hover.
    { key: 'target', title: 'IP/HOST/IP RANGE/CIDR/CSV', width: 200 },
    { key: 'platform', title: 'TYPE', width: 110 },
    { key: 'discovered', title: 'DISCOVERED OBJECTS', width: 170, align: 'center' },
    { key: 'status', title: 'STATUS', width: 230 },
    { key: 'collector', title: 'COLLECTOR', width: 130 },
    { key: 'actions', title: 'ACTIONS', width: 100, align: 'center' },
  ]

  const refresh = () => {
    table.rows = store.gridRows().map((r) => ({ ...r, actions: '' }))
    const platforms = [...new Set(table.rows.map((r) => r.platform))].sort()
    const filters = root.querySelector('#wld-filters')
    filters.fields = [
      { key: 'platform', label: 'Type', type: 'enum', values: platforms },
      { key: 'status', label: 'Status', type: 'enum', values: [...new Set(table.rows.map((r) => r.status))].sort() },
    ]
    filters.value = []
  }
  refresh()

  // Task 11 replaces this with the real view switch.
  root.querySelector('#wld-create').addEventListener('click', () => {})

  return function unmount() {
    root.replaceChildren()
  }
}
```

- [ ] **Step 6: Write the stylesheet**

```css
/* src/wan-link-discovery/wanLinkDiscovery.css
   Token-only. Resolve every value through the MCP `resolve_token` before adding it; there is not
   one hex/rgb/hsl in this app's CSS and this file must not be the first. */

#wld-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

#wld-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/wan-link-discovery/ src/app/registry.test.js`
Expected: PASS — the 8 new screen tests plus the existing registry suite

- [ ] **Step 8: Run the whole suite**

Run: `npm test`
Expected: PASS — 458 existing + the new tests, 0 failures

- [ ] **Step 9: Commit**

```bash
git add src/wan-link-discovery/ src/app/registry.js
git commit -m "feat(wan-link-discovery): screen shell, route and the profile list

WAN Link discovery is registered under Settings at
#/settings/wan-link-discovery. The grid puts the monitor's IP in the
IP/Host column, since the monitor is what the profile targets.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: The Create form — Single mode

**Files:**
- Create: `src/wan-link-discovery/createForm.js`
- Test: `src/wan-link-discovery/createForm.test.js`

**Interfaces:**
- Consumes: `PLATFORMS`, `osOptions`, `probeOptions`, `needsPort`, `slaTitle` from `./platforms.js`; `findMonitor`, `monitorOptions`, `credentialOptions`, `interfaceOptions`, `prefillCredential` from `./monitors.js`. Import exactly these — no more.
- Produces: `renderCreateForm({monitorId, locked, onCancel, onRun}) → HTMLElement`. `onRun` receives `{name, monitor, osKey, mode, links}` where `links` is `[{probe, isp, iface, srcLocation, dip, dstLocation, port}]`. Validation failures never call `onRun`.

- [ ] **Step 1: Look up the components**

`get_component` for `obs-select` and `obs-input`. Confirm from `elements-api.json` that `obs-select` has no `label` attribute and that `.options` is set as a JS array. Confirm the `change` event's `detail` shape by rendering, not by reading — Task 12 covers this.

- [ ] **Step 2: Write the failing test**

```js
// src/wan-link-discovery/createForm.test.js
import { describe, it, expect, vi } from 'vitest'
import { renderCreateForm } from './createForm.js'

const change = (el, value) => {
  el.setAttribute('value', value)
  el.value = value
  el.dispatchEvent(new CustomEvent('change', { detail: [value] }))
}
const form = (over = {}) =>
  renderCreateForm({ monitorId: null, locked: false, onCancel: () => {}, onRun: () => {}, ...over })

describe('create form — before a monitor is chosen', () => {
  it('gates the link and operations blocks', () => {
    const el = form()
    expect(el.querySelector('#wld-gated').hidden).toBe(true)
    expect(el.querySelector('#wld-gate-msg').hidden).toBe(false)
  })

  it('offers every monitored device', () => {
    const el = form()
    expect(el.querySelector('#wld-monitor').options).toHaveLength(4)
  })
})

describe('create form — the monitor drives everything', () => {
  it('auto-fills Vendor and disables it', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    const vendor = el.querySelector('#wld-vendor')
    expect(vendor.getAttribute('value')).toBe('Cisco Systems')
    expect(vendor.hasAttribute('disabled')).toBe(true)
  })

  it('auto-fills Device OS and leaves it editable', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    const os = el.querySelector('#wld-os')
    expect(os.getAttribute('value')).toBe('nx-os')
    expect(os.hasAttribute('disabled')).toBe(false)
    expect(os.options.map((o) => o.value)).toEqual(['ios-xe', 'ios-xr', 'nx-os'])
  })

  it('shows no method field at all', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    expect(el.querySelector('#wld-method')).toBeNull()
    expect(el.textContent).not.toContain('Monitors WAN link performance by collecting key metrics')
  })

  it('prefills the credential when the protocol matches', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    expect(el.querySelector('#wld-cred').getAttribute('value')).toBe('NXOS-SSH-Ops')
  })

  it('offers the monitor its own interfaces', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    expect(el.querySelector('#wld-iface').options.map((o) => o.value)).toContain('Ethernet1/48')
  })

  it('offers only that platform probes', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-juniper')
    expect(el.querySelector('#wld-probe').options.map((o) => o.value)).toEqual(['ICMP Ping'])
  })

  it('names the operations block after the vendor', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    expect(el.querySelector('#wld-sla-title').textContent).toBe('IP SLA Operations Test Parameters')
    change(el.querySelector('#wld-monitor'), 'm-juniper')
    expect(el.querySelector('#wld-sla-title').textContent).toBe('Juniper RPM Operations Test Parameters')
  })
})

describe('create form — reactive rules', () => {
  it('shows UDP Port only for the UDP probes', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    expect(el.querySelector('#wld-port-field').hidden).toBe(true)
    change(el.querySelector('#wld-probe'), 'UDP Jitter')
    expect(el.querySelector('#wld-port-field').hidden).toBe(false)
    change(el.querySelector('#wld-probe'), 'ICMP Echo')
    expect(el.querySelector('#wld-port-field').hidden).toBe(true)
  })

  it('clears a probe the new Device OS does not have, and says so', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    change(el.querySelector('#wld-probe'), 'UDP Jitter')
    change(el.querySelector('#wld-os'), 'ios-xe')
    expect(el.querySelector('#wld-probe').getAttribute('value')).toBe('')
    expect(el.querySelector('#wld-os-warning').hidden).toBe(false)
  })

  it('keeps a probe the new Device OS still has', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    change(el.querySelector('#wld-probe'), 'ICMP Echo')
    change(el.querySelector('#wld-os'), 'ios-xr')
    expect(el.querySelector('#wld-probe').getAttribute('value')).toBe('ICMP Echo')
    expect(el.querySelector('#wld-os-warning').hidden).toBe(true)
  })

  it('resets the source interface when the monitor changes', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    change(el.querySelector('#wld-iface'), 'Ethernet1/48')
    change(el.querySelector('#wld-monitor'), 'm-xr')
    expect(el.querySelector('#wld-iface').getAttribute('value')).toBe('')
  })
})

describe('create form — locked entry from a device', () => {
  it('pre-selects the monitor and disables the field', () => {
    const el = form({ monitorId: 'm-nxos', locked: true })
    const monitor = el.querySelector('#wld-monitor')
    expect(monitor.getAttribute('value')).toBe('m-nxos')
    expect(monitor.hasAttribute('disabled')).toBe(true)
    expect(el.querySelector('#wld-gated').hidden).toBe(false)
  })
})

describe('create form — validation', () => {
  const fill = (el) => {
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    el.querySelector('#wld-name').value = 'NX Core → Airtel'
    change(el.querySelector('#wld-probe'), 'ICMP Echo')
    change(el.querySelector('#wld-iface'), 'Ethernet1/48')
    el.querySelector('#wld-isp').value = 'Airtel'
    el.querySelector('#wld-dip').value = '8.8.8.8'
  }

  it('names every missing field and does not run', () => {
    const onRun = vi.fn()
    const el = form({ onRun })
    el.querySelector('#wld-run').click()
    expect(onRun).not.toHaveBeenCalled()
    const err = el.querySelector('#wld-error').textContent
    expect(err).toContain('Profile Name')
    expect(err).toContain('Monitor')
  })

  it('requires UDP Port for a UDP probe and not otherwise', () => {
    const onRun = vi.fn()
    const el = form({ onRun })
    fill(el)
    change(el.querySelector('#wld-probe'), 'UDP Echo')
    el.querySelector('#wld-port').value = ''
    el.querySelector('#wld-run').click()
    expect(onRun).not.toHaveBeenCalled()
    expect(el.querySelector('#wld-error').textContent).toContain('UDP Port')
  })

  it('runs with one link once the form is complete', () => {
    const onRun = vi.fn()
    const el = form({ onRun })
    fill(el)
    el.querySelector('#wld-run').click()
    expect(onRun).toHaveBeenCalledOnce()
    const payload = onRun.mock.calls[0][0]
    expect(payload.name).toBe('NX Core → Airtel')
    expect(payload.monitor.id).toBe('m-nxos')
    expect(payload.osKey).toBe('nx-os')
    expect(payload.mode).toBe('single')
    expect(payload.links).toHaveLength(1)
    expect(payload.links[0]).toMatchObject({ probe: 'ICMP Echo', isp: 'Airtel', dip: '8.8.8.8' })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/wan-link-discovery/createForm.test.js`
Expected: FAIL — `Failed to resolve import "./createForm.js"`

- [ ] **Step 4: Write the implementation**

```js
// src/wan-link-discovery/createForm.js
// Create Discovery Profile -> WAN Link.
//
// Every other category on this page starts from an IP/Host you TYPE. WAN Link starts from a monitor
// you PICK, and because that device is already monitored we know its vendor, OS, collector,
// interfaces and credential before the form asks anything. Vendor, Device OS, Credential Profiles,
// Source Interface, the probe list and even the Operations section title all resolve from it.
//
// There is no method field. Every Device OS has exactly one method, so asking would be a question
// with one possible answer — the product's own Juniper drawer already omits the SNMP/SSH cards.

import { PLATFORMS, osOptions, probeOptions, needsPort, slaTitle } from './platforms.js'
import {
  findMonitor, monitorOptions, credentialOptions, interfaceOptions, prefillCredential,
} from './monitors.js'

/** DS change events carry an array: detail is ['nx-os'], not 'nx-os'. */
const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

/** obs-select has no `label` attribute — obs-input does, obs-select does not. */
const selectField = (id, label, { required = false, hint = '' } = {}) => `
  <div class="wld-field" id="${id}-field">
    <label class="wld-field__label" for="${id}">
      ${label}${required ? '<span class="wld-field__req">*</span>' : ''}
      ${hint ? `<span class="wld-field__hint">${hint}</span>` : ''}
    </label>
    <obs-select id="${id}" block value=""></obs-select>
  </div>
`

const inputField = (id, label, { required = false, hint = '', value = '' } = {}) => `
  <div class="wld-field" id="${id}-field">
    <label class="wld-field__label" for="${id}">
      ${label}${required ? '<span class="wld-field__req">*</span>' : ''}
      ${hint ? `<span class="wld-field__hint">${hint}</span>` : ''}
    </label>
    <obs-input id="${id}" block placeholder="Enter" value="${value}"></obs-input>
  </div>
`

export function renderCreateForm({ monitorId = null, locked = false, onCancel, onRun }) {
  const el = document.createElement('section')
  el.className = 'wld-form'
  el.innerHTML = `
    <div class="wld-form__row">
      ${inputField('wld-name', 'Discovery Profile Name', { required: true })}
      <div></div>
      <div class="wld-form__mode" id="wld-mode"></div>
    </div>

    <div class="wld-form__row">
      ${selectField('wld-monitor', 'Monitor', { required: true, hint: '<span id="wld-monitor-hint"></span>' })}
      ${selectField('wld-vendor', 'Vendor', { hint: '· from monitor' })}
      ${selectField('wld-os', 'Device OS', { required: true, hint: '· editable' })}
    </div>
    <p class="wld-form__warning" id="wld-os-warning" hidden>
      Probe cleared — it is not available on this Device OS.
    </p>

    <div class="wld-form__row">
      ${selectField('wld-cred', 'Credential Profiles', { required: true, hint: '<span id="wld-cred-hint"></span>' })}
      <div class="wld-field wld-field--action">
        <obs-button variant="neutral-lightest">Create Credential Profile</obs-button>
      </div>
      <div></div>
    </div>

    <p class="wld-form__gate" id="wld-gate-msg">
      Select a <b>Monitor</b> to configure the link — the available probes depend on its Device OS.
    </p>

    <div id="wld-gated" hidden>
      <h4 class="wld-form__legend">Discovery Parameters of WAN Link</h4>
      <div id="wld-link-fields">
        <div class="wld-form__row">
          ${selectField('wld-probe', 'WAN Probe', { required: true })}
          ${inputField('wld-isp', 'Internet Service Provider', { required: true })}
          <div></div>
        </div>
        <div class="wld-form__row">
          ${selectField('wld-iface', 'Source Interface', { hint: '· from the monitor' })}
          ${inputField('wld-src-loc', 'Source Router Location')}
          <div></div>
        </div>
        <div class="wld-form__row">
          ${inputField('wld-dip', 'Destination IP', { required: true })}
          ${inputField('wld-dst-loc', 'Destination Router Location')}
          <div></div>
        </div>
      </div>

      <div class="wld-form__row">
        ${inputField('wld-timeout', 'Timeout')}
        ${inputField('wld-port', 'UDP Port', { required: true, value: '5000' })}
        <div></div>
      </div>

      <h4 class="wld-form__legend" id="wld-sla-title">IP SLA Operations Test Parameters</h4>
      <div class="wld-form__row">
        ${inputField('wld-payload', 'Payload')}
        ${inputField('wld-tos', 'Type of service')}
        <div></div>
      </div>
      <div class="wld-form__row">
        ${inputField('wld-freq', 'Frequency', { required: true, value: '60' })}
        ${inputField('wld-optimeout', 'Operation Timeout', { required: true, value: '5000' })}
        <div></div>
      </div>

      <h4 class="wld-form__legend">Notifications</h4>
      <div class="wld-form__row">
        ${inputField('wld-notify', 'Notify')}
      </div>
    </div>

    <footer class="wld-form__footer">
      <obs-button id="wld-exit" variant="neutral-lightest">Save and Exit</obs-button>
      <span class="wld-form__mandatory"><span class="wld-field__req">*</span> fields are mandatory</span>
      <span class="wld-form__spacer"></span>
      <span class="wld-form__error" id="wld-error" hidden></span>
      <obs-button id="wld-reset" variant="neutral-lightest">Reset</obs-button>
      <obs-button id="wld-run" variant="primary">Save and Run</obs-button>
    </footer>
  `

  const $ = (id) => el.querySelector(`#${id}`)
  const setOptions = (id, options, value = '') => {
    const select = $(id)
    select.options = options
    select.setAttribute('value', value)
    select.value = value
    return select
  }
  const text = (id) => ($(id).value ?? $(id).getAttribute('value') ?? '').toString().trim()

  setOptions('wld-monitor', monitorOptions(), monitorId ?? '')
  if (locked && monitorId) {
    $('wld-monitor').setAttribute('disabled', '')
    $('wld-monitor-hint').textContent = '· locked — opened from this device'
  }

  const monitor = () => findMonitor($('wld-monitor').getAttribute('value'))

  function syncPort() {
    // UDP Port is the ONLY conditional field on the form, and it sits beside Timeout.
    $('wld-port-field').hidden = !needsPort($('wld-probe').getAttribute('value'))
  }

  function syncOs({ fromMonitor = false } = {}) {
    const m = monitor()
    if (!m) return
    const osKey = $('wld-os').getAttribute('value')
    const platform = PLATFORMS[osKey]

    const previousCred = $('wld-cred').getAttribute('value')
    const creds = credentialOptions(platform.method)
    const prefill = prefillCredential(m, platform.method)
    const keptCred = creds.some((c) => c.value === previousCred) ? previousCred : ''
    setOptions('wld-cred', creds, prefill || keptCred)
    $('wld-cred-hint').textContent = prefill
      ? `· ${platform.method} — prefilled from the monitor`
      : `· ${platform.method} — the monitor has no matching credential`

    const previousProbe = $('wld-probe').getAttribute('value')
    const probes = probeOptions(osKey)
    const kept = probes.some((p) => p.value === previousProbe)
    setOptions('wld-probe', probes, kept ? previousProbe : '')
    // Clear rather than silently swap, and say why.
    $('wld-os-warning').hidden = fromMonitor || !previousProbe || kept

    $('wld-sla-title').textContent = slaTitle(platform.vendor)
    syncPort()
  }

  function syncMonitor() {
    const m = monitor()
    $('wld-gated').hidden = !m
    $('wld-gate-msg').hidden = !!m
    if (!m) return

    setOptions('wld-vendor', [{ value: m.vendor, text: m.vendor }], m.vendor)
    $('wld-vendor').setAttribute('disabled', '')

    setOptions('wld-os', osOptions(m.vendor), m.os)
    $('wld-os').removeAttribute('disabled')

    setOptions('wld-iface', interfaceOptions(m), '')
    syncOs({ fromMonitor: true })
  }

  $('wld-monitor').addEventListener('change', (e) => {
    $('wld-monitor').setAttribute('value', detailValue(e) ?? '')
    syncMonitor()
  })
  $('wld-os').addEventListener('change', (e) => {
    $('wld-os').setAttribute('value', detailValue(e) ?? '')
    syncOs()
  })
  $('wld-probe').addEventListener('change', (e) => {
    $('wld-probe').setAttribute('value', detailValue(e) ?? '')
    syncPort()
  })
  $('wld-iface').addEventListener('change', (e) => {
    $('wld-iface').setAttribute('value', detailValue(e) ?? '')
  })

  $('wld-exit').addEventListener('click', () => onCancel())
  $('wld-reset').addEventListener('click', () => {
    setOptions('wld-monitor', monitorOptions(), '')
    $('wld-name').value = ''
    syncMonitor()
  })

  $('wld-run').addEventListener('click', () => {
    const missing = []
    if (!text('wld-name')) missing.push('Profile Name')
    if (!monitor()) missing.push('Monitor')
    if (!$('wld-cred').getAttribute('value')) missing.push('Credential Profile')
    const probe = $('wld-probe').getAttribute('value')
    if (!probe) missing.push('WAN Probe')
    if (!text('wld-isp')) missing.push('ISP')
    if (!text('wld-dip')) missing.push('Destination IP')
    if (needsPort(probe) && !text('wld-port')) missing.push('UDP Port')

    if (missing.length) {
      $('wld-error').textContent = `Required: ${missing.join(' · ')}`
      $('wld-error').hidden = false
      return
    }
    $('wld-error').hidden = true

    onRun({
      name: text('wld-name'),
      monitor: monitor(),
      osKey: $('wld-os').getAttribute('value'),
      mode: 'single',
      links: [{
        probe,
        isp: text('wld-isp'),
        iface: $('wld-iface').getAttribute('value') || '',
        srcLocation: text('wld-src-loc'),
        dip: text('wld-dip'),
        dstLocation: text('wld-dst-loc'),
        port: needsPort(probe) ? text('wld-port') : '',
      }],
    })
  })

  syncMonitor()
  return el
}
```

- [ ] **Step 5: Add the form styles**

Append to `src/wan-link-discovery/wanLinkDiscovery.css`. Resolve each token through the MCP `resolve_token` before using it; do not invent token names.

```css
.wld-form__row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-md) var(--spacing-lg);
  align-items: end;
  margin-block-end: var(--spacing-md);
}

.wld-field__label {
  display: block;
  margin-block-end: var(--spacing-xs);
}

.wld-field--action {
  align-self: end;
}

.wld-form__footer {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-block-start: var(--spacing-md);
}

.wld-form__spacer {
  flex: 1;
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/wan-link-discovery/createForm.test.js`
Expected: PASS — 17 tests

- [ ] **Step 7: Commit**

```bash
git add src/wan-link-discovery/createForm.js src/wan-link-discovery/createForm.test.js src/wan-link-discovery/wanLinkDiscovery.css
git commit -m "feat(wan-link-discovery): the create form, single mode

Picking a monitor resolves Vendor, Device OS, credential, interfaces,
the probe list and the Operations title. No method field: every Device
OS has exactly one method. UDP Port is the only conditional field.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: The Create form — CSV mode

**Files:**
- Modify: `src/wan-link-discovery/createForm.js`
- Modify: `src/wan-link-discovery/createForm.test.js`

**Interfaces:**
- Consumes: `CSV_COLUMNS`, `sampleCsv`, `parseCsv` from `./csv.js`.
- Produces: unchanged `renderCreateForm` signature. `onRun` payload gains `mode: 'csv'` with one entry in `links` per parsed row.

- [ ] **Step 1: Write the failing test**

Append to `src/wan-link-discovery/createForm.test.js`:

```js
describe('create form — csv mode', () => {
  const change = (el, value) => {
    el.setAttribute('value', value)
    el.value = value
    el.dispatchEvent(new CustomEvent('change', { detail: [value] }))
  }
  const form = (over = {}) =>
    renderCreateForm({ monitorId: null, locked: false, onCancel: () => {}, onRun: () => {}, ...over })

  const csvForm = (over = {}) => {
    const el = form(over)
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    el.querySelector('#wld-name').value = 'NX Core bulk'
    el.querySelector('#wld-mode-csv').click()
    return el
  }

  it('offers Single and CSV, Single first and selected', () => {
    const el = form()
    expect(el.querySelector('#wld-mode-single').textContent).toContain('Single')
    expect(el.querySelector('#wld-mode-csv').textContent).toContain('CSV')
    expect(el.querySelector('#wld-mode-single').hasAttribute('data-selected')).toBe(true)
  })

  it('swaps the per-link fields for the upload, keeping Timeout', () => {
    const el = csvForm()
    expect(el.querySelector('#wld-link-fields').hidden).toBe(true)
    expect(el.querySelector('#wld-csv-block').hidden).toBe(false)
    expect(el.querySelector('#wld-timeout-field').hidden).toBe(false)
  })

  it('never shows UDP Port in csv mode — it is a column there', () => {
    const el = csvForm()
    change(el.querySelector('#wld-probe'), 'UDP Jitter')
    expect(el.querySelector('#wld-port-field').hidden).toBe(true)
  })

  it('keeps the operations block, which applies to every row', () => {
    const el = csvForm()
    expect(el.querySelector('#wld-sla-title').hidden).toBe(false)
    expect(el.querySelector('#wld-freq-field').hidden).toBe(false)
  })

  it('requires a file', () => {
    const onRun = vi.fn()
    const el = csvForm({ onRun })
    el.querySelector('#wld-run').click()
    expect(onRun).not.toHaveBeenCalled()
    expect(el.querySelector('#wld-error').textContent).toContain('CSV')
  })

  it('runs one link per parsed row', () => {
    const onRun = vi.fn()
    const el = csvForm({ onRun })
    el.querySelector('#wld-csv-upload').click()
    el.querySelector('#wld-run').click()
    expect(onRun).toHaveBeenCalledOnce()
    const payload = onRun.mock.calls[0][0]
    expect(payload.mode).toBe('csv')
    expect(payload.links).toHaveLength(3)
    expect(payload.links.map((l) => l.isp)).toEqual(['Airtel', 'Jio', 'Tata'])
  })

  it('reports parse errors instead of running', () => {
    const onRun = vi.fn()
    const el = csvForm({ onRun })
    el.loadCsvText('wan_probe,isp\nICMP Echo,Airtel')
    el.querySelector('#wld-run').click()
    expect(onRun).not.toHaveBeenCalled()
    expect(el.querySelector('#wld-error').textContent).toContain('header')
  })

  it('returns to single mode with the link fields back', () => {
    const el = csvForm()
    el.querySelector('#wld-mode-single').click()
    expect(el.querySelector('#wld-link-fields').hidden).toBe(false)
    expect(el.querySelector('#wld-csv-block').hidden).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wan-link-discovery/createForm.test.js -t "csv mode"`
Expected: FAIL — `Cannot read properties of null (reading 'textContent')` on `#wld-mode-single`

- [ ] **Step 3: Add the mode control and CSV block to the markup**

In `createForm.js`, replace the `<div class="wld-form__mode" id="wld-mode"></div>` placeholder with:

```html
        <div class="wld-form__mode">
          <obs-button id="wld-mode-single" variant="neutral-lightest" data-selected>Single</obs-button>
          <obs-button id="wld-mode-csv" variant="neutral-lightest">CSV</obs-button>
        </div>
```

And insert this block immediately after the closing `</div>` of `#wld-link-fields`:

```html
      <div id="wld-csv-block" hidden>
        <div class="wld-form__row">
          <div class="wld-field">
            <label class="wld-field__label" for="wld-csv-name">
              CSV<span class="wld-field__req">*</span>
            </label>
            <div class="wld-form__upload">
              <obs-input id="wld-csv-name" block readonly placeholder="Select File"></obs-input>
              <obs-button id="wld-csv-upload" variant="primary">Upload CSV</obs-button>
            </div>
            <button type="button" class="wld-form__sample" id="wld-csv-sample">Sample CSV</button>
          </div>
          <div></div><div></div>
        </div>
        <p class="wld-form__gate" id="wld-csv-columns"></p>
      </div>
```

- [ ] **Step 4: Add the mode logic**

Add the import at the top of `createForm.js`:

```js
import { CSV_COLUMNS, sampleCsv, parseCsv } from './csv.js'
```

Declare `mode` and `csv` **immediately after `const monitor = …`** — NOT after `syncPort`. `syncPort` reads `mode`, and `syncMonitor()` runs at the bottom of the factory, so a lower declaration throws a TDZ ReferenceError at render time that no static read will show you. Add the rest of this block after `syncPort` is defined, and call `setMode('single')` from `syncMonitor`'s tail:

```js
  let mode = 'single'
  let csv = null

  function setMode(next) {
    mode = next
    csv = next === 'single' ? null : csv
    $('wld-mode-single').toggleAttribute('data-selected', next === 'single')
    $('wld-mode-csv').toggleAttribute('data-selected', next === 'csv')
    $('wld-link-fields').hidden = next !== 'single'
    $('wld-csv-block').hidden = next !== 'csv'
    $('wld-error').hidden = true
    // In csv mode the port is a column in the file, never a field on the page.
    syncPort()
  }

  /** Exposed so a test can supply file text without a real file input. */
  el.loadCsvText = (text) => {
    const { rows, errors } = parseCsv(text)
    if (errors.length) {
      csv = null
      $('wld-csv-name').setAttribute('value', '')
      $('wld-error').textContent = errors.join('  ')
      $('wld-error').hidden = false
      return
    }
    csv = rows
    $('wld-csv-name').setAttribute('value', `wan-links.csv  ·  ${rows.length} rows parsed`)
    $('wld-error').hidden = true
  }

  $('wld-mode-single').addEventListener('click', () => setMode('single'))
  $('wld-mode-csv').addEventListener('click', () => setMode('csv'))
  $('wld-csv-upload').addEventListener('click', () => {
    const m = monitor()
    if (m) el.loadCsvText(sampleCsv(m, $('wld-os').getAttribute('value')))
  })
  $('wld-csv-sample').addEventListener('click', () => {
    const m = monitor()
    if (m) el.loadCsvText(sampleCsv(m, $('wld-os').getAttribute('value')))
  })

  $('wld-csv-columns').textContent =
    `One row per link. Columns: ${CSV_COLUMNS.join(' · ')} — exactly what the Single form asks ` +
    'per link. Credential Profile, Timeout and the Operations Test Parameters below apply to every row.'
```

Change `syncPort` so CSV mode always hides the field:

```js
  function syncPort() {
    $('wld-port-field').hidden = mode !== 'single' || !needsPort($('wld-probe').getAttribute('value'))
  }
```

- [ ] **Step 5: Branch the validation and payload**

Inside the `#wld-run` click handler, replace the per-link validation and the `onRun` call with:

```js
    const probe = $('wld-probe').getAttribute('value')
    if (mode === 'csv') {
      if (!csv) missing.push('CSV')
    } else {
      if (!probe) missing.push('WAN Probe')
      if (!text('wld-isp')) missing.push('ISP')
      if (!text('wld-dip')) missing.push('Destination IP')
      if (needsPort(probe) && !text('wld-port')) missing.push('UDP Port')
    }

    if (missing.length) {
      $('wld-error').textContent = `Required: ${missing.join(' · ')}`
      $('wld-error').hidden = false
      return
    }
    $('wld-error').hidden = true

    const links = mode === 'csv' ? csv : [{
      probe,
      isp: text('wld-isp'),
      iface: $('wld-iface').getAttribute('value') || '',
      srcLocation: text('wld-src-loc'),
      dip: text('wld-dip'),
      dstLocation: text('wld-dst-loc'),
      port: needsPort(probe) ? text('wld-port') : '',
    }]

    onRun({
      name: text('wld-name'),
      monitor: monitor(),
      osKey: $('wld-os').getAttribute('value'),
      mode,
      links,
    })
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/wan-link-discovery/createForm.test.js`
Expected: PASS — 25 tests

- [ ] **Step 7: Commit**

```bash
git add src/wan-link-discovery/createForm.js src/wan-link-discovery/createForm.test.js
git commit -m "feat(wan-link-discovery): csv mode on the create form

Single | CSV replaces the tab strip. CSV swaps only the per-link fields
for an upload; Monitor, Credential Profile, Timeout and the Operations
block stay and apply to every row.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: The progress panel

**Files:**
- Create: `src/wan-link-discovery/progressPanel.js`
- Test: `src/wan-link-discovery/progressPanel.test.js`

**Interfaces:**
- Consumes: `planRun` from `./runner.js`.
- Produces: `renderProgressPanel({profileName, monitor, osKey, links, outcome, autoplay, onDone, onCancel}) → HTMLElement`. The element exposes `advanceAll()` for deterministic tests and `results` — `[{link, ok}]` — once finished. `onDone(results)` fires when every card settles.

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link-discovery/progressPanel.test.js
import { describe, it, expect, vi } from 'vitest'
import { renderProgressPanel } from './progressPanel.js'
import { findMonitor } from './monitors.js'

const LINKS = [
  { probe: 'ICMP Echo', isp: 'Airtel', iface: 'Ethernet1/1', dip: '8.8.8.8', port: '' },
  { probe: 'UDP Echo', isp: 'Jio', iface: 'Ethernet1/2', dip: '1.1.1.1', port: '5000' },
  { probe: 'UDP Jitter', isp: 'Tata', iface: 'Ethernet1/48', dip: '9.9.9.9', port: '5001' },
]

const panel = (over = {}) =>
  renderProgressPanel({
    profileName: 'NX Core bulk', monitor: findMonitor('m-nxos'), osKey: 'nx-os',
    links: LINKS, outcome: 'ok', autoplay: false, onDone: () => {}, onCancel: () => {}, ...over,
  })

describe('progress panel', () => {
  it('titles itself with the profile name', () => {
    expect(panel().querySelector('#wld-prog-title').textContent).toBe('NX Core bulk')
  })

  it('counts every link as a total object', () => {
    expect(panel().querySelector('#wld-prog-total').textContent).toBe('3')
  })

  it('renders one card per link, headed by ISP and destination', () => {
    const cards = panel().querySelectorAll('.wld-card')
    expect(cards).toHaveLength(3)
    expect(cards[0].querySelector('.wld-card__head').textContent).toContain('Airtel')
    expect(cards[0].querySelector('.wld-card__head').textContent).toContain('8.8.8.8')
  })

  it('narrates four stages per card, not one', () => {
    expect(panel().querySelectorAll('.wld-card')[0].querySelectorAll('li')).toHaveLength(4)
  })

  it('names the transport in the first stage', () => {
    const first = panel().querySelector('.wld-card li')
    expect(first.textContent).toContain('over SSH')
  })
})

describe('progress panel — outcomes', () => {
  it('discovers every link on success', () => {
    const el = panel()
    el.advanceAll()
    expect(el.querySelector('#wld-prog-ok').textContent).toBe('3')
    expect(el.querySelector('#wld-prog-failed').textContent).toBe('0')
    expect(el.querySelector('#wld-prog-next').hasAttribute('disabled')).toBe(false)
  })

  it('fails exactly one link of a bulk run, so results stay mixed', () => {
    const el = panel({ outcome: 'unreachable' })
    el.advanceAll()
    expect(el.querySelector('#wld-prog-ok').textContent).toBe('2')
    expect(el.querySelector('#wld-prog-failed').textContent).toBe('1')
  })

  it('fails the only link of a single run', () => {
    const el = panel({ links: [LINKS[0]], outcome: 'operation' })
    el.advanceAll()
    expect(el.querySelector('#wld-prog-ok').textContent).toBe('0')
    expect(el.querySelector('#wld-prog-failed').textContent).toBe('1')
  })

  it('leaves nothing to provision when every link failed', () => {
    const el = panel({ links: [LINKS[0]], outcome: 'operation' })
    el.advanceAll()
    expect(el.querySelector('#wld-prog-next').hasAttribute('disabled')).toBe(true)
    expect(el.querySelector('#wld-prog-failnote').hidden).toBe(false)
  })

  it('distinguishes a configuration failure from a dead path', () => {
    const op = panel({ links: [LINKS[0]], outcome: 'operation' })
    op.advanceAll()
    const un = panel({ links: [LINKS[0]], outcome: 'unreachable' })
    un.advanceAll()
    const line = (el) => el.querySelector('.wld-card li.is-failed').textContent
    expect(line(op)).toContain('Operation id already in use')
    expect(line(un)).toContain('unreachable')
  })

  it('hands the caller which links verified', () => {
    const onDone = vi.fn()
    const el = panel({ outcome: 'unreachable', onDone })
    el.advanceAll()
    expect(onDone).toHaveBeenCalledOnce()
    const results = onDone.mock.calls[0][0]
    expect(results.filter((r) => r.ok).map((r) => r.link.isp)).toEqual(['Airtel', 'Tata'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wan-link-discovery/progressPanel.test.js`
Expected: FAIL — `Failed to resolve import "./progressPanel.js"`

- [ ] **Step 3: Write the implementation**

```js
// src/wan-link-discovery/progressPanel.js
// The run view. Same furniture as device discovery — title, progress bar, Total/Discovered/Failed
// tiles, Abort — but the card narrates FOUR stages rather than one line, because a WAN link push
// fails differently at each one.

import { planRun } from './runner.js'

const STEP_MS = 850
const STAGGER_MS = 500

export function renderProgressPanel({
  profileName, monitor, osKey, links, outcome = 'ok',
  autoplay = true, onDone = () => {}, onCancel = () => {},
}) {
  const el = document.createElement('section')
  el.className = 'wld-progress'
  el.innerHTML = `
    <header class="wld-progress__head">
      <h2 id="wld-prog-title"></h2>
      <span class="wld-form__spacer"></span>
      <div class="wld-progress__bar">
        <span>Discovery Progress</span>
        <obs-progress id="wld-prog-bar" value="0"></obs-progress>
        <span id="wld-prog-pct">0%</span>
      </div>
    </header>
    <div class="wld-progress__tiles">
      <div class="wld-tile is-selected"><span>Total Objects</span><b id="wld-prog-total">0</b></div>
      <div class="wld-tile"><span>Discovered Objects</span><b id="wld-prog-ok">0</b></div>
      <div class="wld-tile"><span>Failed Objects</span><b id="wld-prog-failed">0</b></div>
      <span class="wld-form__spacer"></span>
      <obs-button id="wld-prog-abort" variant="neutral-lightest">Abort</obs-button>
    </div>
    <div class="wld-progress__cards" id="wld-prog-cards"></div>
    <footer class="wld-form__footer">
      <span class="wld-progress__failnote" id="wld-prog-failnote" hidden>
        Nothing was created — there is nothing to provision. The profile never provisioned, so it
        stays editable and re-runnable from the list.
      </span>
      <span class="wld-form__spacer"></span>
      <obs-button id="wld-prog-next" variant="primary" disabled>View Discovered Objects</obs-button>
    </footer>
  `

  const $ = (id) => el.querySelector(`#${id}`)
  $('wld-prog-title').textContent = profileName
  $('wld-prog-total').textContent = String(links.length)

  const cards = $('wld-prog-cards')
  const results = []
  let ok = 0
  let failed = 0
  let settled = 0

  const runners = links.map((link, index) => {
    // Single: the only link fails. Bulk: one row fails, so mixed results stay visible.
    const failing = outcome !== 'ok' && (links.length === 1 || index === 1)
    const plan = planRun({ monitor, osKey, outcome: failing ? outcome : 'ok', index })

    const card = document.createElement('article')
    card.className = 'wld-card'
    card.innerHTML = `
      <div class="wld-card__head">${link.isp} → ${link.dip}</div>
      <ol class="wld-card__steps">
        ${plan.stages.map((s) => `<li><span class="wld-card__mark">○</span><span>${s}</span></li>`).join('')}
      </ol>
    `
    cards.appendChild(card)
    const items = [...card.querySelectorAll('li')]

    let step = 0
    const settle = (isOk) => {
      results[index] = { link, ok: isOk }
      if (isOk) ok += 1
      else failed += 1
      settled += 1
      $('wld-prog-ok').textContent = String(ok)
      $('wld-prog-failed').textContent = String(failed)
      const pct = Math.round((settled / links.length) * 100)
      $('wld-prog-bar').setAttribute('value', String(pct))
      $('wld-prog-pct').textContent = `${pct}%`
      if (settled !== links.length) return
      $('wld-prog-abort').hidden = true
      if (ok > 0) $('wld-prog-next').removeAttribute('disabled')
      $('wld-prog-failnote').hidden = ok > 0
      onDone(results)
    }

    return function advance() {
      if (step >= plan.stages.length) return false
      const item = items[step]
      if (step === plan.failIndex) {
        item.className = 'is-failed'
        item.innerHTML = `<span class="wld-card__mark">✕</span><span>${plan.failText}</span>`
        step = plan.stages.length
        settle(false)
        return false
      }
      item.className = 'is-done'
      const label = step === plan.stages.length - 1 ? plan.successText : plan.stages[step]
      item.innerHTML = `<span class="wld-card__mark">✓</span><span>${label}</span>`
      step += 1
      if (step === plan.stages.length) {
        settle(true)
        return false
      }
      return true
    }
  })

  /** Deterministic driver — tests use this instead of timers. */
  el.advanceAll = () => {
    let moving = true
    while (moving) moving = runners.map((run) => run()).some(Boolean)
  }
  el.results = results

  const timers = []
  if (autoplay) {
    runners.forEach((run, index) => {
      const tick = () => {
        if (run()) timers.push(setTimeout(tick, STEP_MS))
      }
      timers.push(setTimeout(tick, 400 + index * STAGGER_MS))
    })
  }

  el.stop = () => timers.forEach(clearTimeout)
  $('wld-prog-abort').addEventListener('click', () => { el.stop(); onCancel() })
  $('wld-prog-next').addEventListener('click', () => el.dispatchEvent(new CustomEvent('provision')))

  return el
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/wan-link-discovery/progressPanel.test.js`
Expected: PASS — 11 tests

- [ ] **Step 5: Check `obs-progress` really exists**

Run `get_component obs-progress` via MCP. **If there is no such component,** replace it with a plain `<div class="wld-progress__track"><i></i></div>` styled from tokens, and add a finding to `docs/DS-GAPS.md`: a discovery flow needs a determinate progress bar and the DS offers none. Do not invent an API.

- [ ] **Step 6: Commit**

```bash
git add src/wan-link-discovery/progressPanel.js src/wan-link-discovery/progressPanel.test.js src/wan-link-discovery/wanLinkDiscovery.css
git commit -m "feat(wan-link-discovery): the progress panel

One card per link, four narrated stages each. advanceAll() drives it
deterministically so the outcomes are tested without timers.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: The provision grid

**Files:**
- Create: `src/wan-link-discovery/provisionGrid.js`
- Test: `src/wan-link-discovery/provisionGrid.test.js`

**Interfaces:**
- Consumes: nothing beyond its arguments.
- Produces: `renderProvisionGrid({profileName, monitor, results, onCancel, onAdd}) → HTMLElement`. `onAdd` receives `[{link, name}]` for the ticked rows only.

- [ ] **Step 1: Write the failing test**

```js
// src/wan-link-discovery/provisionGrid.test.js
import { describe, it, expect, vi } from 'vitest'
import { renderProvisionGrid } from './provisionGrid.js'
import { findMonitor } from './monitors.js'

const RESULTS = [
  { ok: true, link: { probe: 'ICMP Echo', isp: 'Airtel', iface: 'Ethernet1/1', dip: '8.8.8.8' } },
  { ok: false, link: { probe: 'UDP Echo', isp: 'Jio', iface: 'Ethernet1/2', dip: '1.1.1.1' } },
  { ok: true, link: { probe: 'UDP Jitter', isp: 'Tata', iface: 'Ethernet1/48', dip: '9.9.9.9' } },
]

const grid = (over = {}) =>
  renderProvisionGrid({
    profileName: 'NX Core bulk', monitor: findMonitor('m-nxos'), results: RESULTS,
    onCancel: () => {}, onAdd: () => {}, ...over,
  })

describe('provision grid', () => {
  it('lists only the links that verified', () => {
    const rows = grid().querySelector('#wld-prov-table').rows
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.isp)).toEqual(['Airtel', 'Tata'])
  })

  it('counts discovered and failed separately', () => {
    const el = grid()
    expect(el.querySelector('#wld-prov-ok').textContent).toBe('2')
    expect(el.querySelector('#wld-prov-failed').textContent).toBe('1')
  })

  it('uses WAN-Link columns, and does not surface an operation id', () => {
    const titles = grid().querySelector('#wld-prov-table').columns.map((c) => c.title)
    expect(titles).toEqual([
      'NAME', 'MONITOR', 'WAN PROBE', 'SOURCE INTERFACE', 'DESTINATION IP', 'ISP',
    ])
    expect(titles).not.toContain('OPERATION ID')
  })

  it('defaults each name to ISP — destination', () => {
    expect(grid().querySelector('#wld-prov-table').rows[0].name).toBe('Airtel — 8.8.8.8')
  })

  it('marks every new row N', () => {
    expect(grid().querySelector('#wld-prov-table').rows.every((r) => r.badge === 'N')).toBe(true)
  })

  it('legends all three badge states', () => {
    const legend = grid().querySelector('#wld-prov-legend').textContent
    expect(legend).toContain('New')
    expect(legend).toContain('Provisioned')
    expect(legend).toContain('Unprovisioned')
  })
})

describe('provision grid — selection', () => {
  it('cannot add with nothing ticked', () => {
    expect(grid().querySelector('#wld-prov-add').hasAttribute('disabled')).toBe(true)
  })

  it('enables Add once a row is ticked', () => {
    const el = grid()
    el.select(0)
    expect(el.querySelector('#wld-prov-add').hasAttribute('disabled')).toBe(false)
  })

  it('adds only the ticked rows', () => {
    const onAdd = vi.fn()
    const el = grid({ onAdd })
    el.select(1)
    el.querySelector('#wld-prov-add').click()
    expect(onAdd).toHaveBeenCalledOnce()
    const added = onAdd.mock.calls[0][0]
    expect(added).toHaveLength(1)
    expect(added[0].link.isp).toBe('Tata')
  })

  it('selects and clears every row at once', () => {
    const el = grid()
    el.selectAll(true)
    expect(el.querySelector('#wld-prov-add').hasAttribute('disabled')).toBe(false)
    el.selectAll(false)
    expect(el.querySelector('#wld-prov-add').hasAttribute('disabled')).toBe(true)
  })

  it('renames a row inline', () => {
    const onAdd = vi.fn()
    const el = grid({ onAdd })
    el.rename(0, 'Airtel primary')
    el.select(0)
    el.querySelector('#wld-prov-add').click()
    expect(onAdd.mock.calls[0][0][0].name).toBe('Airtel primary')
  })

  it('cancels without adding', () => {
    const onCancel = vi.fn()
    const el = grid({ onCancel })
    el.querySelector('#wld-prov-cancel').click()
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wan-link-discovery/provisionGrid.test.js`
Expected: FAIL — `Failed to resolve import "./provisionGrid.js"`

- [ ] **Step 3: Write the implementation**

```js
// src/wan-link-discovery/provisionGrid.js
// What the run produced, and which of it to keep. Same furniture as the device provision grid —
// checkbox column, inline rename, N/P/U legend, Cancel / Add Selected Objects — with WAN-Link
// columns, because a link has no host and no interface count.
//
// The IP SLA operation id is deliberately NOT a column. It stays internal.

const BADGES = [
  ['N', 'New', 'Created on the device and verified — not yet a monitored instance'],
  ['P', 'Provisioned', 'This exact link already exists as a monitored WAN link'],
  ['U', 'Unprovisioned', 'Operation is on the device but returned no data yet'],
]

export function renderProvisionGrid({ profileName, monitor, results, onCancel, onAdd }) {
  const el = document.createElement('section')
  el.className = 'wld-provision'
  el.innerHTML = `
    <header class="wld-progress__head">
      <h2 id="wld-prov-title"></h2>
      <span class="wld-form__spacer"></span>
      <span>Discovered Objects <b id="wld-prov-ok">0</b></span>
      <span>Failed Objects <b id="wld-prov-failed">0</b></span>
    </header>
    <obs-table id="wld-prov-table" row-key="id" page-size="0" sticky-header max-height="100%"></obs-table>
    <footer class="wld-form__footer">
      <span id="wld-prov-legend" class="wld-provision__legend">
        ${BADGES.map(([k, label, hint]) =>
          `<span title="${hint}"><b>${k}</b> ${label}</span>`).join('')}
      </span>
      <span class="wld-form__spacer"></span>
      <obs-button id="wld-prov-cancel" variant="neutral-lightest">Cancel</obs-button>
      <obs-button id="wld-prov-add" variant="primary" disabled>Add Selected Objects</obs-button>
    </footer>
  `

  const $ = (id) => el.querySelector(`#${id}`)
  const verified = results.filter((r) => r.ok)

  $('wld-prov-title').textContent = profileName
  $('wld-prov-ok').textContent = String(verified.length)
  $('wld-prov-failed').textContent = String(results.length - verified.length)

  // Every row starts New: it was created and verified by this run, and is not yet a monitored
  // instance. P and U are reachable states of the same grid, hence the full legend.
  const state = verified.map((r, i) => ({
    id: `v${i}`,
    badge: 'N',
    name: `${r.link.isp} — ${r.link.dip}`,
    monitor: monitor.name,
    probe: r.link.probe,
    iface: r.link.iface,
    dip: r.link.dip,
    isp: r.link.isp,
    link: r.link,
    selected: false,
  }))

  const table = $('wld-prov-table')
  table.columns = [
    { key: 'name', title: 'NAME' },
    { key: 'monitor', title: 'MONITOR', width: 210 },
    { key: 'probe', title: 'WAN PROBE', width: 150 },
    { key: 'iface', title: 'SOURCE INTERFACE', width: 170 },
    { key: 'dip', title: 'DESTINATION IP', width: 150 },
    { key: 'isp', title: 'ISP', width: 120 },
  ]

  const refresh = () => {
    table.rows = state.map(({ link, ...row }) => row)
    $('wld-prov-add').toggleAttribute('disabled', !state.some((r) => r.selected))
  }
  refresh()

  el.select = (index) => { state[index].selected = !state[index].selected; refresh() }
  el.selectAll = (on) => { state.forEach((r) => { r.selected = on }); refresh() }
  el.rename = (index, name) => { state[index].name = name; refresh() }

  $('wld-prov-cancel').addEventListener('click', () => onCancel())
  $('wld-prov-add').addEventListener('click', () => {
    onAdd(state.filter((r) => r.selected).map(({ link, name }) => ({ link, name })))
  })

  return el
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/wan-link-discovery/provisionGrid.test.js`
Expected: PASS — 12 tests

- [ ] **Step 5: Wire the checkbox column against the real component**

`obs-table`'s selection API is not documented in `elements-api.json`. Run `get_component obs-table` and check for a `selectable` / `selection` attribute. If it exists, wire `el.select` / `el.selectAll` to it and keep the exported methods as the test seam. **If it does not**, render the checkbox as a `type: 'icon'` first column and add a `docs/DS-GAPS.md` finding: the provision pattern the product ships needs row selection and `obs-table` does not offer it.

- [ ] **Step 6: Commit**

```bash
git add src/wan-link-discovery/provisionGrid.js src/wan-link-discovery/provisionGrid.test.js
git commit -m "feat(wan-link-discovery): the provision grid

Only the links that verified are listed; failures are counted, not
listed. WAN-Link columns, N/P/U legend, inline rename, and no operation
id — that stays internal.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Wire the four views, and the deep link from a device

**Files:**
- Modify: `src/wan-link-discovery/screen.js`
- Modify: `src/wan-link-discovery/screen.test.js`
- Modify: `src/wan-link/screen.js` — add the `Add WAN Link` button
- Modify: `src/wan-link/screen.test.js`

**Interfaces:**
- Consumes: `renderCreateForm`, `renderProgressPanel`, `renderProvisionGrid`, `createStore`.
- Produces: nothing new for other tasks. `window.location.hash` gains `#/settings/wan-link-discovery?monitor=<id>` for the locked deep link.

- [ ] **Step 1: Write the failing test**

Append to `src/wan-link-discovery/screen.test.js`:

```js
describe('the four views', () => {
  const mounted = () => {
    const root = document.createElement('div')
    mount(root)
    return root
  }
  const change = (el, value) => {
    el.setAttribute('value', value)
    el.value = value
    el.dispatchEvent(new CustomEvent('change', { detail: [value] }))
  }

  const fillAndRun = (root) => {
    root.querySelector('#wld-create').click()
    const form = root.querySelector('.wld-form')
    change(form.querySelector('#wld-monitor'), 'm-nxos')
    form.querySelector('#wld-name').value = 'NX Core → Airtel'
    change(form.querySelector('#wld-probe'), 'ICMP Echo')
    change(form.querySelector('#wld-iface'), 'Ethernet1/48')
    form.querySelector('#wld-isp').value = 'Airtel'
    form.querySelector('#wld-dip').value = '8.8.8.8'
    form.querySelector('#wld-run').click()
  }

  it('shows the list first', () => {
    const root = mounted()
    expect(root.querySelector('#wld-list').hidden).toBe(false)
    expect(root.querySelector('.wld-form')).toBeNull()
  })

  it('opens the create form and hides the list', () => {
    const root = mounted()
    root.querySelector('#wld-create').click()
    expect(root.querySelector('.wld-form')).toBeTruthy()
    expect(root.querySelector('#wld-list').hidden).toBe(true)
  })

  it('returns to the list on Save and Exit', () => {
    const root = mounted()
    root.querySelector('#wld-create').click()
    root.querySelector('#wld-exit').click()
    expect(root.querySelector('#wld-list').hidden).toBe(false)
    expect(root.querySelector('.wld-form')).toBeNull()
  })

  it('runs into the progress view', () => {
    const root = mounted()
    fillAndRun(root)
    expect(root.querySelector('.wld-progress')).toBeTruthy()
    expect(root.querySelector('#wld-prog-title').textContent).toBe('NX Core → Airtel')
  })

  it('adds the profile to the list as soon as it runs', () => {
    const root = mounted()
    const before = root.querySelector('#wld-table').rows.length
    fillAndRun(root)
    expect(root.querySelector('#wld-table').rows).toHaveLength(before + 1)
  })

  it('moves from progress to the provision grid', () => {
    const root = mounted()
    fillAndRun(root)
    root.querySelector('.wld-progress').advanceAll()
    root.querySelector('#wld-prog-next').click()
    expect(root.querySelector('.wld-provision')).toBeTruthy()
    expect(root.querySelector('#wld-prov-table').rows).toHaveLength(1)
  })

  it('provisions the profile and freezes it', () => {
    const root = mounted()
    fillAndRun(root)
    root.querySelector('.wld-progress').advanceAll()
    root.querySelector('#wld-prog-next').click()
    const grid = root.querySelector('.wld-provision')
    grid.select(0)
    root.querySelector('#wld-prov-add').click()
    const row = root.querySelector('#wld-table').rows.find((r) => r.name === 'NX Core → Airtel')
    expect(row.provisioned).toBe(true)
    expect(row.discovered).toBe(1)
  })

  it('locks the monitor when opened with a monitor in the hash', () => {
    window.location.hash = '#/settings/wan-link-discovery?monitor=m-nxos'
    const root = mounted()
    const monitor = root.querySelector('#wld-monitor')
    expect(monitor.getAttribute('value')).toBe('m-nxos')
    expect(monitor.hasAttribute('disabled')).toBe(true)
    window.location.hash = ''
  })
})
```

Append to `src/wan-link/screen.test.js`:

```js
describe('wan-link deep link into discovery', () => {
  it('offers Add WAN Link, which points at the discovery form for this monitor', () => {
    const root = document.createElement('div')
    mount(root)
    const button = root.querySelector('#wan-link-add')
    expect(button).toBeTruthy()
    expect(button.textContent).toContain('Add WAN Link')
    expect(button.getAttribute('data-href'))
      .toBe('#/settings/wan-link-discovery?monitor=m-nxos')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wan-link-discovery/screen.test.js src/wan-link/screen.test.js`
Expected: FAIL — `#wld-create` click renders nothing; `#wan-link-add` is null

- [ ] **Step 3: Rewrite `mount` in `src/wan-link-discovery/screen.js`**

Add these imports at the top:

```js
import { renderCreateForm } from './createForm.js'
import { renderProgressPanel } from './progressPanel.js'
import { renderProvisionGrid } from './provisionGrid.js'
```

Add a `<section id="wld-view"></section>` immediately after `</section>` closing `#wld-list` in `TEMPLATE`, then replace the body of `mount` after `refresh()` with:

```js
  const list = root.querySelector('#wld-list')
  const view = root.querySelector('#wld-view')
  let live = null

  const showList = () => {
    live?.stop?.()
    live = null
    view.replaceChildren()
    list.hidden = false
    refresh()
  }

  const show = (element) => {
    live?.stop?.()
    live = element
    list.hidden = true
    view.replaceChildren(element)
  }

  // A monitor in the hash means the user came from that device's WAN Link tab. The old in-device
  // drawer is retired; this is the one form, entered with the Monitor already decided.
  const monitorFromHash = () =>
    new URLSearchParams((window.location.hash.split('?')[1] ?? '')).get('monitor')

  function openForm(monitorId = null) {
    show(renderCreateForm({
      monitorId,
      locked: Boolean(monitorId),
      onCancel: showList,
      onRun: openProgress,
    }))
  }

  function openProgress({ name, monitor, osKey, mode, links }) {
    const profile = store.add({ name, monitorId: monitor.id, osKey, mode, links })
    refresh()
    const panel = renderProgressPanel({
      profileName: name,
      monitor,
      osKey,
      links,
      outcome: 'ok',
      onCancel: showList,
      onDone: (results) => {
        store.recordRun(profile.id, {
          discovered: results.filter((r) => r.ok).length,
          failed: results.filter((r) => !r.ok).length,
          ranAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        refresh()
      },
    })
    panel.addEventListener('provision', () => {
      openProvision({ profile, monitor, name, results: panel.results.filter(Boolean) })
    })
    show(panel)
  }

  function openProvision({ profile, monitor, name, results }) {
    show(renderProvisionGrid({
      profileName: name,
      monitor,
      results,
      onCancel: showList,
      onAdd: () => {
        // Add Selected Objects is what makes the profile immutable: from here it IS an IP SLA
        // operation living on a router, and editing or re-running would orphan it.
        store.provision(profile.id)
        showList()
      },
    }))
  }

  root.querySelector('#wld-create').addEventListener('click', () => openForm())

  const deepLinked = monitorFromHash()
  if (deepLinked) openForm(deepLinked)

  return function unmount() {
    live?.stop?.()
    root.replaceChildren()
  }
```

Also add `provisioned` to the row objects `refresh()` builds — `gridRows()` already returns it, so change `table.rows = store.gridRows().map((r) => ({ ...r, actions: '' }))` only if it was dropped.

- [ ] **Step 4: Add the button to `src/wan-link/screen.js`**

In the `obs-toolbar` block of `TEMPLATE`, after the two export buttons:

```html
        <!-- The in-device Add WAN Link drawer is retired. This deep-links to the one form,
             Create Discovery Profile -> WAN Link, with the Monitor pre-selected and locked.
             See docs/superpowers/specs/2026-09-02-wan-link-discovery-design.md. -->
        <obs-button id="wan-link-add" variant="primary"
                    data-href="#/settings/wan-link-discovery?monitor=m-nxos">Add WAN Link</obs-button>
```

And in `mount`, before the `return function unmount`:

```js
  const add = root.querySelector('#wan-link-add')
  add.addEventListener('click', () => { window.location.hash = add.getAttribute('data-href') })
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/wan-link-discovery/ src/wan-link/`
Expected: PASS

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS — no regressions

- [ ] **Step 7: Commit**

```bash
git add src/wan-link-discovery/ src/wan-link/
git commit -m "feat(wan-link-discovery): wire list, form, progress and provision

Add Selected Objects is what freezes a profile. The in-device Add WAN
Link drawer is retired: the WAN Link tab's button deep-links into the one
form with the Monitor pre-selected and locked.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Verify by rendering, and update the docs

**Files:**
- Create: `scripts/probe-wan-link-discovery.mjs`
- Modify: `docs/DS-GAPS.md`
- Modify: `CLAUDE.md` — the screen table, the structure block and the test count
- Modify: `docs/PROJECT-CONTEXT.md`

This task exists because **jsdom and static reads have both produced confidently wrong answers in this repo**. Passing unit tests are not evidence that the page renders. `obs-select` has rendered `[object Object]`, `obs-tabs` has rendered an empty bar, and a drawer footer has floated mid-panel — all with a green suite.

- [ ] **Step 1: Write the probe**

```js
// scripts/probe-wan-link-discovery.mjs
// Drives the real page in real Chrome. Run `npm run dev` first.
import { chromium } from 'playwright-core'

const URL = 'http://localhost:5173/#/settings/wan-link-discovery'
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE ${m.text()}`) })

await page.goto(URL)
await page.waitForSelector('#wld-table')
const out = {}

await page.click('#wld-create')
await page.waitForSelector('#wld-monitor')

// obs-select is a web component: set the value and fire its own event, as a user selection would.
const pick = async (id, value) => {
  await page.evaluate(([i, v]) => {
    const el = document.getElementById(i)
    el.setAttribute('value', v)
    el.value = v
    el.dispatchEvent(new CustomEvent('change', { detail: [v], bubbles: true }))
  }, [id, value])
  await page.waitForTimeout(120)
}

await pick('wld-monitor', 'm-nxos')
out.afterMonitor = await page.evaluate(() => ({
  vendor: document.getElementById('wld-vendor').getAttribute('value'),
  os: document.getElementById('wld-os').getAttribute('value'),
  cred: document.getElementById('wld-cred').getAttribute('value'),
  slaTitle: document.getElementById('wld-sla-title').textContent.trim(),
  // The [object Object] trap: a select whose options were set wrong renders that literal string.
  rendersObjectObject: document.body.innerText.includes('[object Object]'),
}))

await pick('wld-probe', 'UDP Jitter')
out.udpPort = await page.evaluate(() => {
  const field = document.getElementById('wld-port-field')
  const label = field.querySelector('label').textContent.replace(/\s+/g, ' ').trim()
  const timeout = document.getElementById('wld-timeout-field').getBoundingClientRect()
  const box = field.getBoundingClientRect()
  return {
    label,
    visible: box.height > 0,
    sameRowAsTimeout: Math.abs(box.top - timeout.top) < 4,
    rightOfTimeout: box.left > timeout.left,
  }
})

// The footer must sit at the end of the form, not float mid-panel. This exact defect has shipped
// here before with a green suite.
out.footer = await page.evaluate(() => {
  const footer = document.querySelector('.wld-form__footer').getBoundingClientRect()
  const last = document.getElementById('wld-notify-field').getBoundingClientRect()
  return { belowLastField: footer.top >= last.bottom - 2 }
})

out.noHorizontalScroll =
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

await page.screenshot({ path: 'docs/shots/wld-form.png' })
out.errors = errors
console.log(JSON.stringify(out, null, 2))
await browser.close()
```

- [ ] **Step 2: Run it**

```bash
npm install -D playwright-core
npm run dev &
node scripts/probe-wan-link-discovery.mjs
```

Expected: `rendersObjectObject: false`, `vendor: "Cisco Systems"`, `os: "nx-os"`, `cred: "NXOS-SSH-Ops"`, `slaTitle: "IP SLA Operations Test Parameters"`, `udpPort.label` containing `UDP Port`, `udpPort.sameRowAsTimeout: true`, `udpPort.rightOfTimeout: true`, `footer.belowLastField: true`, `noHorizontalScroll: true`, `errors: []`.

**Fix whatever this reports before continuing.** A failure here is a real defect regardless of what the unit tests say.

- [ ] **Step 3: Run DS conformance**

```bash
node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs \
  http://localhost:5173/#/settings/wan-link-discovery
```

Expected: 100/100. **Check the sampled element count against a known-good run** — screens load by dynamic `import()`, so Chromium can sample an almost-empty page and score it very highly. A high score on a low element count is not a pass.

- [ ] **Step 4: Record any DS findings**

Add to `docs/DS-GAPS.md` anything found in Tasks 6–12 — a missing `obs-progress`, `obs-table` without row selection, `obs-select` without a `label`, whatever the build actually hit. Each entry needs a repro, the evidence (source lines or probe output), the workaround used, and a concrete ask. Class it *DS — capability*, *DS — discoverability*, *DS — packaging*, or *consumer*.

- [ ] **Step 5: Update the project docs**

In `CLAUDE.md`:
- Add a row to the screen table: **WAN Link discovery** — "WAN Link as a Discovery Profile category: pick a monitored router, declare the link, push the operation, provision what verified."
- Add `src/wan-link-discovery/` to the structure block, listing each module and its test count.
- Update the test count from 458 to the real number `npm test` reports.
- Add `#/settings/wan-link-discovery` to the Deployment URL table.

In `docs/PROJECT-CONTEXT.md`, add a section for the screen: what it is, why the monitor comes first, and why a provisioned profile is frozen.

- [ ] **Step 6: Run everything one more time**

```bash
npm test
npm run build
```

Expected: all tests pass; the build succeeds.

- [ ] **Step 7: Commit**

```bash
git add scripts/probe-wan-link-discovery.mjs docs/ CLAUDE.md
git commit -m "test(wan-link-discovery): verify by rendering, and update the docs

Drives the real page in real Chrome: the monitor cascade, the UDP Port
position beside Timeout, the form footer not floating, no horizontal
scroll, no console errors. DS findings recorded in DS-GAPS.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task:

| Spec section | Task |
|---|---|
| Platform matrix; method derived; probe names not normalised | 1 |
| Entry points — the global one | 6; the deep link — 11 |
| Block 1 Profile; Block 2 Target; credential prefill | 2, 7 |
| Block 3 Discovery Parameters; UDP Port beside Timeout | 7 |
| Block 4 Operations, vendor-named title | 1, 7 |
| CSV mode; the column contract; mixed probe types | 3, 8 |
| Block 5 Notifications | 7 |
| Reactive rules — gating, OS re-filter, interface reset | 7 |
| Footer; no Save and Schedule | 7 |
| Progress screen; four-stage narration; failure wording | 4, 9 |
| Provision grid; columns; N/P/U; no operation id | 10 |
| Discovery Profile grid row; monitor IP as target | 5, 6 |
| Immutability after provisioning | 5, 11 |
| Out of scope — untemplated probes labelled | 1 |

**Known gaps, deliberately left:** the `Bcc` control on Notify and the `Type` filter's own `WAN Link` entry (as opposed to the platform values) are not built — both are inert chrome in this app, consistent with how `src/wan-link/screen.js` treats its category bar.

**Type consistency.** A link object is `{probe, isp, iface, srcLocation, dip, dstLocation, port}` in `csv.js` (Task 3), in `createForm`'s `onRun` payload (Tasks 7–8), in `progressPanel`'s `links` (Task 9) and in `provisionGrid`'s `results[].link` (Task 10). A monitor is `{id, name, ip, vendor, os, collector, interfaces, credential}` throughout. `osKey` is the `PLATFORMS` key (`'nx-os'`), never the label (`'NX-OS'`) — the label is only ever produced by `PLATFORMS[osKey].label`.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-03-wan-link-discovery.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
