import { describe, it, expect } from 'vitest'
import {
  renderCountersSection,
  countersFor,
  COUNTERS_BY_ENDPOINT,
  AGGREGATIONS,
  DEFAULT_TRAILING_COUNTER,
} from './countersSection.js'

const build = () => {
  const s = renderCountersSection()
  s.upgrade()
  return s
}

const q = (s, role) => s.element.querySelector(`[data-role="${role}"]`)
const rows = (s) => [...s.element.querySelectorAll('[data-role="counter-row"]')]
const pickIn = (row) => row.querySelector('[data-role="counter-option"]')
const aggIn = (row) => row.querySelector('[data-role="counter-aggregation"]')
const aggWrapIn = (row) => row.querySelector('.counters__agg')
const boxIn = (row) => row.querySelector('[data-role="counter-check"]')
const chevronIn = (row) => row.querySelector('[data-role="aggregation-chevron"]')
const hint = (s) => q(s, 'counters-hint')
const summaryError = (s) => q(s, 'counters-error')

/** What each row's counter picker is showing, whether seeded or picked. */
const shown = (s) => rows(s).map((r) => pickIn(r).getAttribute('value') ?? '')

/** The row's own options, wherever they currently live. */
const optionsOf = (row) => {
  const el = pickIn(row)
  return el.dataset.pendingOptions ? JSON.parse(el.dataset.pendingOptions) : el.options ?? []
}
const optionNames = (row) => optionsOf(row).map((o) => o.value)

/** Choosing WHICH counter a row is about. On its own this opts nothing in. */
const pickCounter = (row, name) =>
  pickIn(row).dispatchEvent(new CustomEvent('change', { detail: [name] }))

/** Ticking the box — the gesture that opts the row in and unlocks its aggregation. */
const tick = (row, on = true) => {
  const box = boxIn(row)
  if (on) box.setAttribute('checked', '')
  else box.removeAttribute('checked')
  box.dispatchEvent(new CustomEvent('change', { detail: [on] }))
}

const chooseAgg = (row, list) =>
  aggIn(row).dispatchEvent(new CustomEvent('change', { detail: [list] }))

/** The repeater's affordances, scoped to this section's own level. */
const addButtons = (s) => [...s.element.querySelectorAll('[data-role="repeater-add"]')]
const removeButtons = (s) => [...s.element.querySelectorAll('[data-role="repeater-remove"]')]
const clickAdd = (s) => addButtons(s).at(-1).dispatchEvent(new MouseEvent('click', { bubbles: true }))
const clickRemove = (s, index) =>
  removeButtons(s)[index].dispatchEvent(new MouseEvent('click', { bubbles: true }))

describe('the counter map', () => {
  it('covers all five endpoints', () => {
    expect(Object.keys(COUNTERS_BY_ENDPOINT)).toEqual([
      '/metrics/application',
      '/metrics/hardware',
      '/metrics/database',
      '/metrics/network',
      '/metrics/cap-utilization',
    ])
  })

  it('maps cap-utilization to its two counters', () => {
    expect(countersFor('/metrics/cap-utilization')).toEqual(['benchmark', 'peakOrder'])
  })

  it('offers the seven aggregations', () => {
    expect(AGGREGATIONS).toEqual(['Avg', 'Min', 'Max', 'Median', 'Sum', 'Count', 'Last'])
  })
})

describe('state 1 — no Trading API chosen', () => {
  it('shows the text and nothing else', () => {
    const s = build()
    expect(hint(s).hidden).toBe(false)
    expect(hint(s).textContent).toBe('Choose a Trading API above to see its counters.')
  })

  it('shows no rows at all', () => {
    expect(rows(build())).toHaveLength(0)
  })

  it('hides the column labels', () => {
    expect(build().element.querySelector('.counters__head').hidden).toBe(true)
  })

  it('reports nothing chosen', () => {
    expect(build().value()).toEqual({ counters: [] })
  })
})

describe('state 2 — a custom endpoint that maps nothing (item 5)', () => {
  it('opens ONE row with no counter selected', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')

    expect(rows(s)).toHaveLength(1)
    expect(shown(s)).toEqual([''])
  })

  it('shows the aggregation beside it, disabled', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')
    const row = rows(s)[0]

    expect(aggIn(row)).not.toBeNull()
    expect(aggIn(row).hasAttribute('disabled')).toBe(true)
    expect(aggIn(row).hidden).toBe(false)
  })

  it('hides the hint once an endpoint is chosen', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')
    expect(hint(s).hidden).toBe(true)
  })
})

