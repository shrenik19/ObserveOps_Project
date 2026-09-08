import { describe, it, expect } from 'vitest'
import { createEvaluation } from './evaluation.js'

const ev = (over = {}) => createEvaluation({ members: 3, ...over })

describe('evaluation', () => {
  it('starts Redundant, holding 2 of 3', () => {
    const e = ev()
    expect(e.mode).toBe('redundant')
    expect(e.quorum).toBe(2)
  })

  // Phase 1 D9. Asking for all of them is what Strict is for.
  it('cannot express N = M', () => {
    const e = ev()
    expect(e.maxQuorum()).toBe(2)
    e.setQuorum(3)
    expect(e.quorum).toBe(2)
    e.bump(1)
    expect(e.quorum).toBe(2)
  })

  it('clamps at a floor of 1', () => {
    const e = ev()
    e.bump(-1); expect(e.quorum).toBe(1)
    e.bump(-1); expect(e.quorum).toBe(1)
  })

  it('keeps the quorum across a mode round trip', () => {
    const e = ev()
    e.bump(-1)
    e.setMode('strict')
    e.setMode('redundant')
    expect(e.quorum).toBe(1)
  })

  it('states what each mode tolerates, on both rows', () => {
    const e = ev()
    expect(e.meta('strict')).toBe('tolerates 0 failures')
    expect(e.meta('redundant')).toBe('tolerates 1 failure')
  })

  // From inside Strict, Redundant advertises its ceiling rather than a stale quorum.
  it('advertises the ceiling from inside Strict', () => {
    const e = ev()
    e.setMode('strict')
    expect(e.meta('redundant')).toBe('tolerates up to 2 failures')
  })

  it('pluralises failures correctly', () => {
    const e = ev({ members: 5 })
    e.setQuorum(4); expect(e.meta('redundant')).toBe('tolerates 1 failure')
    e.setQuorum(2); expect(e.meta('redundant')).toBe('tolerates 3 failures')
  })

  it('writes the full sentence each mode means', () => {
    const e = ev()
    expect(e.sentence('strict')).toBe('All 3 monitors added under Source must stay up.')
    expect(e.sentence('redundant')).toBe(
      '2 of the 3 monitors added under Source must stay up — survives 1 simultaneous failure.')
  })

  it('leads with the member count, taken from Source', () => {
    expect(ev().lead()).toBe(
      'Decides how the 3 monitors you added under Source combine into a single SLO result — ' +
      'whether every one of them has to stay up, or whether they can cover for each other.')
  })

  it('gives each mode its rule', () => {
    const e = ev()
    expect(e.rule('strict')).toBe('Every member must stay up. A single failure degrades the SLO.')
    expect(e.rule('redundant')).toBe(
      'Members back each other up. Only a drop below your threshold degrades the SLO.')
  })
})
