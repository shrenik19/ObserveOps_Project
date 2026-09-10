import { describe, it, expect } from 'vitest'
import { renderDiscoveryRail, renderDiscoveryHelp, CATEGORIES } from './discoveryPanes.js'

describe('the Discovery Profile rail', () => {
  const rail = () => renderDiscoveryRail()
  const items = () => [...rail().querySelectorAll('.pane-drawer__nav-item')]

  it('is the product tree, in the product order', () => {
    expect(items().map((i) => i.textContent.trim())).toEqual(CATEGORIES)
  })

  // The spec's first decision: "WAN Link is its own category in the tree", rejecting "a sub-node
  // under Network". The wireframe puts it between Service Check and Wireless.
  it('puts WAN Link between Service Check and Wireless, as its own category', () => {
    const labels = items().map((i) => i.textContent.trim())
    expect(labels[labels.indexOf('WAN Link') - 1]).toBe('Service Check')
    expect(labels[labels.indexOf('WAN Link') + 1]).toBe('Wireless')
    expect(labels.indexOf('WAN Link')).toBeGreaterThan(labels.indexOf('Network'))
  })

  it('selects WAN Link as the leaf', () => {
    const selected = items().filter((i) => i.classList.contains('is-selected'))
    expect(selected).toHaveLength(1)
    expect(selected[0].textContent.trim()).toBe('WAN Link')
  })

  // Shown, not hidden: the rail has to read as the real tree, which is the feature's whole claim.
  it('shows every other category but does not let this build choose one', () => {
    const others = items().filter((i) => i.textContent.trim() !== 'WAN Link')
    expect(others).toHaveLength(CATEGORIES.length - 1)
    expect(others.every((i) => i.hasAttribute('disabled'))).toBe(true)
  })

  it('carries the heading and the search box the product puts there', () => {
    const r = rail()
    expect(r.querySelector('.pane-drawer__rail-heading').textContent.trim()).toBe('Create Discovery Profile')
    expect(r.querySelector('obs-input[type="search"]')).not.toBeNull()
  })
})

describe('the Discovery Help Card', () => {
  const help = () => renderDiscoveryHelp()
  const text = () => help().textContent.replace(/\s+/g, ' ')

  it('is titled, with the product\'s four rows', () => {
    const h = help()
    expect(h.querySelector('.pane-drawer__help-title').textContent.trim()).toBe('Discovery Help Card')
    expect([...h.querySelectorAll('.pane-drawer__help-summary')].map((s) => s.textContent.trim())).toEqual([
      'Supported Platforms',
      'Network & Connectivity Requirements',
      'Credential Requirements and Permissions',
      'Discovery Mechanisms',
    ])
  })

  it('opens on Supported Platforms', () => {
    const rows = [...help().querySelectorAll('.pane-drawer__help-section')]
    expect(rows[0].open).toBe(true)
    expect(rows.slice(1).every((r) => r.open)).toBe(false)
  })

  it('names every platform the spec supports', () => {
    for (const platform of ['IOS XE', 'IOS XR', 'NX-OS', 'RPM']) {
      expect(text()).toContain(platform)
    }
  })

  // The three facts the spec settled that a user cannot see from the form alone.
  it('states the derived method, the push, and the credential rule', () => {
    expect(text()).toContain('Declare → push → verify')
    expect(text()).toContain('derived from the platform')
    expect(text()).toContain('Credential Profile is required')
  })

  it('links on to the documentation, as the product does', () => {
    expect(help().querySelector('.pane-drawer__help-footer a')).not.toBeNull()
  })
})
