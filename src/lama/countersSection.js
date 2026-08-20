// Which counters a LAMA profile sends, and how EACH ONE is aggregated.
//
// The counter list is DERIVED from the Trading API endpoint chosen above it. Three states:
//
//   no endpoint chosen   a line of text and nothing else — there is nothing yet to configure
//   a mapped endpoint    one row per mapped counter, plus a "Select Counter" adder at the bottom
//   a custom endpoint    no mapped counters, so just the adder — the user names their own
//
// Every counter row carries its OWN aggregation picker, always visible but DISABLED until that
// counter is ticked, because an aggregation means nothing for a counter that is not being sent.
// The adder row has no aggregation beside it: it is a control for adding counters, not a counter.

import { augmentAddableSelect } from './augmentAddableSelect.js'
import { catalogueOptions } from './counterCatalogue.js'

/** Endpoint → the counters it exposes. */
export const COUNTERS_BY_ENDPOINT = {
  '/metrics/application': ['throughput', 'latency', 'historicalThroughput', 'historicalLatency'],
  '/metrics/hardware': [
    'system.cpu.percent',
    'system.memory.used.percent',
    'system.disk.used.percent',
    'system.uptime.percent',
  ],
  '/metrics/database': [
    'replication.status',
    'replication.queue.size',
    'replication.bandwidth',
    'replication.latency',
  ],
  '/metrics/network': [
    'network.bandwidth.utilization',
    'network.latency.ms',
    'network.packet.error.count',
  ],
  '/metrics/cap-utilization': ['benchmark', 'peakOrder'],
}

export const AGGREGATIONS = ['Avg', 'Min', 'Max', 'Median', 'Sum', 'Count', 'Last']

export const countersFor = (endpoint) => COUNTERS_BY_ENDPOINT[endpoint] ?? []

/** DS events wrap their value in an array — unwrap, tolerating a bare value. */
function detailValue(event) {
  const { detail } = event
  if (Array.isArray(detail)) return detail[0]
  if (detail !== undefined && detail !== null) return detail
  return event.target?.value
}

function label(text) {
  const el = document.createElement('span')
  el.className = 'lama-drawer__field-label'
  el.textContent = text
  return el
}

