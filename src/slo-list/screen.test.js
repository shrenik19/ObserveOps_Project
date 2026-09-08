import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from './screen.js'

describe('slo list screen', () => {
  let root
  beforeEach(() => { root = document.createElement('div'); document.body.append(root); mount(root) })

  it('renders one tile per SLO', () => {
    expect(root.querySelectorAll('.slo-tile')).toHaveLength(5)
  })

  it('names the SLO and not its service', () => {
    const first = root.querySelector('.slo-tile')
    expect(first.querySelector('.slo-tile__name').textContent).toBe('Checkout Availability')
    expect(first.querySelector('.slo-tile__service')).toBeNull()
  })

  it('states the quorum in the Evaluation slot, and never a group count', () => {
    const evals = [...root.querySelectorAll('.slo-tile__eval')].map((e) => e.textContent.trim())
    expect(evals[0]).toBe('Redundant · 2 of 3')
    expect(evals.join(' ')).not.toMatch(/group/i)
  })

  it('shows a Strict SLO as Strict', () => {
    const evals = [...root.querySelectorAll('.slo-tile__eval')].map((e) => e.textContent.trim())
    expect(evals).toContain('Strict')
  })

  it('carries the status as a DS severity, not a hand-rolled pill', () => {
    const sev = root.querySelector('.slo-tile obs-severity')
    expect(sev.getAttribute('severity')).toBe('up')
    expect(sev.getAttribute('value')).toBe('Ok')
    expect(sev.getAttribute('shape')).toBe('bg')
  })

  it('draws the shipped list-view control, inert', () => {
    const btn = root.querySelector('#slo-list-view')
    expect(btn).not.toBeNull()
    expect(btn.hasAttribute('disabled')).toBe(true)
  })

  it('does not navigate — the detail screen is not in this build', () => {
    expect(root.querySelector('.slo-tile a')).toBeNull()
    expect(root.querySelector('.slo-tile').getAttribute('href')).toBeNull()
  })
})
