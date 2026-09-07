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

  it('defaults each name to ISP — destination, badged New', () => {
    expect(grid().querySelector('#wld-prov-table').rows[0].name).toBe('N · Airtel — 8.8.8.8')
  })

  it('marks every new row N', () => {
    expect(grid().querySelector('#wld-prov-table').rows.every((r) => r.badge === 'N')).toBe(true)
  })

  it('renders the export control and a search input', () => {
    const el = grid()
    expect(el.querySelector('#wld-prov-export')).toBeTruthy()
    expect(el.querySelector('#wld-prov-search')).toBeTruthy()
  })

  it('surfaces the badge in the rendered NAME cell, not just in row state', () => {
    const rows = grid().querySelector('#wld-prov-table').rows
    expect(rows[0].name.startsWith('N · ')).toBe(true)
  })

  it('does not leak the internal `selected` flag onto the table rows', () => {
    const rows = grid().querySelector('#wld-prov-table').rows
    expect(rows.every((r) => !('selected' in r))).toBe(true)
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

  it('renames via a real pencil-driven edit, not just the headless method', () => {
    const onAdd = vi.fn()
    const el = grid({ onAdd })
    const table = el.querySelector('#wld-prov-table')
    // Simulates what the real obs-table emits on Save: {id, values}, wrapped the way this app's
    // other DS event listeners already read it (see augmentAddableSelect.js, configDrawer.test.js).
    table.dispatchEvent(new CustomEvent('save', {
      detail: [{ id: 'v0', values: { name: 'N · Airtel primary' } }],
    }))
    expect(table.rows[0].name).toBe('N · Airtel primary')
    el.select(0)
    el.querySelector('#wld-prov-add').click()
    expect(onAdd.mock.calls[0][0][0].name).toBe('Airtel primary')
  })

  // The browser's own shape, reproduced. obs-table reflects `selected` back as a JSON STRING once
  // a user ticks a checkbox — not as the array this file assigns — which used to fail an
  // `Array.isArray` guard and left Add Selected Objects permanently disabled with the mouse.
  // Caught by scripts/probe-wan-link-discovery.mjs; see docs/DS-GAPS.md G41.
  it('folds a component-driven selection back in, even reflected as a JSON string', () => {
    const onAdd = vi.fn()
    const el = grid({ onAdd })
    const table = el.querySelector('#wld-prov-table')
    table.selected = '["v0"]'
    table.dispatchEvent(new CustomEvent('change', { detail: [['v0']] }))
    expect(el.querySelector('#wld-prov-add').hasAttribute('disabled')).toBe(false)
    el.querySelector('#wld-prov-add').click()
    expect(onAdd.mock.calls[0][0].map((r) => r.link.isp)).toEqual(['Airtel'])
  })

  it('reads the reflected JSON string when the change event carries no detail', () => {
    const el = grid()
    const table = el.querySelector('#wld-prov-table')
    table.selected = '["v0","v1"]'
    table.dispatchEvent(new CustomEvent('change'))
    expect(el.querySelector('#wld-prov-add').hasAttribute('disabled')).toBe(false)
    table.selected = '[]'
    table.dispatchEvent(new CustomEvent('change'))
    expect(el.querySelector('#wld-prov-add').hasAttribute('disabled')).toBe(true)
  })

  it('cancels without adding', () => {
    const onCancel = vi.fn()
    const onAdd = vi.fn()
    const el = grid({ onCancel, onAdd })
    el.querySelector('#wld-prov-cancel').click()
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onAdd).not.toHaveBeenCalled()
  })
})
