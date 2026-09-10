import { describe, it, expect, beforeEach } from 'vitest'
import { renderSloHelpCard } from './helpCard.js'

describe('the SLO Help Card', () => {
  let card
  beforeEach(() => { card = renderSloHelpCard() })

  const text = () => card.textContent.replace(/\s+/g, ' ')

  it('is the drawer\'s reference panel, titled', () => {
    expect(card.querySelector('.pane-drawer__help-title').textContent.trim()).toBe('SLO Help card')
  })

  it('summarises the form as a field table', () => {
    card.update({ service: 'Network Core', target: '95', warning: '97', frequency: 'Weekly', type: 'Performance' })
    const rows = [...card.querySelectorAll('.slo-help__fields tr')]
      .map((r) => [...r.cells].map((c) => c.textContent.trim()))
    expect(rows).toContainEqual(['Business Service Name', 'Network Core'])
    expect(rows).toContainEqual(['Target', '95%'])
    expect(rows).toContainEqual(['Warning', '97%'])
    expect(rows).toContainEqual(['Frequency', 'Weekly'])
    expect(rows).toContainEqual(['SLO Type', 'Performance'])
  })

  // The card cannot drift from the field — the wireframe makes the same point in a comment.
  it('follows the Business Service as it changes', () => {
    card.update({ service: 'Branch Connectivity' })
    expect(text()).toContain('Branch Connectivity')
    card.update({ service: 'ABC' })
    expect(text()).toContain('ABC')
    expect(text()).not.toContain('Branch Connectivity')
  })

  describe('under Redundant', () => {
    beforeEach(() => card.update({ mode: 'redundant', quorum: 2 }))

    it('names the evaluation and states the quorum', () => {
      const rows = [...card.querySelectorAll('.slo-help__fields tr')]
        .map((r) => [...r.cells].map((c) => c.textContent.trim()))
      expect(rows).toContainEqual(['Evaluation Logic', 'Redundancy'])
      expect(text()).toContain('quorum ≥ 2 of 3')
    })

    it('explains that a single member failing costs nothing', () => {
      expect(text()).toContain('holds its quorum')
    })

    // APP-1 11111 · APP-2 10100 · APP-3 11101 → per-day up counts 3,2,3,1,2.
    it('works the five days: quorum holds on four of them', () => {
      const quorum = [...card.querySelectorAll('.slo-help__matrix .is-quorum td')]
        .slice(1, -1).map((c) => c.textContent.trim())
      expect(quorum).toEqual(['3/3', '2/3', '3/3', '1/3', '2/3'])
    })

    it('scores the period 80%, against Strict\'s 40%', () => {
      const overall = [...card.querySelectorAll('.slo-help__matrix .is-overall td')].map((c) => c.textContent.trim())
      expect(overall).toEqual(['Overall Status', 'Ok', 'Ok', 'Ok', 'Breach', 'Ok', '80%'])
      const strict = [...card.querySelectorAll('.slo-help__matrix .is-strict td')].map((c) => c.textContent.trim())
      expect(strict).toEqual(['Strict would be', 'Ok', 'Breach', 'Ok', 'Breach', 'Breach', '40%'])
    })

    it('reports what redundancy recovered, in percentage points', () => {
      expect(text()).toContain('recovered 40 percentage points')
      expect(text()).toContain('80% against 40% under Strict')
    })

    // A quorum of 3 of 3 is arithmetically Strict, and the card must not claim a gain.
    it('recovers nothing when the quorum is every member', () => {
      card.update({ mode: 'redundant', quorum: 3 })
      expect(text()).toContain('recovered 0 percentage points')
    })
  })

  describe('under Strict', () => {
    beforeEach(() => card.update({ mode: 'strict' }))

    it('names the evaluation', () => {
      const rows = [...card.querySelectorAll('.slo-help__fields tr')]
        .map((r) => [...r.cells].map((c) => c.textContent.trim()))
      expect(rows).toContainEqual(['Evaluation Logic', 'Strict'])
    })

    it('says every member must be up', () => {
      expect(text()).toContain('every member must be up')
    })

    it('scores the same five days 40%, and invites the comparison', () => {
      expect(text()).toContain('scores 40%')
      expect(text()).toContain('Switch to Redundant')
    })

    it('drops the quorum row, which means nothing under Strict', () => {
      expect(card.querySelector('.slo-help__matrix .is-quorum')).toBeNull()
    })
  })
})
