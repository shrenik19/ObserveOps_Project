import { describe, it, expect } from 'vitest'
import { createProfileStore } from './profiles.js'

describe('slo profile store', () => {
  it('seeds the shipped profile list', () => {
    expect(createProfileStore().list()).toHaveLength(5)
  })

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
