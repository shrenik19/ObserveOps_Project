// Step 3 — Report Properties, as in the product: Name* | Description, Category* | Orientation,
// Schedule — two columns, then Previous and Save & Exit.

import { ORIENTATIONS } from './catalogue.js'
import { field, select, segmented, button, setError, detailValue, valueOf } from './dom.js'

function input(role, placeholder, value) {
  const el = document.createElement('obs-input')
  el.dataset.role = role
  el.setAttribute('block', '')
  el.setAttribute('placeholder', placeholder)
  if (value) el.setAttribute('value', value)
  return el
}

export function renderPropertiesStep({ wizard, categories, isTaken, onPrevious, onSave }) {
  const { props } = wizard.state()
  const el = document.createElement('section')
  el.className = 'properties-step'
  el.dataset.role = 'properties-step'

  const name = input('report-name', 'Name', props.name)
  const description = input('report-description', 'Description', props.description)
  const category = select('report-category', categories.map((c) => ({ value: c.id, text: c.name })), { value: props.category })
  const orientation = segmented('report-orientation', ORIENTATIONS, props.orientation)
  const schedule = document.createElement('obs-switch')
  schedule.dataset.role = 'report-schedule'
  schedule.setAttribute('checked-text', 'ON')
  schedule.setAttribute('unchecked-text', 'OFF')
  if (props.schedule) schedule.setAttribute('checked', '')

  // Typing keeps the wizard current, so Previous / Next round-trips lose nothing.
  const typed = (control, key) => control.addEventListener('input', () => {
    wizard.setProps({ [key]: String(valueOf(control)) })
    if (key === 'name') setError(control)
  })
  typed(name, 'name')
  typed(description, 'description')
  category.addEventListener('change', (e) => { wizard.setProps({ category: detailValue(e) ?? valueOf(category) }); setError(category) })
  orientation.addEventListener('change', (e) => wizard.setProps({ orientation: detailValue(e) ?? valueOf(orientation) }))
  schedule.addEventListener('change', (e) => wizard.setProps({ schedule: Boolean(detailValue(e) ?? schedule.checked) }))

  const grid = document.createElement('div')
  grid.className = 'properties-step__grid'
  const cell = (node, col) => { node.style.gridColumn = String(col); grid.append(node) }
  cell(field('Report Name', name, { required: true }), 1)
  cell(field('Report Description', description), 2)
  cell(field('Report Category', category, { required: true }), 1)
  cell(field('Report Orientation', orientation), 2)
  cell(field('Schedule', schedule), 1)

  // The product's footer: a filled grey Previous beside the step's main action.
  const prev = button('prev', 'Previous', 'neutral-lightest')
  const save = button('save-exit', 'Save & Exit')
  prev.addEventListener('click', () => onPrevious?.())
  save.addEventListener('click', () => {
    const errors = wizard.propsErrors(isTaken)
    setError(name, errors.name ?? '')
    setError(category, errors.category ?? '')
    if (Object.keys(errors).length) return
    onSave?.()
  })
  const footer = document.createElement('div')
  footer.className = 'custom-report__footer'
  footer.append(prev, save)

  el.append(grid, footer)
  return el
}
