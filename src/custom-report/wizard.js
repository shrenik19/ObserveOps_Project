// The Create Custom Report wizard's state: which step is open, the SLO query, the report's
// properties. No DOM, no DS — the step renderers read state() and call these setters.

import { CLICKABLE, countersFor, SLO_TYPES, SOURCE_FILTERS, WIDGET_TYPES, ORIENTATIONS } from './catalogue.js'

const emptyRow = () => ({ counter: '', aggregation: 'Last' })
// The first row starts on achieved percent of the SLO Type's family (user-specified default).
const firstRow = (sloType) => ({ counter: countersFor(sloType)[0], aggregation: 'Last' })

export function createWizard() {
  const s = {
    step: 0,
    type: '',
    widgetType: 'Grid',
    view: 'area',
    fontSize: 'Small',
    query: { sloType: 'SLO', rows: [firstRow('SLO')], sourceFilter: '', sources: [] },
    props: { name: '', description: '', category: '', orientation: 'Auto', schedule: false },
  }

  const copy = () => structuredClone(s)

  function criteriaErrors() {
    const errors = {}
    s.query.rows.forEach((r, i) => { if (!r.counter) errors[`counter-${i}`] = 'Select a Counter' })
    if (!s.query.sourceFilter) errors['source-filter'] = 'Select a Source Filter'
    return errors
  }

  const canLeave = (step) => (step === 0 ? Boolean(s.type) : step === 1 ? !Object.keys(criteriaErrors()).length : true)

  return {
    state: copy,
    criteriaErrors,

    pickType(type) {
      if (!CLICKABLE.has(type)) return
      s.type = type
      s.step = 1
    },

    setWidgetType(w) { if (WIDGET_TYPES.includes(w)) s.widgetType = w },
    setView(v) { s.view = v },
    setFontSize(f) { s.fontSize = f },

    // A counter belongs to one SLO Type's family, so a type change resets every row: the first to the
    // family's default, the rest to empty.
    setSloType(t) {
      if (!SLO_TYPES.includes(t) || t === s.query.sloType) return
      s.query.sloType = t
      s.query.rows = s.query.rows.map((_, i) => (i === 0 ? firstRow(t) : emptyRow()))
    },
    setCounter(i, c) {
      if (!s.query.rows[i]) return
      s.query.rows[i].counter = countersFor(s.query.sloType).includes(c) ? c : ''
    },
    addRow() { s.query.rows.push(emptyRow()) },
    removeRow(i) { if (s.query.rows.length > 1) s.query.rows.splice(i, 1) },

    // The sources are SLOs of the filter's kind, so a new filter invalidates them.
    setSourceFilter(f) {
      const next = SOURCE_FILTERS.includes(f) ? f : ''
      if (next !== s.query.sourceFilter) s.query.sources = []
      s.query.sourceFilter = next
    },
    setSources(list) { s.query.sources = [...list] },

    // Forward only past complete steps; back always.
    go(step) {
      if (step > s.step && !Array.from({ length: step - s.step }, (_, k) => canLeave(s.step + k)).every(Boolean)) return false
      s.step = step
      return true
    },

    setProps(patch) {
      Object.assign(s.props, patch)
      if (!ORIENTATIONS.includes(s.props.orientation)) s.props.orientation = 'Auto'
    },
    propsErrors(isTaken = () => false) {
      const errors = {}
      const name = s.props.name.trim()
      if (!name) errors.name = 'Report Name is required'
      else if (isTaken(name)) errors.name = 'A report with this name already exists'
      if (!s.props.category) errors.category = 'Select a Report Category'
      return errors
    },

    toReport() {
      return {
        name: s.props.name.trim(),
        description: s.props.description.trim(),
        category: s.props.category,
        type: 'SLO',
        reportType: 'Custom',
        schedule: Boolean(s.props.schedule),
        orientation: s.props.orientation,
        criteria: {
          widgetType: s.widgetType,
          view: s.widgetType === 'Top N' ? s.view : undefined,
          fontSize: s.fontSize,
          ...structuredClone(s.query),
        },
      }
    },
  }
}
