// Which counters a LAMA profile sends, and how they are aggregated.
//
// The counter list is DERIVED from the Trading API endpoint chosen above it — each endpoint exposes
// its own counters, so the section repopulates whenever that field changes. Three states:
//
//   no endpoint chosen        a hint, no checkboxes
//   a known endpoint          its counters, each with a checkbox
//   an endpoint with no map   a note saying so (the Trading API accepts custom endpoints, and a
//                             custom one has no counters until the backend describes it)
//
// Aggregation is a multi-select: obs-select already renders checkboxes for `multiple`, and
// `allow-select-all` gives "select all" for free.

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
  title.className = 'custom-fields__title'
  title.textContent = 'Counters & Aggregation'
  element.appendChild(title)

  const row = document.createElement('div')
  row.className = 'counters__row'
  element.appendChild(row)

  // --- Counters ---------------------------------------------------------
  const countersField = document.createElement('div')
  countersField.className = 'lama-drawer__field'
  countersField.appendChild(label('Counters'))

  const list = document.createElement('div')
  list.setAttribute('data-role', 'counter-list')
  list.className = 'counters__list'
  countersField.appendChild(list)

  const hint = document.createElement('p')
  hint.setAttribute('data-role', 'counters-hint')
  hint.className = 'counters__hint'
  countersField.appendChild(hint)

  const countersError = document.createElement('p')
  countersError.setAttribute('data-role', 'counters-error')
  countersError.className = 'counters__error'
  countersError.textContent = 'Choose at least one counter.'
  countersError.hidden = true
  countersField.appendChild(countersError)

  row.appendChild(countersField)

  // --- Aggregation ------------------------------------------------------
  const aggField = document.createElement('div')
  aggField.className = 'lama-drawer__field'
  aggField.appendChild(label('Aggregation'))

  const aggregation = document.createElement('obs-select')
  aggregation.setAttribute('data-role', 'counters-aggregation')
  aggregation.setAttribute('multiple', '')
  aggregation.setAttribute('allow-select-all', '')
  aggregation.setAttribute('allow-clear', '')
  aggregation.setAttribute('block', '')
  aggregation.setAttribute('placeholder', 'Select')
  aggregation.dataset.pendingOptions = JSON.stringify(AGGREGATIONS.map((a) => ({ value: a, text: a })))

  let chosenAggregations = []
  aggregation.addEventListener('change', (event) => {
    const next = detailValue(event)
    chosenAggregations = Array.isArray(next) ? next.map(String) : next ? [String(next)] : []
    if (chosenAggregations.length) {
      aggregation.removeAttribute('error')
      // Clear the MESSAGE too, not just the field state — otherwise it sits there contradicting the
      // user's fix until the next submit.
      aggError.hidden = true
    }
  })
  aggField.appendChild(aggregation)

  const aggError = document.createElement('p')
  aggError.setAttribute('data-role', 'aggregation-error')
  aggError.className = 'counters__error'
  aggError.textContent = 'Choose at least one aggregation.'
  aggError.hidden = true
  aggField.appendChild(aggError)

  row.appendChild(aggField)

  let endpoint = ''
  /** Counter name → whether it is ticked. Kept across endpoint changes for counters that survive. */
  let ticked = new Set()

  function renderCounters() {
    list.replaceChildren()
    const counters = countersFor(endpoint)

    if (!endpoint) {
      hint.hidden = false
      hint.textContent = 'Choose a Trading API above to see its counters.'
      return
    }
    if (counters.length === 0) {
      hint.hidden = false
      hint.textContent = `No counters are mapped to ${endpoint}.`
      return
    }

    hint.hidden = true
    for (const name of counters) {
      const box = document.createElement('obs-checkbox')
      box.setAttribute('data-role', 'counter-option')
      box.setAttribute('value', name)
      box.textContent = name
      if (ticked.has(name)) box.setAttribute('checked', '')
      box.addEventListener('change', (event) => {
        // The DS reports the new state; fall back to the attribute for safety.
        const next = detailValue(event)
        const on = typeof next === 'boolean' ? next : box.hasAttribute('checked')
        if (on) ticked.add(name)
        else ticked.delete(name)
        if (ticked.size) countersError.hidden = true
      })
      list.appendChild(box)
    }
  }
  renderCounters()

  /**
   * Point the section at a Trading API endpoint. Ticks for counters that do not exist on the new
   * endpoint are dropped — keeping them would report counters the endpoint cannot produce.
   */
  function setTradingApi(next) {
    endpoint = String(next ?? '')
    const allowed = new Set(countersFor(endpoint))
    ticked = new Set([...ticked].filter((c) => allowed.has(c)))
    renderCounters()
  }

  const selectedCounters = () => countersFor(endpoint).filter((c) => ticked.has(c))

  function value() {
    return { counters: selectedCounters(), aggregations: [...chosenAggregations] }
  }

  /**
   * Both are optional until either is used. Picking counters without saying how to aggregate them —
   * or an aggregation with nothing to aggregate — is incomplete, so each requires the other.
   */
  function validate() {
    const counters = selectedCounters()
    const touched = counters.length > 0 || chosenAggregations.length > 0
    if (!touched) {
      countersError.hidden = true
      aggError.hidden = true
      aggregation.removeAttribute('error')
      return true
    }

    const countersOk = counters.length > 0
    countersError.hidden = countersOk

    const aggOk = chosenAggregations.length > 0
    aggError.hidden = aggOk
    if (aggOk) aggregation.removeAttribute('error')
    else aggregation.setAttribute('error', '')

    // Both evaluated before returning, so one submit marks everything that is missing.
    return countersOk && aggOk
  }

  function reset() {
    ticked = new Set()
    chosenAggregations = []
    countersError.hidden = true
    aggError.hidden = true
    aggregation.removeAttribute('error')
    if (typeof aggregation.value !== 'undefined') aggregation.value = []
    renderCounters()
  }

  /** Object-valued props must be assigned only AFTER the element is in the document. */
  function upgrade() {
    if (aggregation.dataset.pendingOptions) {
      aggregation.options = JSON.parse(aggregation.dataset.pendingOptions)
      delete aggregation.dataset.pendingOptions
    }
  }

  return { element, setTradingApi, value, validate, reset, upgrade }
}
