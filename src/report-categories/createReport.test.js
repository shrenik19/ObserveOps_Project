import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from './screen.js'

const pick = (el, value) => el.dispatchEvent(new CustomEvent('change', { detail: [value] }))

describe('Report page — Create Custom Report', () => {
  let root
  let unmount
  const $ = (sel) => root.querySelector(sel)
  const titles = () => $('#reports-table').rows.map((r) => r.title)

  beforeEach(() => {
    document.body.replaceChildren()
    history.replaceState(null, '', '#/reports/categories')
    const overlay = document.createElement('div')
    overlay.id = 'overlay-root'
    root = document.createElement('div')
    document.body.append(root, overlay)
    unmount = mount(root)
  })
  afterEach(() => unmount?.())

  const open = () => $('[data-role="create-custom-report"]').click()

  it("adds an SLO tab after the product's report tabs", () => {
    const tabs = JSON.parse($('#report-tabs').getAttribute('tabs')).map((t) => [t.key, t.label])
    expect(tabs.map(([, label]) => label)).toEqual(['Metric', 'Log', 'Flow', 'Trap', 'Audit', 'NCCM', 'APM', 'RUM', 'NetRoute', 'Log Compliance', 'SLO'])
    expect(tabs.at(-1)).toEqual(['slo', 'SLO'])
  })

  it('opens the wizard in place of the list, and says so in the hash', () => {
    open()
    expect($('[data-role="custom-report"]')).not.toBeNull()
    expect($('.app-shell__body').style.display).toBe('none')
    expect(window.location.hash).toBe('#/reports/categories?view=create-report')
  })

  it('returns to an unchanged list through the back arrow', () => {
    const before = titles()
    open()
    $('[data-role="report-back"]').click()
    expect($('[data-role="custom-report"]')).toBeNull()
    expect($('.app-shell__body').style.display).toBe('')
    expect(titles()).toEqual(before)
    expect(window.location.hash).toBe('#/reports/categories')
  })

  it('offers the real categories, without All Reports', () => {
    open()
    $('.report-tile[data-type="SLO"]').click()
    pick($('[data-role="counter-0"]'), 'slo.achieved.percent')
    pick($('[data-role="source-filter"]'), 'Availability SLO')
    $('[data-role="next"]').click()
    const values = $('[data-role="report-category"]').options.map((o) => o.value)
    expect(values).toContain('availability')
    expect(values).not.toContain('all-reports')
  })

  function createSlo(name) {
    open()
    $('.report-tile[data-type="SLO"]').click()
    pick($('[data-role="counter-0"]'), 'slo.achieved.percent')
    pick($('[data-role="source-filter"]'), 'Availability SLO')
    $('[data-role="next"]').click()
    const nameInput = $('[data-role="report-name"]')
    nameInput.value = name
    nameInput.dispatchEvent(new Event('input'))
    pick($('[data-role="report-category"]'), 'availability')
    $('[data-role="save-exit"]').click()
  }

  it('saves the SLO report into the list as Type SLO, Report Type Custom', () => {
    createSlo('SLO weekly')
    expect($('[data-role="custom-report"]')).toBeNull()
    const row = $('#reports-table').rows.find((r) => r.title === 'SLO weekly')
    expect(row).toMatchObject({ type: 'SLO', reportType: 'Custom', category: 'availability', schedule: false })
    expect(row.name.text).toBe('SLO weekly')
  })

  it('refuses the name of a report already in the list', () => {
    createSlo('SLO weekly')
    createSlo('slo weekly')
    expect($('[data-role="custom-report"]')).not.toBeNull()
    expect($('[data-role="report-name"]').getAttribute('error-message')).toMatch(/already exists/)
  })

  it('opens straight into the wizard from its deep link', () => {
    unmount()
    history.replaceState(null, '', '#/reports/categories?view=create-report')
    root.replaceChildren()
    unmount = mount(root)
    expect($('[data-role="custom-report"]')).not.toBeNull()
  })
})
