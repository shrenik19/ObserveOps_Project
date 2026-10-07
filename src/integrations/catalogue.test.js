import { describe, it, expect } from 'vitest'
import { SDP, INTEGRATIONS, INTEGRATION_TYPES, TYPE_FIELDS, FIELD_OPTIONS, createProfileStore } from './catalogue.js'

describe('integration catalogue', () => {
  it('lists ME Service Desk Plus right after ServiceNow in the sub-menu', () => {
    expect(INTEGRATIONS.indexOf(SDP)).toBe(INTEGRATIONS.indexOf('ServiceNow') + 1)
  })

  it('offers ME Service Desk Plus as an Integration Type', () => {
    expect(INTEGRATION_TYPES).toContain(SDP)
  })

  it('lays out the SDP fields in the designer’s pairs and order', () => {
    expect(TYPE_FIELDS[SDP]).toEqual([
      ['Request Template', 'Impact'],
      ['Urgency', 'Priority'],
      ['Mode', 'Level'],
      ['Group', 'Technician'],
      ['Category', 'Subcategory'],
      ['Service Category', 'Item'],
    ])
  })

  it('has options for every select any type renders', () => {
    const labels = Object.values(TYPE_FIELDS).flat(2)
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
