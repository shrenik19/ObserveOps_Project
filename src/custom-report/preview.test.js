import { describe, it, expect, beforeEach } from 'vitest'
import { createWizard } from './wizard.js'
import { renderPreview } from './preview.js'
import { applyPending } from './dom.js'

describe('SLO report preview', () => {
  let w
  let changes
  const render = () => {
    const el = renderPreview({ wizard: w, onChange: () => { changes++ } })
    document.body.replaceChildren(el)
    applyPending(el)
    return el
  }
  beforeEach(() => {
    changes = 0
    w = createWizard()
    w.pickType('SLO')
    w.setCounter(0, 'slo.achieved.percent')
    w.setSourceFilter('Availability SLO')
  })

  it('shows Grid as a table of the SLO columns and rows', () => {
    const table = render().querySelector('obs-table[data-role="preview-table"]')
    expect(table.columns.map((c) => c.title).slice(0, 3)).toEqual(['SLO.ID', 'SLO.PROFILE.NAME', 'SLO.ACHIEVED.PERCENT'])
    expect(table.rows.length).toBeGreaterThan(0)
  })

  it('draws tags as chips, the first one and a +N for the rest', () => {
    const table = render().querySelector('obs-table')
    expect(table.columns.find((c) => c.key === 'tags').type).toBe('tags')
    const core = table.rows.find((r) => r.name === 'Core Switching Availability')
    expect(core.tags).toEqual(['network', '+2'])
  })

  it('keeps the header font size with the report (obs-table has no hook to show it — see DS-GAPS)', () => {
    w.setFontSize('Large')
    expect(render().querySelector('[data-role="font-size"]').getAttribute('value')).toBe('Large')
    expect(w.toReport().criteria.fontSize).toBe('Large')
  })

  it('offers Header Font Size for Grid and the seven views for Top N', () => {
    expect(render().querySelector('[data-role="font-size"]')).not.toBeNull()
    w.setWidgetType('Top N')
    const views = [...render().querySelectorAll('[data-view]')].map((b) => b.dataset.view)
    expect(views).toEqual(['area', 'line', 'hbar', 'vbar', 'pie', 'gauge', 'grid'])
  })

  it('draws the picked Top N view, and changes it on click', () => {
    w.setWidgetType('Top N')
    let el = render()
    expect(el.querySelector('.cr-area')).not.toBeNull()
    el.querySelector('[data-view="pie"]').click()
    expect(changes).toBe(1)
    expect(w.state().view).toBe('pie')
    el = render()
    expect(el.querySelector('.cr-slice')).not.toBeNull()
    expect(el.querySelector('[data-view="pie"]').getAttribute('aria-pressed')).toBe('true')
  })

  it('shows the top ten as a table for the Top N grid view', () => {
    w.setWidgetType('Top N')
    w.setView('grid')
    const table = render().querySelector('obs-table')
    expect(table.rows.length).toBeLessThanOrEqual(10)
    const values = table.rows.map((r) => r['slo.achieved.percent'])
    expect(values).toEqual([...values].sort((a, b) => b - a))
  })

  it('collapses the Properties panel, and remembers it', () => {
    render().querySelector('[data-role="properties-toggle"]').click()
    expect(render().querySelector('.slo-properties').classList.contains('is-collapsed')).toBe(true)
  })
})

describe('Properties tabs', () => {
  it("shows the product's three tabs, with only Style live", () => {
    const w = createWizard()
    const el = renderPreview({ wizard: w })
    const tabs = JSON.parse(el.querySelector('.slo-properties obs-tabs').getAttribute('tabs'))
    expect(tabs).toEqual([
      { key: 'style', label: 'Style' },
      { key: 'column-setting', label: 'Column Setting', disabled: true },
      { key: 'timeline-preference', label: 'Timeline Preference', disabled: true },
    ])
    expect(el.querySelector('.slo-properties obs-tabs').getAttribute('value')).toBe('style')
  })
})
