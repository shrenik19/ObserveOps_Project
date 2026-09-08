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

describe('the business service view', () => {
  let root
  const toggle = () => root.querySelector('#slo-bs-toggle').click()
  beforeEach(() => { root = document.createElement('div'); document.body.append(root); mount(root) })

  it('offers a briefcase toggle, off by default', () => {
    const btn = root.querySelector('#slo-bs-toggle')
    expect(btn.querySelector('obs-icon').getAttribute('name')).toBe('businessService')
    expect(root.querySelectorAll('.slo-group')).toHaveLength(0)
  })

  it('regroups the estate under its services', () => {
    toggle()
    const heads = [...root.querySelectorAll('.slo-group__name')].map((e) => e.textContent.trim())
    expect(heads).toEqual(['E-commerce Platform', 'Network Core', 'Branch Connectivity'])
  })

  it('counts each service, singular and plural', () => {
    toggle()
    const counts = [...root.querySelectorAll('.slo-group__count')].map((e) => e.textContent.trim())
    expect(counts).toEqual(['3 SLOs', '1 SLO', '1 SLO'])
  })

  it('shows every SLO exactly once, as a full tile', () => {
    toggle()
    expect(root.querySelectorAll('.slo-group .slo-tile')).toHaveLength(5)
    expect(root.querySelectorAll('.slo-group .slo-tile__nums')).toHaveLength(5)
  })

  // The reason this view exists.
  it('gives a heading the severest status, not the first', () => {
    toggle()
    const ecom = root.querySelector('.slo-group')
    expect(ecom.querySelector('.slo-group__head obs-severity').getAttribute('value')).toBe('Breached')
    const tiles = [...ecom.querySelectorAll('.slo-tile obs-severity')].map((s) => s.getAttribute('value'))
    expect(tiles).toEqual(['Ok', 'Ok', 'Breached'])
  })

  it('toggles back to the flat list', () => {
    toggle(); toggle()
    expect(root.querySelectorAll('.slo-group')).toHaveLength(0)
    expect(root.querySelectorAll('.slo-tile')).toHaveLength(5)
  })

  it('shows the briefcase as engaged while grouped', () => {
    expect(root.querySelector('#slo-bs-toggle').getAttribute('variant')).toBe('default')
    toggle()
    expect(root.querySelector('#slo-bs-toggle').getAttribute('variant')).toBe('primary')
    toggle()
    expect(root.querySelector('#slo-bs-toggle').getAttribute('variant')).toBe('default')
  })
})
