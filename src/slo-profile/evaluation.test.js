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

  it('refuses a member count that has no legal quorum', () => {
    expect(() => createEvaluation({ members: 1 })).toThrow(RangeError)
    expect(() => createEvaluation({ members: 0 })).toThrow(RangeError)
    expect(() => createEvaluation({ members: undefined })).toThrow(RangeError)
  })

  it('holds the invariant at the smallest legal estate', () => {
    const e = createEvaluation({ members: 2 })
    expect(e.maxQuorum()).toBe(1)
    expect(e.quorum).toBe(1)          // the default of 2 is clamped down
    e.bump(1)
    expect(e.quorum).toBe(1)          // and cannot reach M
    expect(e.meta('redundant')).toBe('tolerates 1 failure')
  })

  it('never lets the quorum equal the member count', () => {
    for (const members of [2, 3, 4, 9]) {
      const e = createEvaluation({ members })
      e.bump(100)
      expect(e.quorum).toBeLessThan(members)
      expect(e.quorum).toBeGreaterThanOrEqual(1)
    }
  })

  it('ignores a quorum that is not a finite number', () => {
    const e = createEvaluation({ members: 3 })
    e.setQuorum(NaN)
    expect(e.quorum).toBe(2)
    e.setQuorum(Infinity)
    expect(e.quorum).toBe(2)
    expect(e.meta('redundant')).toBe('tolerates 1 failure')
  })

  // obs-input type="number" carries no `step`, so 1.5 reaches setQuorum unchanged. The docstring's
  // `1..M-1` is a set of integers; 1.5 is not in it.
  it('rounds a non-integer quorum to the nearest integer', () => {
    const e = createEvaluation({ members: 5 })
    e.setQuorum(1.5)
    expect(e.quorum).toBe(2)
    expect(Number.isInteger(e.quorum)).toBe(true)
    e.setQuorum(2.7)
    expect(e.quorum).toBe(3)
  })

  it('rounds a bump that would land off-integer', () => {
    const e = createEvaluation({ members: 5 })
    e.setQuorum(2)
    e.bump(0.5)
    expect(e.quorum).toBe(3)
    expect(Number.isInteger(e.quorum)).toBe(true)
  })

  it('rounds before clamping, so a rounded-up value still cannot reach M', () => {
    const e = createEvaluation({ members: 3 })
    e.setQuorum(2.6)
    expect(e.quorum).toBe(2)          // rounds to 3, then clamps to maxQuorum() = 2
    expect(Number.isInteger(e.quorum)).toBe(true)
  })
})
