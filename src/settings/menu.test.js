import { describe, it, expect } from 'vitest'
import {
  SECTIONS, LEAVES, DEFAULT_KEY, INTEGRATION_LANDING, STUB_LABEL, leafFromHash, menuItems, seedItems, leafByKey,
} from './menu.js'
import { modules, findScreen } from '../app/registry.js'
import { SDP } from '../integrations/catalogue.js'

const labelsOf = (items) => items.flatMap((i) => [i.label, ...labelsOf(i.children ?? [])])

describe('the section list', () => {
  it("is the product's eighteen sections, in the product's order", () => {
    expect(SECTIONS.map((s) => s.label)).toEqual([
      'My Account', 'User Settings', 'System Settings', 'Policy Settings', 'Discovery Settings',
      'Monitor Settings', 'Network Config Settings', 'Compliance Settings', 'SNMP Trap',
      'Observability Pipeline', 'Flow Settings', 'Plugin Library', 'Dependency Mapper',
      'Service Level Objective', 'Utility', 'APM', 'Real User Monitoring', 'Integration',
    ])
  })

  it('gives every section an icon', () => {
    expect(SECTIONS.filter((s) => !s.icon).map((s) => s.label)).toEqual([])
  })

  // obs-side-menu draws an item as a section only if it has children (G56).
  it('draws every section as a section', () => {
    expect(menuItems().every((s) => s.children?.length > 0)).toBe(true)
  })

  it('lists real sub-items only for the sections with design work', () => {
    const real = SECTIONS.filter((s) => s.children.some((c) => !c.stub)).map((s) => s.label)
    expect(real).toEqual([
      'My Account', 'Policy Settings', 'Discovery Settings', 'SNMP Trap', 'Plugin Library',
      'Service Level Objective', 'APM', 'Integration',
    ])
  })

  it('gives every other section the one inert stand-in row, and no route', () => {
    const untouched = SECTIONS.filter((s) => s.children.every((c) => c.stub))
    expect(untouched).toHaveLength(10)
    for (const s of untouched) expect(s.children.map((c) => c.label)).toEqual([STUB_LABEL])
    expect(LEAVES.some((l) => l.label === STUB_LABEL || untouched.includes(l.section))).toBe(false)
  })

  // obs-side-menu keys items by label: a duplicate would make two items answer to one `active`.
  // The stand-in row is the one deliberate repeat — it never becomes active (see screen.js).
  it('has no duplicate label anywhere in the tree, stand-ins aside', () => {
    const labels = labelsOf(menuItems()).filter((l) => l !== STUB_LABEL)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('has no duplicate route key', () => {
    const keys = LEAVES.map((l) => l.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('tags Service Level Objective BETA and SDP NEW', () => {
    const items = menuItems()
    expect(items.find((i) => i.label === 'Service Level Objective').count).toBe('BETA')
    expect(items.at(-1).children.find((c) => c.label === SDP).count).toBe('NEW')
  })

  it('points every screen-backed item at a real registry screen', () => {
    const backed = LEAVES.filter((l) => l.screen)
    expect(backed.map((l) => l.key)).toEqual([
      'my-profile', 'discovery-profile', 'slo-profile', 'integration-profile', 'me-service-desk-plus', 'lama',
    ])
    for (const l of backed) expect(findScreen(modules, 'settings', l.screen), l.key).toBeDefined()
  })

  it('hands obs-side-menu only the fields it reads', () => {
    for (const item of menuItems()) {
      expect(Object.keys(item).every((k) => ['label', 'icon', 'count', 'children'].includes(k))).toBe(true)
    }
  })
})

describe('leafFromHash', () => {
  it('opens My Profile for bare Settings and anything unknown', () => {
    expect(DEFAULT_KEY).toBe('my-profile')
    expect(leafFromHash('#/settings').key).toBe('my-profile')
    expect(leafFromHash('#/settings/no-such-thing').key).toBe('my-profile')
  })

  it('gives an untouched section no route of its own', () => {
    expect(leafFromHash('#/settings/user-settings').key).toBe('my-profile')
  })

  it('finds an item by its key', () => {
    expect(leafFromHash('#/settings/metric-policy').label).toBe('Metric Policy')
    expect(leafFromHash('#/settings/metric-plugin').label).toBe('Metric')
  })

  it('keeps the old WAN Link discovery link, query and all', () => {
    expect(leafFromHash('#/settings/wan-link-discovery?monitor=m-nxos').key).toBe('discovery-profile')
  })

  it('keeps the old Integration ?view= links', () => {
    expect(leafFromHash(`#/settings/integration?view=${encodeURIComponent(SDP)}`).key).toBe('me-service-desk-plus')
    expect(leafFromHash('#/settings/integration?view=Integration%20Profile').key).toBe('integration-profile')
    expect(leafFromHash('#/settings/integration')).toBe(INTEGRATION_LANDING)
    expect(leafFromHash('#/settings/integration?view=Metric%20Policy')).toBe(INTEGRATION_LANDING)
  })
})

describe('seedItems', () => {
  it("seeds only the item's own section (G53)", () => {
    expect(seedItems(leafByKey('slo-profile')).map((s) => s.label)).toEqual(['Service Level Objective'])
    expect(seedItems(INTEGRATION_LANDING).map((s) => s.label)).toEqual(['Integration'])
  })
})
