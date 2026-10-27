// Step 2 — Report Criteria for SLO: Widget Type, the SLO query (as in the dashboard's Create Widget),
// and the live preview with its Properties panel. Every change goes through the wizard, then the
// step rebuilds its query and preview from wizard.state().

import { SLO_TYPES, countersFor, AGGREGATIONS, SOURCE_FILTERS, WIDGET_TYPES, sourcesFor } from './catalogue.js'
import { field, select, segmented, button, applyPending, setError, detailValue, valueOf } from './dom.js'
import { renderPreview } from './preview.js'

// A multi-select reports its value as an array or a comma string, depending on the event.
const listOf = (v) => (Array.isArray(v) ? v : String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean))

export function renderCriteriaStep({ wizard, onPrevious, onNext }) {
  const el = document.createElement('section')
  el.className = 'criteria-step'
  el.dataset.role = 'criteria-step'

  const widgetType = segmented('widget-type', WIDGET_TYPES, wizard.state().widgetType)
  widgetType.addEventListener('change', (e) => { wizard.setWidgetType(detailValue(e) ?? valueOf(widgetType)); refreshPreview() })

  // One plain row of fields, as in the product's report criteria (not Create Widget's striped panel).
  const grid = document.createElement('div')
  grid.className = 'slo-query'

  const previewArea = document.createElement('div')
  previewArea.className = 'criteria-step__preview'

  // The product's footer: a filled grey Previous beside the step's main action.
  const prev = button('prev', 'Previous', 'neutral-lightest')
  const next = button('next', 'Next', 'primary')
  prev.addEventListener('click', () => onPrevious?.())
  next.addEventListener('click', () => {
    const errors = wizard.criteriaErrors()
    if (Object.keys(errors).length) return markErrors(errors)
    onNext?.()
  })
  const footer = document.createElement('div')
  footer.className = 'custom-report__footer'
  footer.append(prev, next)

  el.append(field('Widget Type', widgetType), grid, previewArea, footer)

  const onChange = (control, apply) =>
    control.addEventListener('change', (e) => { apply(detailValue(e) ?? valueOf(control)); refresh() })

  // Row 0 carries every field, captioned; added rows carry Counter + Aggregation only, uncaptioned,
  // in the same grid columns so their edges sit under the first row's.
  function buildQuery() {
    const { query: q } = wizard.state()
    grid.replaceChildren()
    const counters = countersFor(q.sloType)
    const place = (node, col) => { node.style.gridColumn = String(col); grid.append(node) }

    q.rows.forEach((row, i) => {
      const counter = select(`counter-${i}`, counters, { value: row.counter, placeholder: 'Select Counter' })
      const aggregation = select(`aggregation-${i}`, AGGREGATIONS, { value: row.aggregation })
      onChange(counter, (v) => wizard.setCounter(i, v))
      const last = i === q.rows.length - 1

      if (i === 0) {
        const sloType = select('slo-type', SLO_TYPES, { value: q.sloType })
        const sourceFilter = select('source-filter', SOURCE_FILTERS, { value: q.sourceFilter })
        // Always an empty box, as in the product; its list fills once a Source Filter is picked.
        // One space: obs-select falls back to "Select" for an empty placeholder.
        const source = select('source', sourcesFor(q.sourceFilter), { multiple: true, placeholder: ' ' })
        if (q.sources.length) source.setAttribute('value', q.sources.join(','))
        onChange(sloType, (v) => wizard.setSloType(v))
        onChange(sourceFilter, (v) => wizard.setSourceFilter(v))
        // Read the host for a multi-select: its event may carry only the item just toggled.
        source.addEventListener('change', () => { wizard.setSources(listOf(source.value)); refreshPreview() })

        place(field('SLO Type', sloType), 1)
        place(field('Counter', counter, { required: true }), 2)
        place(field('Aggregation', aggregation, { required: true }), 3)
        place(field('Source Filter', sourceFilter, { required: true }), 4)
        place(field('Source', source), 5)
        if (last) place(rowActions(i, false), 6)
        return
      }

      place(counter, 2)
      place(aggregation, 3)
      place(rowActions(i, last), 4)
    })
  }

  function rowActions(i, withAdd) {
    const wrap = document.createElement('div')
    wrap.className = 'slo-query__actions'
    if (i > 0) {
      const remove = button(`remove-row-${i}`, '', 'transparent')
      remove.setAttribute('squared', '')
      remove.setAttribute('aria-label', 'Remove counter')
      remove.innerHTML = '<obs-icon name="timesCircle" size="20"></obs-icon>'
      remove.classList.add('slo-query__remove')
      remove.addEventListener('click', () => { wizard.removeRow(i); refresh() })
      wrap.append(remove)
    }
    if (withAdd || i === 0) {
      const add = button('add-row', '', 'transparent')
      add.dataset.row = String(i)
      add.setAttribute('squared', '')
      add.setAttribute('aria-label', 'Add counter')
      add.innerHTML = '<obs-icon name="plusCircle" size="20"></obs-icon>'
      add.addEventListener('click', () => { wizard.addRow(); refresh() })
      wrap.append(add)
    }
    return wrap
  }

  function markErrors(errors) {
    for (const control of grid.querySelectorAll('obs-select')) setError(control, errors[control.dataset.role] ?? '')
  }

  function refreshPreview() {
    previewArea.replaceChildren(renderPreview({ wizard, onChange: refreshPreview }))
    if (el.isConnected) applyPending(previewArea)
  }

  function refresh() {
    buildQuery()
    if (el.isConnected) applyPending(grid)
    refreshPreview()
  }

  refresh()
  return el
}
