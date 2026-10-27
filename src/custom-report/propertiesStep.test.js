import { describe, it, expect, beforeEach } from 'vitest'
import { renderWizard } from './screen.js'

const CATEGORIES = [{ id: 'availability', name: 'Availability' }, { id: 'performance', name: 'Performance' }]
const optionsOf = (el) => (el.options ?? JSON.parse(el.dataset.pendingOptions)).map((o) => o.value)
const pick = (el, value) => el.dispatchEvent(new CustomEvent('change', { detail: [value] }))

describe('create custom report — report properties', () => {
  let el
  let saved
  let exited
  const $ = (role) => el.querySelector(`[data-role="${role}"]`)
  const type = (role, value) => { $(role).value = value; $(role).dispatchEvent(new Event('input')) }

  beforeEach(() => {
    document.body.replaceChildren()
    saved = null
    exited = 0
    el = renderWizard({ categories: CATEGORIES, isTaken: (n) => n.toLowerCase() === 'taken', onSave: (r) => { saved = r }, onExit: () => { exited++ } })
    document.body.append(el)
    el.upgrade()
    el.querySelector('.report-tile[data-type="SLO"]').click()
    pick($('counter-0'), 'slo.achieved.percent')
    pick($('source-filter'), 'Availability SLO')
    $('next').click()
  })

  const captions = () => [...$('properties-step').querySelectorAll('.cr-field__label')].map((l) => l.firstChild.textContent)

  it("lays out the product's fields, two per row", () => {
    expect(captions()).toEqual(['Report Name', 'Report Description', 'Report Category', 'Report Orientation', 'Schedule'])
    const rows = [...$('properties-step').querySelectorAll('.properties-step__grid > .cr-field')].map((f) => f.style.gridColumn)
    expect(rows).toEqual(['1', '2', '1', '2', '1'])
  })

  it('offers the categories, the orientations and Schedule off', () => {
    expect(optionsOf($('report-category'))).toEqual(['availability', 'performance'])
    expect(optionsOf($('report-orientation'))).toEqual(['Auto', 'Portrait', 'Landscape'])
    expect($('report-orientation').getAttribute('value')).toBe('Auto')
    expect($('report-schedule').hasAttribute('checked')).toBe(false)
  })

  it('refuses Save & Exit without a name and a category, marking both', () => {
    $('save-exit').click()
    expect(saved).toBeNull()
    expect($('report-name').getAttribute('error-message')).toBe('Report Name is required')
    expect($('report-category').nextElementSibling.textContent).toBe('Select a Report Category')
  })

  it('refuses a name already in use', () => {
    type('report-name', 'Taken')
    pick($('report-category'), 'availability')
    $('save-exit').click()
    expect(saved).toBeNull()
    expect($('report-name').getAttribute('error-message')).toMatch(/already exists/)
  })

  it('saves the SLO report with every answer', () => {
    type('report-name', 'SLO weekly')
    type('report-description', 'Every SLO')
    pick($('report-category'), 'performance')
    pick($('report-orientation'), 'Landscape')
    $('report-schedule').dispatchEvent(new CustomEvent('change', { detail: [true] }))
    $('save-exit').click()
    expect(saved).toMatchObject({
      name: 'SLO weekly', description: 'Every SLO', category: 'performance', orientation: 'Landscape',
      schedule: true, type: 'SLO', reportType: 'Custom',
      criteria: { sloType: 'SLO', rows: [{ counter: 'slo.achieved.percent', aggregation: 'Last' }], sourceFilter: 'Availability SLO' },
    })
  })

  it("styles Previous as the product's filled grey button and Save & Exit as the outlined one", () => {
    expect($('prev').getAttribute('variant')).toBe('neutral-lightest')
    expect($('save-exit').getAttribute('variant')).toBe('default')
    expect($('prev').nextElementSibling).toBe($('save-exit'))
  })

  it('goes back to the same criteria on Previous', () => {
    type('report-name', 'kept')
    $('prev').click()
    expect($('criteria-step')).not.toBeNull()
    expect($('counter-0').getAttribute('value')).toBe('slo.achieved.percent')
    expect($('source-filter').getAttribute('value')).toBe('Availability SLO')
    expect($('slo-preview')).not.toBeNull()
    $('next').click()
    expect($('report-name').getAttribute('value')).toBe('kept')
  })

  it('leaves without saving through the back arrow', () => {
    type('report-name', 'abandoned')
    $('report-back').click()
    expect(exited).toBe(1)
    expect(saved).toBeNull()
  })
})
