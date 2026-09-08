import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from './screen.js'

describe('slo profile screen', () => {
  let root
  beforeEach(() => { root = document.createElement('div'); document.body.append(root); mount(root) })

  it('renders the profile table', () => {
    expect(root.querySelector('#slo-profile-table')).not.toBeNull()
    expect(root.querySelector('#slo-profile-table').rows).toHaveLength(5)
  })

  it('leads with SLO Type and puts Evaluation Logic beside Frequency', () => {
    const titles = root.querySelector('#slo-profile-table').columns.map((c) => c.title)
    expect(titles[0]).toBe('SLO TYPE')
    expect(titles[titles.indexOf('FREQUENCY') + 1]).toBe('EVALUATION LOGIC')
  })

  it('keeps Warning before Target, as shipped', () => {
    const titles = root.querySelector('#slo-profile-table').columns.map((c) => c.title)
    expect(titles.indexOf('WARNING')).toBeLessThan(titles.indexOf('TARGET'))
  })

  // G1: obs-table cannot host a component in a cell. The column does not need one.
  it('renders Evaluation Logic as plain text', () => {
    const values = root.querySelector('#slo-profile-table').rows.map((r) => r.evaluation)
    expect(values.every((v) => !/[<>]/.test(v))).toBe(true)
    expect(new Set(values)).toEqual(new Set(['Redundancy', 'Strict', '—']))
  })

  it('offers Create SLO Profile', () => {
    expect(root.querySelector('#slo-profile-create')).not.toBeNull()
  })
})
