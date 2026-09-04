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
