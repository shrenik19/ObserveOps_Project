import { describe, it, expect } from 'vitest'
import { createProfileStore } from './profiles.js'

describe('slo profile store', () => {
  it('produces one row per profile, with the shipped columns', () => {
    const [first] = createProfileStore().rows()
    expect(first).toEqual({
      id: 'sp-1', type: 'Availability', name: 'Checkout Availability', frequency: 'Daily',
      evaluation: 'Redundancy', warning: '99.5', target: '99',
      service: 'E-commerce Platform', start: '01-09-2026',
    })
  })

  // A Performance SLO has no evaluation logic — redundancy is an Availability concept, and
  // leaving the cell blank would have it misread as Strict.
  it('reads an em dash for a Performance SLO, never Strict', () => {
    const perf = createProfileStore().rows().find((r) => r.type === 'Performance')
    expect(perf.evaluation).toBe('—')
  })

  it('shows Strict and Redundancy side by side', () => {
    const evals = createProfileStore().rows().map((r) => r.evaluation)
    expect(evals).toContain('Strict')
    expect(evals).toContain('Redundancy')
  })

  it('pins every seeded row, so a corrupted value cannot pass', () => {
    expect(createProfileStore().rows()).toEqual([
      { id: 'sp-1', type: 'Availability', name: 'Checkout Availability', frequency: 'Daily',
        evaluation: 'Redundancy', warning: '99.5', target: '99',
        service: 'E-commerce Platform', start: '01-09-2026' },
      { id: 'sp-2', type: 'Availability', name: 'API-Gateway-Availability', frequency: 'Weekly',
        evaluation: 'Strict', warning: '91', target: '90',
        service: 'SLO FOR MAXIS', start: '30-06-2026' },
      { id: 'sp-3', type: 'Performance', name: 'Storage-Volume-Availability', frequency: 'Daily',
        evaluation: '—', warning: '71', target: '70',
        service: 'SLO RENASUS', start: '31-05-2027' },
      { id: 'sp-4', type: 'Availability', name: 'Up time', frequency: 'Weekly',
        evaluation: 'Strict', warning: '99.29', target: '99.27',
        service: 'ABC', start: '30-06-2026' },
      { id: 'sp-5', type: 'Availability', name: 'WANLink SLO', frequency: 'Daily',
        evaluation: 'Redundancy', warning: '99', target: '98',
        service: 'WANLINK Juhu', start: '15-08-2026' },
    ])
  })
})

describe('creating a profile', () => {
  it('appends a row the table will show, returning it too', () => {
    const store = createProfileStore()
    const before = store.rows().length
    const created = store.add({
      name: 'New Checkout SLO', service: 'ABC', frequency: 'Weekly',
      target: '95', warning: '96', start: '01-01-2027', evaluation: 'Strict',
    })

    const rows = store.rows()
    expect(rows).toHaveLength(before + 1)
    const last = rows[rows.length - 1]
    expect(last).toEqual({
      id: created.id, type: 'Availability',
      name: 'New Checkout SLO', service: 'ABC', frequency: 'Weekly',
      target: '95', warning: '96', start: '01-01-2027', evaluation: 'Strict',
    })
    expect(created).toEqual(last)
  })

  it('defaults type to Availability, since the Create form collects no other', () => {
    const store = createProfileStore()
    const created = store.add({ name: 'X', service: 'Y', frequency: 'Daily',
      target: '99', warning: '99', start: '01-01-2027', evaluation: 'Redundancy' })
    expect(created.type).toBe('Availability')
  })

  it('scopes new ids to the store instance, not the module', () => {
    // Same shape as src/wan-link-discovery/profileStore.js: each store starts counting from its
    // own seed, independent of any other instance created before or after it.
    const a = createProfileStore()
    const b = createProfileStore()
    const rowA = a.add({ name: 'A' })
    const rowB = b.add({ name: 'B' })
    expect(rowA.id).toBe(rowB.id)
    expect(rowA.id).toBe('sp-6')
  })
})
