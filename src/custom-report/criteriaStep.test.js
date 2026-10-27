import { describe, it, expect, beforeEach } from 'vitest'
import { renderWizard } from './screen.js'

// jsdom has no DS: a select's options wait in data-pending-options until applyPending, then sit on
// the element as a plain property — read either.
const optionsOf = (el) => (el.options ?? JSON.parse(el.dataset.pendingOptions)).map((o) => o.value)
const pick = (el, value) => el.dispatchEvent(new CustomEvent('change', { detail: [value] }))

describe('create custom report — SLO report criteria', () => {
  let el
  let step
  beforeEach(() => {
    document.body.replaceChildren()
    el = renderWizard({ categories: [{ id: 'availability', name: 'Availability' }] })
    document.body.append(el)
    el.upgrade()
    el.querySelector('.report-tile[data-type="SLO"]').click()
    step = () => el.querySelector('[data-role="criteria-step"]')
  })
  const $ = (role) => step().querySelector(`[data-role="${role}"]`)
  const labels = () => [...step().querySelectorAll('.slo-query .cr-field__label')].map((l) => l.firstChild.textContent)

  it('offers Grid and Top N as the Widget Type, Grid first', () => {
    expect(optionsOf($('widget-type'))).toEqual(['Grid', 'Top N'])
    expect($('widget-type').getAttribute('value')).toBe('Grid')
  })

  it('lays out the query as one plain row, as the product report does, with no Result By', () => {
    expect(labels()).toEqual(['SLO Type', 'Counter', 'Aggregation', 'Source Filter', 'Source'])
    expect(step().querySelector('.slo-query__stripe')).toBeNull()
  })

  it('starts on SLO and slo.achieved.percent', () => {
    expect($('slo-type').getAttribute('value')).toBe('SLO')
    expect($('counter-0').getAttribute('value')).toBe('slo.achieved.percent')
  })

  it("lists the SLO Type's own counters", () => {
    expect(optionsOf($('counter-0'))[0]).toBe('slo.achieved.percent')
    pick($('slo-type'), 'RUM')
    expect(optionsOf($('counter-0'))[0]).toBe('slo.instance.achieved.percent')
  })

  it('pre-selects Last, the only aggregation', () => {
    expect(optionsOf($('aggregation-0'))).toEqual(['Last'])
    expect($('aggregation-0').getAttribute('value')).toBe('Last')
  })

  it('shows Source as an empty box, filled with SLOs once a Source Filter is picked', () => {
    expect(optionsOf($('source-filter'))).toEqual(['Performance SLO', 'Availability SLO'])
    expect($('source').hasAttribute('disabled')).toBe(false)
    expect($('source').getAttribute('placeholder')).toBe(' ')
    expect(optionsOf($('source'))).toEqual([])
    pick($('source-filter'), 'Performance SLO')
    expect($('source').getAttribute('placeholder')).toBe(' ')
    expect($('source').hasAttribute('multiple')).toBe(true)
    expect(optionsOf($('source'))).toContain('Firewall Throughput')
  })

  it('adds a row of Counter and Aggregation only, and removes it again', () => {
    $('add-row').click()
    expect($('counter-1')).not.toBeNull()
    expect($('aggregation-1')).not.toBeNull()
    expect(step().querySelectorAll('[data-role="slo-type"]')).toHaveLength(1)
    // ⊕ moves to the last row; the new row has ⊗.
    expect(step().querySelectorAll('[data-role="add-row"]')).toHaveLength(1)
    expect($('add-row').dataset.row).toBe('1')
    $('remove-row-1').click()
    expect($('counter-1')).toBeNull()
  })

  it('keeps a counter picked before a row is added', () => {
    pick($('counter-0'), 'slo.burn.rate')
    $('add-row').click()
    expect($('counter-0').getAttribute('value')).toBe('slo.burn.rate')
  })

  it('stays put on Next with an incomplete query, marking what is missing', () => {
    $('add-row').click()
    $('next').click()
    expect(step()).not.toBeNull()
    expect($('counter-0').hasAttribute('data-invalid')).toBe(false)
    expect($('counter-1').hasAttribute('data-invalid')).toBe(true)
    expect($('source-filter').hasAttribute('data-invalid')).toBe(true)
    expect($('counter-1').nextElementSibling.textContent).toBe('Select a Counter')
  })

  it('moves to Report Properties once the query is complete', () => {
    pick($('counter-0'), 'slo.achieved.percent')
    pick($('source-filter'), 'Availability SLO')
    $('next').click()
    expect(el.querySelector('[data-role="properties-step"]')).not.toBeNull()
  })

  it('goes back to Report Type on Previous', () => {
    $('prev').click()
    expect(el.querySelector('[data-role="report-type-step"]')).not.toBeNull()
  })

  it('shows the preview box with No data found until the query is complete', () => {
    expect(step().querySelector('[data-role="slo-preview"]')).not.toBeNull()
    expect(step().querySelector('[data-role="preview-empty"]').textContent).toBe('No data found')
    expect(step().querySelector('[data-role="preview-table"]')).toBeNull()
    pick($('source-filter'), 'Availability SLO')
    expect(step().querySelector('[data-role="preview-empty"]')).toBeNull()
    expect(step().querySelector('[data-role="preview-table"]')).not.toBeNull()
  })
})

describe('criteria footer', () => {
  it('styles Previous as the filled grey button, Next as primary', () => {
    document.body.replaceChildren()
    const el = renderWizard({ categories: [] })
    document.body.append(el)
    el.querySelector('.report-tile[data-type="SLO"]').click()
    expect(el.querySelector('[data-role="prev"]').getAttribute('variant')).toBe('neutral-lightest')
    expect(el.querySelector('[data-role="next"]').getAttribute('variant')).toBe('primary')
  })
})
