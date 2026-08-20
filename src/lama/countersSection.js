// Which counters a LAMA profile sends, and how EACH ONE is aggregated.
//
// The counter list is DERIVED from the Trading API endpoint chosen above it — each endpoint exposes
// its own counters, so the section repopulates whenever that field changes. Three states:
//
//   no endpoint chosen        a hint, no rows
//   a known endpoint          one row per counter
//   an endpoint with no map   a note saying so (the Trading API accepts custom endpoints, and a
//                             custom one has no counters until the backend describes it)
//
// Every counter carries its OWN aggregation picker. The picker is always visible — so the choice on
// offer is never hidden — but is DISABLED until its counter is ticked, because an aggregation means
// nothing for a counter that is not being sent.

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

  const hint = document.createElement('p')
  hint.setAttribute('data-role', 'counters-hint')
  hint.className = 'counters__hint'
  element.appendChild(hint)

  const summaryError = document.createElement('p')
  summaryError.setAttribute('data-role', 'counters-error')
  summaryError.className = 'counters__error'
  summaryError.textContent = 'Choose an aggregation for every selected counter.'
  summaryError.hidden = true
  element.appendChild(summaryError)

  let endpoint = ''
  /** counter name → { ticked, aggregations } — kept across re-renders of the same endpoint. */
  const state = new Map()

  const stateFor = (name) => {
    if (!state.has(name)) state.set(name, { ticked: false, aggregations: [] })
    return state.get(name)
  }

  /** Every row's aggregation select, so validation and upgrading can reach them. */
  const selects = new Map()

  function applyPendingOptions() {
    for (const el of list.querySelectorAll('obs-select[data-pending-options]')) {
      el.options = JSON.parse(el.dataset.pendingOptions)
      delete el.dataset.pendingOptions
    }
  }

  function renderCounters() {
    list.replaceChildren()
    selects.clear()
    const counters = countersFor(endpoint)

    if (!endpoint) {
      head.hidden = true
      hint.hidden = false
      hint.textContent = 'Choose a Trading API above to see its counters.'
      return
    }
    if (counters.length === 0) {
      head.hidden = true
      hint.hidden = false
      hint.textContent = `No counters are mapped to ${endpoint}.`
      return
    }

    head.hidden = false
    hint.hidden = true

    for (const name of counters) {
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
      // Visible but inert until its counter is ticked.
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

    applyPendingOptions()
  }
  renderCounters()

  /**
   * Point the section at a Trading API endpoint. State for counters the new endpoint does not
   * expose is dropped — keeping it would report counters the endpoint cannot produce.
   */
  function setTradingApi(next) {
    endpoint = String(next ?? '')
    const allowed = new Set(countersFor(endpoint))
    for (const name of [...state.keys()]) if (!allowed.has(name)) state.delete(name)
    renderCounters()
  }

  const selectedCounters = () => countersFor(endpoint).filter((name) => stateFor(name).ticked)

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
    summaryError.hidden = true
    renderCounters()
  }

  /** Object-valued props must be assigned only AFTER the elements are in the document. */
  const upgrade = () => applyPendingOptions()

  return { element, setTradingApi, value, validate, reset, upgrade }
}
