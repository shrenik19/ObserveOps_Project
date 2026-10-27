import { describe, it, expect, beforeEach } from 'vitest'
import { renderWizard } from './screen.js'

const CATEGORIES = [{ id: 'availability', name: 'Availability' }, { id: 'performance', name: 'Performance' }]

describe('create custom report — shell and report type', () => {
  let el
  let exited
  let saved
  beforeEach(() => {
    document.body.replaceChildren()
    exited = 0
    saved = null
    el = renderWizard({ categories: CATEGORIES, isTaken: (n) => n === 'Taken', onSave: (r) => { saved = r }, onExit: () => { exited++ } })
    document.body.append(el)
    el.upgrade()
  })

  const tiles = () => [...el.querySelectorAll('.report-tile')]
  const stepLabels = () => [...el.querySelectorAll('[data-role="report-steps"] .cr-step__label')].map((l) => l.textContent)
  const current = () => el.querySelector('[data-role="report-steps"] [aria-current="step"]')

  it('opens on Report Type with nineteen tiles, SLO last', () => {
    expect(el.querySelector('[data-role="report-type-step"]')).not.toBeNull()
    expect(tiles()).toHaveLength(19)
    expect(tiles().at(-1).dataset.type).toBe('SLO')
  })

  it('makes only the SLO tile a button; the others are inert', () => {
    expect(tiles().filter((t) => t.tagName === 'BUTTON').map((t) => t.dataset.type)).toEqual(['SLO'])
    expect(tiles().filter((t) => t.tagName !== 'BUTTON').every((t) => t.getAttribute('aria-disabled') === 'true')).toBe(true)
  })

  it('does nothing when another tile is clicked', () => {
    el.querySelector('.report-tile[data-type="APM"]').click()
    expect(el.querySelector('[data-role="report-type-step"]')).not.toBeNull()
  })

  it('draws a picture on every tile', () => {
    expect(tiles().every((t) => t.querySelector('svg'))).toBe(true)
  })

  it('filters the tiles by name', () => {
    const search = el.querySelector('[data-role="report-type-search"]')
    search.value = 'net'
    search.dispatchEvent(new Event('input'))
    expect(tiles().filter((t) => !t.hidden).map((t) => t.dataset.type)).toEqual(['NetRoute'])
  })

  it('lists the three steps in the rail', () => {
    expect(stepLabels()).toEqual(['Report Type', 'Report Criteria', 'Report Properties'])
    // The product's markers: the current step an outlined number, the rest numbered too until done.
    expect([...el.querySelectorAll('.cr-step__marker')].map((m) => m.textContent)).toEqual(['1', '2', '3'])
    expect(current().querySelector('.cr-step__label').textContent).toBe('Report Type')
  })

  it('moves to Report Criteria on SLO, naming the type in the rail', () => {
    el.querySelector('.report-tile[data-type="SLO"]').click()
    expect(el.querySelector('[data-role="criteria-step"]')).not.toBeNull()
    expect(stepLabels()[0]).toBe('Report Type : SLO')
    expect(current().querySelector('.cr-step__label').textContent).toBe('Report Criteria')
    // A finished step shows a filled check, not its number, and can be revisited.
    const done = el.querySelector('.cr-step.is-done')
    expect(done.tagName).toBe('BUTTON')
    expect(done.querySelector('.cr-step__marker obs-icon').getAttribute('name')).toBe('check')
    expect(el.querySelector('.cr-step__label strong').textContent).toBe('SLO')
  })

  it('returns to a finished step when its row is clicked', () => {
    el.querySelector('.report-tile[data-type="SLO"]').click()
    el.querySelector('.cr-step.is-done').click()
    expect(el.querySelector('[data-role="report-type-step"]')).not.toBeNull()
  })

  it('titles the page as the product does: a back arrow and Create Custom Report', () => {
    expect(el.querySelector('[data-role="report-header"] h1').textContent).toBe('Create Custom Report')
    expect(el.querySelector('[data-role="report-back"]').getAttribute('aria-label')).toBe('Back')
  })

  it('shows the date range only on Report Criteria', () => {
    expect(el.querySelector('[data-role="report-range"]').hidden).toBe(true)
    el.querySelector('.report-tile[data-type="SLO"]').click()
    expect(el.querySelector('[data-role="report-range"]').hidden).toBe(false)
  })

  it('leaves through the back arrow', () => {
    el.querySelector('[data-role="report-back"]').click()
    expect(exited).toBe(1)
    expect(saved).toBeNull()
  })
})
