// Which counters a LAMA profile sends, and how EACH ONE is aggregated.
//
// Every counter — mapped, defaulted or user-chosen — is a ROW, and every row is the same four
// things: a tick box, a counter picker, its own aggregation picker, and the (+)/(x) affordances.
// There is no separate "adder" control any more; (+) is how the list grows. That is what makes this
// section read as the same kind of list as Metadata Fields rather than a shape of its own.
//
// The tick box and the picker answer two different questions, and keeping them apart is the whole
// point: the picker says WHICH counter a row is about, the tick says whether that counter is
// actually being SENT. Choosing a counter is not consent to send it.
//
// The counter picker is the two-pane obs-select — options on the left, the highlighted counter's
// description on the right. An existing row opens showing its OWN counter selected with that
// counter's description, so a row reads the same whether it was just added or was seeded from the
// endpoint map.
//
// Three states, driven by the Trading API chosen above:
//
//   no endpoint chosen   a line of text and nothing else — there is nothing yet to configure
//   a mapped endpoint    one row per mapped counter, each pre-selected, PLUS a trailing row
//                        already holding the next counter the catalogue offers
//   a custom endpoint    a single EMPTY trailing row — nothing is mapped, so nothing is offered
//
// The trailing row is always there. It is the "add the next counter" affordance, and it is visible
// on arrival rather than summoned: (+) grows the list BEYOND it, it does not conjure it.
//
// The aggregation picker is always visible and always drawn as a full dropdown, but is DISABLED
// until its row is TICKED — an aggregation means nothing for a counter that is not being sent. A
// pre-selected counter is an offer, not a choice: it arms nothing on its own and is not reported by
// value() until the box beside it is ticked.

import { augmentSelectDescription } from './augmentSelectDescription.js'
import { createFieldRepeater } from './fieldRepeater.js'
import { catalogueOptions, describeCounter } from './counterCatalogue.js'

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

/**
 * The counter the trailing row opens on, for EVERY Trading API — not whatever the catalogue happens
 * to list first. Which endpoint is selected changes the mapped rows above it; it must not change
 * what the "next counter" row offers.
 */