describe('state 3 — a mapped endpoint (item 3)', () => {
  it('opens one row per mapped counter, each pre-selected, plus a trailing row', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    expect(rows(s)).toHaveLength(3)
    expect(shown(s)).toEqual(['benchmark', 'peakOrder', 'system.cpu.percent'])
  })

  it('gives every row a counter DROPDOWN alongside its tick box', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    for (const row of rows(s)) {
      expect(pickIn(row).tagName.toLowerCase()).toBe('obs-select')
      expect(boxIn(row).tagName.toLowerCase()).toBe('obs-checkbox')
    }
  })

  it('offers the two-pane description panel on every row', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    for (const row of rows(s)) {
      expect(pickIn(row).hasAttribute('use-after-menu-description')).toBe(true)
    }
  })

  it("carries the row's own counter in its options, with a description", () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const own = optionsOf(rows(s)[0]).find((o) => o.value === 'benchmark')

    expect(own).toBeDefined()
    expect(own.description).toMatch(/Benchmark capacity/)
  })

  it('swaps the rows when the endpoint changes', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    s.setTradingApi('/metrics/network')

    expect(shown(s)).toEqual([
      'network.bandwidth.utilization',
      'network.latency.ms',
      'network.packet.error.count',
      'system.cpu.percent',
    ])
  })
})

describe('the inline "+" is gone from the counter dropdown (item 2)', () => {
  it('never sets can-user-add-options on a counter picker', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    for (const row of rows(s)) {
      expect(pickIn(row).hasAttribute('can-user-add-options')).toBe(false)
      expect(pickIn(row).hasAttribute('add-label')).toBe(false)
    }
  })

  it('offers no separate "Select Counter" adder control any more', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    expect(q(s, 'counter-adder')).toBeNull()
    expect(q(s, 'counter-adder-row')).toBeNull()
  })
})

describe('the (+)/(x) affordances (item 6)', () => {
  it('shows (+) only while a single row stands alone', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')

    expect(addButtons(s)).toHaveLength(1)
    expect(removeButtons(s)).toHaveLength(0)
  })

  it('shows (x) on every row and (+) on the last once there are several', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    expect(rows(s)).toHaveLength(3)
    expect(removeButtons(s)).toHaveLength(3)
    expect(addButtons(s)).toHaveLength(1)
  })

  it('adds a row BEYOND the trailing one when (+) is clicked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    expect(rows(s)).toHaveLength(3)

    clickAdd(s)
    expect(rows(s)).toHaveLength(4)
  })

  it('drops a row when (x) is clicked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    clickRemove(s, 0)

    expect(shown(s)).toEqual(['peakOrder', 'system.cpu.percent'])
  })

  it('re-offers a counter once the row holding it is removed', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    expect(optionNames(rows(s)[1])).not.toContain('benchmark')

    clickRemove(s, 0)
    expect(optionNames(rows(s)[0])).toContain('benchmark')
  })

  it('never offers the same counter in two rows at once', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    expect(optionNames(rows(s)[0])).not.toContain('peakOrder')
    expect(optionNames(rows(s)[1])).not.toContain('benchmark')
  })
})

describe('the trailing row is standing there on arrival', () => {
  it('is present without any (+) click on a mapped endpoint', () => {
    const s = build()
    s.setTradingApi('/metrics/application')

    // four mapped counters, then the row holding the next one on offer
    expect(rows(s)).toHaveLength(5)
    expect(shown(s).at(-1)).toBe('system.cpu.percent')
  })

  it('holds a counter no mapped row is using', () => {
    const s = build()
    s.setTradingApi('/metrics/application')
    const names = shown(s)

    expect(new Set(names).size).toBe(names.length)
  })

  it('is unticked, so it reports nothing until the user opts in', () => {
    const s = build()
    s.setTradingApi('/metrics/application')
    const trailing = rows(s).at(-1)

    expect(boxIn(trailing).hasAttribute('checked')).toBe(false)
    expect(aggIn(trailing).hasAttribute('disabled')).toBe(true)
    expect(s.value()).toEqual({ counters: [] })
  })

  it('can be ticked straight away, with no (+) click', () => {
    const s = build()
    s.setTradingApi('/metrics/application')
    const trailing = rows(s).at(-1)

    tick(trailing)
    chooseAgg(trailing, ['Avg'])

    expect(s.value()).toEqual({
      counters: [{ name: 'system.cpu.percent', aggregations: ['Avg'] }],
    })
  })

  it('opens EMPTY when the endpoint maps nothing (item 5)', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')

    expect(rows(s)).toHaveLength(1)
    expect(shown(s)).toEqual([''])
  })
})