export function renderCountersSection() {
  const element = document.createElement('section')
  element.className = 'counters'
  element.setAttribute('data-role', 'counters-section')

  const title = document.createElement('h3')
  title.setAttribute('data-role', 'counters-title')
  title.className = 'section-title'
  title.textContent = 'Counters & Aggregation'
  element.appendChild(title)

  const head = document.createElement('div')
  head.className = 'counters__head'
  head.append(label('Counters'), label('Aggregation'))
  element.appendChild(head)

  const list = document.createElement('div')
  list.setAttribute('data-role', 'counter-list')
  list.className = 'counters__list'
  element.appendChild(list)

  const summaryError = document.createElement('p')
  summaryError.setAttribute('data-role', 'counters-error')
  summaryError.className = 'counters__error'
  summaryError.textContent = 'Choose an aggregation for every selected counter.'
  summaryError.hidden = true
  element.appendChild(summaryError)

  let endpoint = ''
  /** counter name → { ticked, aggregations } */
  const state = new Map()
  /** endpoint → counters the user added themselves, beyond whatever the map provides. */
  const added = new Map()

  const stateFor = (name) => {
    if (!state.has(name)) state.set(name, { ticked: false, aggregations: [] })
    return state.get(name)
  }

  /** Mapped counters first, then anything the user has added for this endpoint. */
  const countersShown = () => [...countersFor(endpoint), ...(added.get(endpoint) ?? [])]

  const selects = new Map()

  function applyPendingOptions() {
    for (const el of list.querySelectorAll('obs-select[data-pending-options]')) {
      el.options = JSON.parse(el.dataset.pendingOptions)
      delete el.dataset.pendingOptions
    }
  }

  function addCounter(name) {
    const clean = String(name ?? '').trim()
    if (!clean) return
    if (countersShown().includes(clean)) return
    added.set(endpoint, [...(added.get(endpoint) ?? []), clean])
    renderCounters()
  }

  /** The "Select Counter" control. No aggregation sits beside it — it is not a counter. */
  function renderAdder() {
    const row = document.createElement('div')
    row.setAttribute('data-role', 'counter-adder-row')
    row.className = 'counters__row counters__row--adder'

    const adder = document.createElement('obs-select')
    adder.setAttribute('data-role', 'counter-adder')
    adder.setAttribute('block', '')
    adder.setAttribute('placeholder', 'Select Counter')
    // A counter that is not in the map has to be named by the user, so the select must accept new
    // values. The DS renders the "+" but never reports it — augmentAddableSelect wires it (G27).
    adder.setAttribute('can-user-add-options', '')
    adder.setAttribute('add-label', 'counter')
    // Two-pane picker: the option list on the left, the highlighted counter's description on the
    // right. obs-select reads that pane from each option's `description` key — established by
    // rendering, since the registry documents this prop only in a changelog line.
    adder.setAttribute('use-after-menu-description', '')
    // The catalogue minus whatever is already on screen; a name outside it can still be typed.
    adder.dataset.pendingOptions = JSON.stringify(catalogueOptions(countersShown()))
    row.appendChild(adder)

    // Both a picked option and an added one arrive as `change`.
    adder.addEventListener('change', (event) => addCounter(detailValue(event)))

    list.appendChild(row)
    augmentAddableSelect({ select: adder })
  }

  function renderCounters() {
    list.replaceChildren()
    selects.clear()

    // Nothing to configure yet: a line of text, and no controls at all.
    if (!endpoint) {
      head.hidden = true
      const note = document.createElement('p')
      note.setAttribute('data-role', 'counters-hint')
      note.className = 'counters__hint'
      note.textContent = 'Choose a Trading API above to see its counters.'
      list.appendChild(note)
      return
    }

    head.hidden = false

    for (const name of countersShown()) {
      const own = stateFor(name)

      const row = document.createElement('div')
      row.setAttribute('data-role', 'counter-row')
      row.dataset.counter = name
      row.className = 'counters__row'

      const box = document.createElement('obs-checkbox')
      box.setAttribute('data-role', 'counter-option')
      box.setAttribute('value', name)
      box.textContent = name
      if (own.ticked) box.setAttribute('checked', '')
      row.appendChild(box)

      const agg = document.createElement('obs-select')
      agg.setAttribute('data-role', 'counter-aggregation')
      agg.setAttribute('multiple', '')
      agg.setAttribute('allow-select-all', '')
      agg.setAttribute('allow-clear', '')
      agg.setAttribute('block', '')
      agg.setAttribute('placeholder', 'Select')
      agg.dataset.pendingOptions = JSON.stringify(AGGREGATIONS.map((a) => ({ value: a, text: a })))
      if (!own.ticked) agg.setAttribute('disabled', '')
      row.appendChild(agg)

      agg.addEventListener('change', (event) => {
        const next = detailValue(event)
        own.aggregations = Array.isArray(next) ? next.map(String) : next ? [String(next)] : []
        if (own.aggregations.length) {
          agg.removeAttribute('error')
          if (everySelectedHasAggregation()) summaryError.hidden = true
        }
      })

      box.addEventListener('change', (event) => {
        const next = detailValue(event)
        own.ticked = typeof next === 'boolean' ? next : box.hasAttribute('checked')
        if (own.ticked) {
          agg.removeAttribute('disabled')
        } else {
          agg.setAttribute('disabled', '')
          // An unticked counter cannot be in breach, so drop any mark it was carrying.
          agg.removeAttribute('error')
        }
        if (everySelectedHasAggregation()) summaryError.hidden = true
      })

      selects.set(name, { box, agg, own })
      list.appendChild(row)
    }

    renderAdder()
    applyPendingOptions()
  }
  renderCounters()

  /**
   * Point the section at a Trading API endpoint. State for counters this endpoint does not show is
   * dropped — keeping it would report counters the endpoint cannot produce.
   */
  function setTradingApi(next) {
    endpoint = String(next ?? '')
    renderCounters()
    const allowed = new Set(countersShown())
    for (const name of [...state.keys()]) if (!allowed.has(name)) state.delete(name)
  }

  const selectedCounters = () => countersShown().filter((name) => stateFor(name).ticked)

  const everySelectedHasAggregation = () =>
    selectedCounters().every((name) => stateFor(name).aggregations.length > 0)

  function value() {
    return {
      counters: selectedCounters().map((name) => ({
        name,
        aggregations: [...stateFor(name).aggregations],
      })),
    }
  }

  /** Every ticked counter needs at least one aggregation. Unticked rows are not evaluated. */
  function validate() {
    let ok = true
    for (const [name, { agg }] of selects) {
      const own = stateFor(name)
      if (own.ticked && own.aggregations.length === 0) {
        agg.setAttribute('error', '')
        ok = false
      } else {
        agg.removeAttribute('error')
      }
    }
    summaryError.hidden = ok
    return ok
  }

  function reset() {
    state.clear()
    added.clear()
    summaryError.hidden = true
    renderCounters()
  }

  const upgrade = () => applyPendingOptions()

  return { element, setTradingApi, value, validate, reset, upgrade }
}