export const DEFAULT_TRAILING_COUNTER = 'system.cpu.percent'

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

  const hint = document.createElement('p')
  hint.setAttribute('data-role', 'counters-hint')
  hint.className = 'counters__hint'
  hint.textContent = 'Choose a Trading API above to see its counters.'
  element.appendChild(hint)

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
  let repeater = null
  /** True while rows are being built, so seeding a row never counts as a user's pick. */
  let seeding = false
  /** Counters a rebuild is pre-selecting, consumed one per row. */
  let seedQueue = []

  const allRows = () => repeater?.rows() ?? []

  /**
   * Counters already held by some OTHER row, so no two rows can offer the same one.
   * Compared by element: the repeater hands back a COPY of each row api, so object identity on the
   * api itself never matches.
   */
  const takenCounters = (exceptEl) =>
    allRows()
      .filter((row) => row.element !== exceptEl && row.counter())
      .map((row) => row.counter())

  /**
   * The counter a trailing or newly added row opens on.
   *
   * It is DEFAULT_TRAILING_COUNTER for every endpoint. The one exception is an endpoint that already
   * maps that counter — /metrics/hardware leads with it — where a second row holding it would send
   * the same counter twice; there the row falls back to the first counter no row is using. With
   * nothing left to offer, it opens empty.
   */
  function defaultCounter() {
    const taken = takenCounters(null)
    if (!taken.includes(DEFAULT_TRAILING_COUNTER)) return DEFAULT_TRAILING_COUNTER
    const [first] = catalogueOptions(taken)
    return first ? first.value : ''
  }

  function applyPendingOptions(scope = element) {
    for (const el of scope.querySelectorAll('obs-select[data-pending-options]')) {
      el.options = JSON.parse(el.dataset.pendingOptions)
      delete el.dataset.pendingOptions
    }
  }

  /** Re-offer every counter no row is using, so a removed one becomes selectable again. */
  function refreshCounterOptions() {
    for (const row of allRows()) row.refreshOptions()
  }

  function renderRow({ counter = '' } = {}) {
    const rowEl = document.createElement('div')
    rowEl.setAttribute('data-role', 'counter-row')
    rowEl.className = 'counters__pair'

    let chosen = String(counter ?? '')
    let armed = false
    let aggregations = []
    /** Set while a value is assigned programmatically, so it is never mistaken for a pick. */
    let applying = false

    // --- the tick box ------------------------------------------------------
    // Ticking a row is what opts its counter in and unlocks its aggregation. Choosing a counter in
    // the dropdown only says WHICH counter the row is about.
    const counterCell = document.createElement('div')
    counterCell.className = 'counters__counter'

    const box = document.createElement('obs-checkbox')
    box.setAttribute('data-role', 'counter-check')

    // --- the counter picker ------------------------------------------------
    const pick = document.createElement('obs-select')
    pick.setAttribute('data-role', 'counter-option')
    pick.setAttribute('block', '')
    pick.setAttribute('placeholder', 'Select Counter')
    // Two-pane picker: options left, the highlighted counter's description right. obs-select reads
    // that pane from each option's `description` key — established by rendering, since the registry
    // documents the prop only in a changelog line.
    pick.setAttribute('use-after-menu-description', '')
    // NO `can-user-add-options`: counters come from the catalogue only, so the DS's inline "+" — and
    // the augmentAddableSelect workaround that made it fire — are deliberately absent here. The
    // Trading API field above still uses both.

    // --- the aggregation picker --------------------------------------------
    const aggWrap = document.createElement('div')
    aggWrap.className = 'counters__agg'

    const agg = document.createElement('obs-select')
    agg.setAttribute('data-role', 'counter-aggregation')
    agg.setAttribute('multiple', '')
    agg.setAttribute('allow-select-all', '')
    agg.setAttribute('allow-clear', '')
    agg.setAttribute('block', '')
    agg.setAttribute('placeholder', 'Select')
    agg.dataset.pendingOptions = JSON.stringify(AGGREGATIONS.map((a) => ({ value: a, text: a })))

    // A `multiple` obs-select that is `disabled` renders a bare <div class="pills"> — no trigger,
    // no border, no chevron (docs/DS-GAPS.md G29). This chevron is drawn by the consumer so a
    // disabled aggregation still reads as a dropdown that simply will not open. CSS hides it once
    // the field is enabled and the component's own trigger takes over.
    const chevron = document.createElement('obs-icon')
    chevron.setAttribute('data-role', 'aggregation-chevron')
    chevron.setAttribute('name', 'chevronDown')
    chevron.setAttribute('size', '13')
    chevron.setAttribute('aria-hidden', 'true')
    aggWrap.append(agg, chevron)

    /** obs-checkbox carries no visible text here — the dropdown beside it names the counter. */
    function syncBoxLabel() {
      box.setAttribute('aria-label', chosen ? `Select ${chosen}` : 'Select this counter')
    }

    function setArmed(next) {
      armed = next
      if (next) box.setAttribute('checked', '')
      else box.removeAttribute('checked')
      aggWrap.dataset.disabled = String(!next)
      if (next) {
        agg.removeAttribute('disabled')
      } else {
        agg.setAttribute('disabled', '')
        // A row that is not opted in cannot be in breach, so drop any mark it was carrying.
        agg.removeAttribute('error')
      }
    }

    /** The catalogue minus what other rows hold, plus this row's own counter so it stays visible
     *  as the selected option rather than vanishing from its own list. */
    function optionsFor() {
      const options = catalogueOptions(takenCounters(rowEl))
      if (chosen && !options.some((o) => o.value === chosen)) {
        options.unshift({ value: chosen, text: chosen, description: describeCounter(chosen) })
      }
      return options
    }

    pick.dataset.pendingOptions = JSON.stringify(optionsFor())
    if (chosen) pick.setAttribute('value', chosen)

    pick.addEventListener('change', (event) => {
      if (applying) return
      const next = String(detailValue(event) ?? '')
      if (!next) return
      chosen = next
      pick.setAttribute('value', next)
      syncBoxLabel()
      refreshCounterOptions()
      if (everySelectedHasAggregation()) summaryError.hidden = true
    })

    agg.addEventListener('change', (event) => {
      const next = detailValue(event)
      aggregations = Array.isArray(next) ? next.map(String) : next ? [String(next)] : []
      if (aggregations.length) {
        agg.removeAttribute('error')
        if (everySelectedHasAggregation()) summaryError.hidden = true
      }
    })

    box.addEventListener('change', (event) => {
      const next = detailValue(event)
      setArmed(typeof next === 'boolean' ? next : box.hasAttribute('checked'))
      if (everySelectedHasAggregation()) summaryError.hidden = true
    })

    counterCell.append(box, pick)
    rowEl.append(counterCell, aggWrap)
    syncBoxLabel()
    setArmed(false)
    // Opening a row that already holds a counter must show THAT counter's description, not a hint
    // (item 3). The DS fills its pane from hover alone, so the selected option is nudged for it.
    augmentSelectDescription({ select: pick })

    return {
      element: rowEl,
      box,
      pick,
      agg,
      counter: () => chosen,
      isArmed: () => armed,
      aggregations: () => [...aggregations],
      markError: (on) => {
        if (on) agg.setAttribute('error', '')
        else agg.removeAttribute('error')
      },
      refreshOptions: () => {
        const options = optionsFor()
        if (pick.dataset.pendingOptions) pick.dataset.pendingOptions = JSON.stringify(options)
        else pick.options = options
      },
      /** Assign the selected value AFTER options exist, or the component has nothing to match. */
      applyValue: () => {
        if (!chosen) return
        applying = true
        pick.value = chosen
        applying = false
      },
    }
  }

  /** Rebuild the list for the current endpoint. `seeds` are the counters to pre-select. */
  function build(seeds) {
    list.replaceChildren()
    seeding = true
    seedQueue = [...seeds]

    repeater = createFieldRepeater({
      mount: list,
      name: 'counters',
      addLabel: 'Add counter',
      removeLabel: 'Remove counter',
      renderRow: () => {
        // Seeded rows take their mapped counter.
        if (seedQueue.length) return renderRow({ counter: seedQueue.shift() })
        // The trailing row, built with the rest: pre-filled with a default counter when the
        // endpoint mapped some (item 4), left empty when it mapped none (item 5).
        if (seeding) return renderRow({ counter: seeds.length ? defaultCounter() : '' })
        // Anything added later with (+) pre-fills too.
        return renderRow({ counter: defaultCounter() })
      },
      onChange: () => {
        if (seeding) return
        refreshCounterOptions()
        // A row added with (+) arrives AFTER the initial upgrade pass, so its own options and value
        // have never been handed to the component — without this its dropdown opens empty while
        // every seeded row beside it is full. Applying here keeps a new row identical to a seeded
        // one from its first open.
        applyPendingOptions(list)
        for (const row of allRows()) row.applyValue()
      },
    })

    // One row per mapped counter, PLUS a trailing row that is always present. The next counter is
    // meant to be visible and ready without the user having to click (+) to reveal it — (+) is for
    // the row after that.
    for (let i = 0; i < seeds.length + 1; i += 1) repeater.addRow()

    seeding = false
    seedQueue = []
    refreshCounterOptions()
    applyPendingOptions(list)
    for (const row of allRows()) row.applyValue()
  }

  function renderCounters() {
    // Nothing to configure yet: a line of text, and no controls at all.
    if (!endpoint) {
      hint.hidden = false
      head.hidden = true
      list.replaceChildren()
      repeater = null
      return
    }

    hint.hidden = true
    head.hidden = false
    build(countersFor(endpoint))
  }
  renderCounters()

  /**
   * Point the section at a Trading API endpoint. The list is rebuilt from that endpoint's map, so
   * counters the new endpoint cannot produce are gone rather than lingering.
   */
  function setTradingApi(next) {
    endpoint = String(next ?? '')
    renderCounters()
  }

  /** Rows the user actually opted into, in row order. */
  const armedRows = () => allRows().filter((row) => row.isArmed() && row.counter())

  const everySelectedHasAggregation = () => armedRows().every((row) => row.aggregations().length > 0)

  function value() {
    return {
      counters: armedRows().map((row) => ({
        name: row.counter(),
        aggregations: row.aggregations(),
      })),
    }
  }

  /** Every opted-in counter needs at least one aggregation. Unarmed rows are not evaluated. */
  function validate() {
    let ok = true
    for (const row of allRows()) {
      const breach = row.isArmed() && Boolean(row.counter()) && row.aggregations().length === 0
      row.markError(breach)
      if (breach) ok = false
    }
    summaryError.hidden = ok
    return ok
  }

  function reset() {
    summaryError.hidden = true
    renderCounters()
  }

  function upgrade() {
    applyPendingOptions()
    for (const row of allRows()) row.applyValue()
  }

  return { element, setTradingApi, value, validate, reset, upgrade }
}
