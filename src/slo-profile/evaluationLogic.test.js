import { describe, it, expect, beforeEach } from 'vitest'
import { renderEvaluationLogic } from './evaluationLogic.js'

describe('the evaluation logic control', () => {
  let host
  const rows = () => [...host.querySelectorAll('.ev-row')]
  const selected = () => host.querySelector('.ev-row.is-on')
  beforeEach(() => { host = document.createElement('div'); renderEvaluationLogic(host, { members: 3 }) })

  it('offers exactly two modes, as a radio group', () => {
    expect(host.querySelector('[role="radiogroup"]')).not.toBeNull()
    expect(rows()).toHaveLength(2)
    expect(rows().every((r) => r.getAttribute('role') === 'radio')).toBe(true)
  })

  it('starts on Redundant', () => {
    expect(selected().dataset.mode).toBe('redundant')
    expect(selected().getAttribute('aria-checked')).toBe('true')
    expect(host.querySelector('[data-mode="strict"]').getAttribute('aria-checked')).toBe('false')
  })

  // The reason Option G was chosen over a toggle.
  it('states what BOTH modes tolerate, including the one not chosen', () => {
    expect(host.querySelector('[data-mode="strict"] .ev-row__meta').textContent)
      .toBe('tolerates 0 failures')
    expect(host.querySelector('[data-mode="redundant"] .ev-row__meta').textContent)
      .toBe('tolerates 1 failure')
  })

  it('expands only the selected row', () => {
    expect(host.querySelector('[data-mode="redundant"] .ev-row__body').hidden).toBe(false)
    expect(host.querySelector('[data-mode="strict"] .ev-row__body').hidden).toBe(true)
  })

  it('puts the quorum in a DS input with both addons', () => {
    const input = host.querySelector('#ev-quorum')
    expect(input.tagName.toLowerCase()).toBe('obs-input')
    expect(input.getAttribute('type')).toBe('number')
    expect(input.getAttribute('addon-before')).toBe('at least')
    expect(input.getAttribute('addon-after')).toBe('of 3 must stay up')
    expect(input.getAttribute('value')).toBe('2')
  })

  it('cannot raise the quorum to M', () => {
    const input = host.querySelector('#ev-quorum')
    input.value = '3'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(host.querySelector('#ev-quorum').getAttribute('value')).toBe('2')
  })

  it('follows the quorum down, in the meta and the sentence', () => {
    const input = host.querySelector('#ev-quorum')
    input.value = '1'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(host.querySelector('[data-mode="redundant"] .ev-row__meta').textContent)
      .toBe('tolerates 2 failures')
    expect(host.querySelector('[data-mode="redundant"] obs-tooltip').textContent.trim())
      .toBe('1 of the 3 monitors added under Source must stay up — survives 2 simultaneous failures.')
  })

  it('switches mode on click, and keeps the quorum', () => {
    host.querySelector('[data-mode="strict"]').click()
    expect(selected().dataset.mode).toBe('strict')
    expect(host.querySelector('[data-mode="strict"] .ev-row__body').hidden).toBe(false)
    expect(host.querySelector('[data-mode="redundant"] .ev-row__meta').textContent)
      .toBe('tolerates up to 2 failures')
    host.querySelector('[data-mode="redundant"]').click()
    expect(host.querySelector('#ev-quorum').getAttribute('value')).toBe('2')
  })

  // obs-radio would have given us this for free; it is ours to keep correct now.
  it('is operable by keyboard alone', () => {
    const strict = host.querySelector('[data-mode="strict"]')
    expect(strict.getAttribute('tabindex')).toBe('0')
    strict.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(selected().dataset.mode).toBe('strict')
    const redundant = host.querySelector('[data-mode="redundant"]')
    redundant.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(selected().dataset.mode).toBe('redundant')
  })

  it('never offers an N = M state to warn about', () => {
    expect(host.textContent).not.toMatch(/same as Strict/i)
    expect(host.textContent).not.toMatch(/3 of 3/)
  })
})
