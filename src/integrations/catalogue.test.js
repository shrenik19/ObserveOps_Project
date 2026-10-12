import { describe, it, expect } from 'vitest'
import { SDP, INTEGRATIONS, INTEGRATION_TYPES, TYPE_FIELDS, TEMPLATE_FIELDS, FIELD_OPTIONS, createProfileStore } from './catalogue.js'

describe('integration catalogue', () => {
  it('lists ME Service Desk Plus right after ServiceNow in the sub-menu', () => {
    expect(INTEGRATIONS.indexOf(SDP)).toBe(INTEGRATIONS.indexOf('ServiceNow') + 1)
  })

  it('offers ME Service Desk Plus as an Integration Type', () => {
    expect(INTEGRATION_TYPES).toContain(SDP)
  })

  it('gives SDP no fixed fields — its Request Template decides them', () => {
    expect(TYPE_FIELDS[SDP]).toBeUndefined()
  })

  it('offers one Request Template per entry in the template map', () => {
    expect(FIELD_OPTIONS['Request Template']).toEqual(Object.keys(TEMPLATE_FIELDS))
  })

  it('maps each Request Template to its fields, in order', () => {
    const all = ['Impact', 'Urgency', 'Priority', 'Level', 'Group', 'Technician', 'Category', 'Subcategory', 'Service Category', 'Item']
    expect(TEMPLATE_FIELDS).toEqual({
      'Default Request': all,
      'Report an Incident': all.slice(0, 8),
      'Network Outage': ['Impact', 'Urgency', 'Priority', 'Group', 'Technician', 'Category', 'Subcategory'],
    })
  })

  it('drops Mode everywhere', () => {
    expect(Object.values(TEMPLATE_FIELDS).flat()).not.toContain('Mode')
    expect(FIELD_OPTIONS.Mode).toBeUndefined()
  })

  it('has options for every select any type or template renders', () => {
    const labels = [...Object.values(TYPE_FIELDS).flat(2), ...Object.values(TEMPLATE_FIELDS).flat()]
    expect(labels.filter((l) => !FIELD_OPTIONS[l]?.length)).toEqual([])
  })
})

describe('profile store', () => {
  it('seeds example rows, including SDP profiles', () => {
    const rows = createProfileStore().rows()
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.some((r) => r.type === SDP)).toBe(true)
  })

  it('treats names as unique, ignoring case and outer spaces', () => {
    const store = createProfileStore()
    expect(store.isTaken(' METRIC-ALERT ')).toBe(true)
    expect(store.isTaken('brand new')).toBe(false)
  })

  it('adds a trimmed profile to the top with a used count of 0', () => {
    const store = createProfileStore()
    store.add({ name: '  SDP P1  ', type: SDP })
    expect(store.rows()[0]).toMatchObject({ name: 'SDP P1', type: SDP, used: 0, description: '' })
  })

  it('gives each store its own rows', () => {
    createProfileStore().add({ name: 'x', type: SDP })
    expect(createProfileStore().isTaken('x')).toBe(false)
  })
})