describe('the trailing counter is system.cpu.percent on every Trading API', () => {
  it('names the default explicitly rather than leaning on catalogue order', () => {
    expect(DEFAULT_TRAILING_COUNTER).toBe('system.cpu.percent')
  })

  // The endpoint decides the rows ABOVE the trailing one; it must not decide the trailing one.
  for (const endpoint of Object.keys(COUNTERS_BY_ENDPOINT)) {
    if (countersFor(endpoint).includes(DEFAULT_TRAILING_COUNTER)) continue

    it(`ends ${endpoint} with system.cpu.percent`, () => {
      const s = build()
      s.setTradingApi(endpoint)

      expect(shown(s).at(-1)).toBe('system.cpu.percent')
      expect(shown(s).slice(0, -1)).toEqual(countersFor(endpoint))
    })
  }

  it('ends a custom endpoint with it too, once a counter is chosen there', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-thing')
    clickAdd(s)

    expect(shown(s).at(-1)).toBe('system.cpu.percent')
  })

  // /metrics/hardware LEADS with system.cpu.percent, so the trailing row cannot repeat it without
  // sending the same counter twice.
  it('falls back when the endpoint already maps system.cpu.percent', () => {
    const s = build()
    s.setTradingApi('/metrics/hardware')
    const names = shown(s)

    expect(names[0]).toBe('system.cpu.percent')
    expect(names.at(-1)).not.toBe('system.cpu.percent')
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('a row added with (+) opens on a default counter (item 4)', () => {
  it('pre-selects a counter when rows already exist', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    clickAdd(s)

    expect(shown(s).at(-1)).not.toBe('')
  })

  it('pre-selects one no other row is using', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    clickAdd(s)
    const names = shown(s)

    expect(new Set(names).size).toBe(names.length)
  })

  it('leaves that pre-selected row unticked, so its aggregation stays disabled', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    clickAdd(s)
    const row = rows(s).at(-1)

    expect(boxIn(row).hasAttribute('checked')).toBe(false)
    expect(aggIn(row).hasAttribute('disabled')).toBe(true)
  })

  it('shows the aggregation field on the new row regardless', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    clickAdd(s)

    expect(aggIn(rows(s).at(-1))).not.toBeNull()
  })

  // Regression: the added row used to keep its options in `data-pending-options` forever, because
  // only build() and upgrade() ever applied them. Its dropdown opened EMPTY while every seeded row
  // beside it was full — invisible to any check that reads the value attribute rather than the
  // options actually handed to the component.
  it('hands the new row its options, not just a pending blob', () => {
    const s = build()
    s.setTradingApi('/metrics/application')
    clickAdd(s)
    const added = rows(s).at(-1)

    expect(pickIn(added).dataset.pendingOptions).toBeUndefined()
    expect(Array.isArray(pickIn(added).options)).toBe(true)
    expect(pickIn(added).options.length).toBeGreaterThan(0)
  })

  it('offers the added row the SAME list length as the rows beside it', () => {
    const s = build()
    s.setTradingApi('/metrics/application')
    clickAdd(s)
    const counts = rows(s).map((row) => optionNames(row).length)

    expect(new Set(counts).size).toBe(1)
  })

  it('carries descriptions in the trailing row, so its pane can fill', () => {
    const s = build()
    s.setTradingApi('/metrics/application')
    const own = optionsOf(rows(s).at(-1)).find((o) => o.value === 'system.cpu.percent')

    expect(own).toBeDefined()
    expect(own.description).toMatch(/Percentage of total CPU time/)
  })

  it('stands system.cpu.percent in the trailing row, with NO (+) click', () => {
    const s = build()
    s.setTradingApi('/metrics/application')

    expect(shown(s)).toEqual([
      'throughput',
      'latency',
      'historicalThroughput',
      'historicalLatency',
      'system.cpu.percent',
    ])
  })
})

describe('every counter row carries a tick box', () => {
  it('puts a checkbox in front of every counter, seeded or added', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    expect(rows(s)).toHaveLength(3)
    for (const row of rows(s)) expect(boxIn(row)).not.toBeNull()

    clickAdd(s)
    for (const row of rows(s)) expect(boxIn(row)).not.toBeNull()
  })

  it('puts the box BEFORE the picker in the row', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const cell = rows(s)[0].querySelector('.counters__counter')

    expect(cell.firstElementChild).toBe(boxIn(rows(s)[0]))
    expect(cell.children[1]).toBe(pickIn(rows(s)[0]))
  })

  it('starts every box unticked, even on a pre-selected counter', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    for (const row of rows(s)) expect(boxIn(row).hasAttribute('checked')).toBe(false)
  })

  it('names the box after the counter it governs', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    expect(boxIn(rows(s)[0]).getAttribute('aria-label')).toBe('Select benchmark')
  })
})

