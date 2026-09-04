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
