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
