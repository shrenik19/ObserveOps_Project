import { describe, it, expect } from 'vitest'
import { createStore } from './sloStore.js'

describe('slo store', () => {
  it('seeds the estate', () => {
    const slos = createStore().list()
    expect(slos).toHaveLength(5)
    expect(slos[0].name).toBe('Checkout Availability')
    expect(slos[0].service).toBe('E-commerce Platform')
  })

  it('groups by service, in seed order, without losing an SLO', () => {
    const groups = createStore().groups()
    expect(groups.map((g) => g.service)).toEqual([
      'E-commerce Platform', 'Network Core', 'Branch Connectivity',
    ])
    expect(groups.map((g) => g.count)).toEqual([3, 1, 1])
    expect(groups.reduce((n, g) => n + g.slos.length, 0)).toBe(5)
  })

  // The rule the whole grouped view exists to express.
  it('gives a service the SEVEREST status of its SLOs, not the first', () => {
    const ecom = createStore().groups()[0]
    expect(ecom.slos.map((s) => s.status)).toEqual(['up', 'up', 'critical'])
    expect(ecom.status).toBe('critical')
  })

  it('ranks warning above ok and below critical', () => {
    const { severestOf } = createStore()
    expect(severestOf([{ status: 'up' }, { status: 'warning' }])).toBe('warning')
    expect(severestOf([{ status: 'warning' }, { status: 'critical' }])).toBe('critical')
    expect(severestOf([{ status: 'up' }, { status: 'up' }])).toBe('up')
    expect(severestOf([])).toBe('up')
  })

  it('states a quorum for a redundant SLO and nothing for a strict one', () => {
    const byName = Object.fromEntries(createStore().list().map((s) => [s.name, s]))
    expect(byName['Checkout Availability'].evaluation).toBe('2 of 3')
    expect(byName['Core Switching Availability'].evaluation).toBeNull()
  })
})
