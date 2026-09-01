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

  // obs-table emits the row KEY as a bare string, confirmed by rendering — detail is ['l10'], not
  // [{ id: 'l10' }]. Reading detail[0].id silently opened nothing, and jsdom could not see it.
  it('opens the detail drawer from the row-key string obs-table actually emits', () => {
    const overlay = document.createElement('div')
    overlay.id = 'overlay-root'
    document.body.append(overlay)

    const root = document.createElement('div')
    mount(root)
    root.querySelector('#wan-link-table')
      .dispatchEvent(new CustomEvent('rowclick', { detail: ['l10'] }))

    expect(overlay.querySelector('obs-drawer')).not.toBeNull()
    expect(overlay.textContent).toContain('nxosudpjitter-VI')
    overlay.remove()
  })

  it('still opens the drawer if the contract widens to the row object', () => {
    const overlay = document.createElement('div')
    overlay.id = 'overlay-root'
    document.body.append(overlay)

    const root = document.createElement('div')
    mount(root)
    root.querySelector('#wan-link-table')
      .dispatchEvent(new CustomEvent('rowclick', { detail: [{ id: 'l1' }] }))

    expect(overlay.querySelector('obs-drawer')).not.toBeNull()
    overlay.remove()
  })
})
