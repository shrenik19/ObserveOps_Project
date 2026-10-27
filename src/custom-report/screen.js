// Create Custom Report — the wizard. A header with a back arrow, the three steps as a vertical rail,
// and the open step beside it. Rendered by the Report screen in place of its list (an internal view,
// #/reports/categories?view=create-report), so it needs no route of its own.
//
// The header and the rail are hand-built to the product: obs-page-header's title is a fixed 16px
// (the product's is ~20px), and obs-steps has no row-band variant or filled check marker (G60, G61).

import { createWizard } from './wizard.js'
import { renderReportTypeStep } from './reportTypeStep.js'
import { renderCriteriaStep } from './criteriaStep.js'
import { renderPropertiesStep } from './propertiesStep.js'
import { applyPending } from './dom.js'
import './customReport.css'

const STEPS = ['Report Type', 'Report Criteria', 'Report Properties']

export function renderWizard({ categories = [], isTaken = () => false, onSave, onExit } = {}) {
  const wizard = createWizard()

  const el = document.createElement('section')
  el.className = 'custom-report'
  el.dataset.role = 'custom-report'

  const header = document.createElement('header')
  header.className = 'cr-header'
  header.dataset.role = 'report-header'
  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'cr-header__back'
  back.dataset.role = 'report-back'
  back.setAttribute('aria-label', 'Back')
  back.innerHTML = '<obs-icon name="chevronLeft" size="16"></obs-icon>'
  back.addEventListener('click', () => onExit?.())
  const title = document.createElement('h1')
  title.className = 'cr-header__title'
  title.textContent = 'Create Custom Report'

  // The product shows its date range on Report Criteria only.
  const range = document.createElement('obs-date-time-picker')
  range.dataset.role = 'report-range'
  range.setAttribute('kind', 'range-presets')
  range.className = 'cr-header__range'
  header.append(back, title, range)

  // One row per step: done = a filled check (and revisitable), current = an outlined number on a
  // highlighted row, upcoming = a muted outlined number.
  const steps = document.createElement('ol')
  steps.className = 'cr-steps'
  steps.dataset.role = 'report-steps'

  const rail = document.createElement('nav')
  rail.className = 'custom-report__rail'
  rail.setAttribute('aria-label', 'Steps')
  rail.append(steps)

  const content = document.createElement('div')
  content.className = 'custom-report__content'

  const body = document.createElement('div')
  body.className = 'custom-report__body'
  body.append(rail, content)
  el.append(header, body)

  const go = (step) => { if (wizard.go(step)) render() }

  function stepFor(state) {
    if (state.step === 0) return renderReportTypeStep({ onPick: (type) => { wizard.pickType(type); render() } })
    if (state.step === 1) return renderCriteriaStep({ wizard, onPrevious: () => go(0), onNext: () => go(2) })
    return renderPropertiesStep({
      wizard,
      categories,
      isTaken,
      onPrevious: () => go(1),
      onSave: () => onSave?.(wizard.toReport()),
    })
  }

  function renderSteps(state) {
    steps.replaceChildren(...STEPS.map((name, i) => {
      const done = i < state.step
      const row = document.createElement(done ? 'button' : 'div')
      row.className = `cr-step ${done ? 'is-done' : i === state.step ? 'is-current' : 'is-upcoming'}`
      if (done) {
        row.type = 'button'
        row.addEventListener('click', () => go(i))
      }
      if (i === state.step) row.setAttribute('aria-current', 'step')

      const marker = document.createElement('span')
      marker.className = 'cr-step__marker'
      if (done) marker.innerHTML = '<obs-icon name="check" size="14"></obs-icon>'
      else marker.textContent = String(i + 1)

      // "Report Type : SLO" — the choice in bold, as the product shows it.
      const label = document.createElement('span')
      label.className = 'cr-step__label'
      label.append(name)
      if (i === 0 && state.type) {
        const value = document.createElement('strong')
        value.textContent = state.type
        label.append(' : ', value)
      }
      row.append(marker, label)

      const item = document.createElement('li')
      item.append(row)
      return item
    }))
  }

  function render() {
    const state = wizard.state()
    renderSteps(state)
    range.hidden = state.step !== 1
    content.replaceChildren(stepFor(state))
    if (el.isConnected) applyPending(content)
  }

  render()
  el.upgrade = () => applyPending(el)
  el.wizard = wizard
  return el
}