describe('the aggregation unlocks on the TICK, not the pick', () => {
  it('starts disabled on every seeded row', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    for (const row of rows(s)) expect(aggIn(row).hasAttribute('disabled')).toBe(true)
  })

  it('enables when the row is ticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const row = rows(s)[0]

    tick(row)
    expect(aggIn(row).hasAttribute('disabled')).toBe(false)
  })

  it('disables again when the row is unticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const row = rows(s)[0]

    tick(row)
    tick(row, false)
    expect(aggIn(row).hasAttribute('disabled')).toBe(true)
  })

  it('enables only the row that was ticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rows(s)[0])

    expect(aggIn(rows(s)[0]).hasAttribute('disabled')).toBe(false)
    expect(aggIn(rows(s)[1]).hasAttribute('disabled')).toBe(true)
  })

  it('does NOT enable merely because a counter was chosen', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const row = rows(s)[0]

    pickCounter(row, 'latency')
    expect(shown(s)[0]).toBe('latency')
    expect(aggIn(row).hasAttribute('disabled')).toBe(true)
  })

  it('keeps the row armed when its counter is swapped afterwards', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const row = rows(s)[0]

    tick(row)
    pickCounter(row, 'latency')
    expect(aggIn(row).hasAttribute('disabled')).toBe(false)
    expect(shown(s)[0]).toBe('latency')
  })
})

describe('a disabled aggregation still draws a full dropdown (item 7)', () => {
  it('flags the wrapper so the CSS can redraw the trigger the DS withholds', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const row = rows(s)[0]

    expect(aggWrapIn(row).dataset.disabled).toBe('true')
    tick(row)
    expect(aggWrapIn(row).dataset.disabled).toBe('false')
  })

  it('carries a chevron of its own, hidden from assistive tech', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const chev = chevronIn(rows(s)[0])

    expect(chev).not.toBeNull()
    expect(chev.getAttribute('name')).toBe('chevronDown')
    expect(chev.getAttribute('aria-hidden')).toBe('true')
  })

  it('keeps the aggregation a real disabled control, not a fake one', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    expect(aggIn(rows(s)[0]).hasAttribute('disabled')).toBe(true)
  })
})

describe('value', () => {
  it('reports each picked counter with its own aggregations', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rows(s)[0])
    chooseAgg(rows(s)[0], ['Avg', 'Max'])
    tick(rows(s)[1])
    chooseAgg(rows(s)[1], ['Sum'])

    expect(s.value()).toEqual({
      counters: [
        { name: 'benchmark', aggregations: ['Avg', 'Max'] },
        { name: 'peakOrder', aggregations: ['Sum'] },
      ],
    })
  })

  it('omits a row that was never ticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    expect(s.value()).toEqual({ counters: [] })
  })

  it('omits a row that was removed', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rows(s)[0])
    chooseAgg(rows(s)[0], ['Avg'])
    clickRemove(s, 0)

    expect(s.value()).toEqual({ counters: [] })
  })
})

describe('validate', () => {
  it('passes when nothing has been ticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    expect(s.validate()).toBe(true)
  })

  it('fails and marks a ticked counter with no aggregation', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rows(s)[0])

    expect(s.validate()).toBe(false)
    expect(aggIn(rows(s)[0]).hasAttribute('error')).toBe(true)
    expect(summaryError(s).hidden).toBe(false)
  })

  it('does not mark a row that was never ticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rows(s)[0])
    s.validate()

    expect(aggIn(rows(s)[1]).hasAttribute('error')).toBe(false)
  })

  it('passes once every ticked counter has an aggregation', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rows(s)[0])
    chooseAgg(rows(s)[0], ['Avg'])

    expect(s.validate()).toBe(true)
    expect(summaryError(s).hidden).toBe(true)
  })

  it('clears the mark and the message as soon as the gap is filled', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const row = rows(s)[0]
    tick(row)
    s.validate()
    expect(summaryError(s).hidden).toBe(false)

    chooseAgg(row, ['Avg'])
    expect(aggIn(row).hasAttribute('error')).toBe(false)
    expect(summaryError(s).hidden).toBe(true)
  })

  it('passes with no endpoint, where there is nothing to validate', () => {
    expect(build().validate()).toBe(true)
  })
})

describe('reset', () => {
  it('returns every row to its seeded, unarmed state', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    clickAdd(s)
    tick(rows(s)[0])
    chooseAgg(rows(s)[0], ['Avg'])

    s.reset()

    expect(s.value()).toEqual({ counters: [] })
    expect(shown(s)).toEqual(['benchmark', 'peakOrder', 'system.cpu.percent'])
    for (const row of rows(s)) {
      expect(boxIn(row).hasAttribute('checked')).toBe(false)
      expect(aggIn(row).hasAttribute('disabled')).toBe(true)
    }
  })
})
