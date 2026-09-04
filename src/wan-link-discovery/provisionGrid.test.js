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
