import { describe, it, expect } from 'vitest'
import { renderCountersSection, countersFor, COUNTERS_BY_ENDPOINT, AGGREGATIONS } from './countersSection.js'

const build = () => {
  const s = renderCountersSection()
  s.upgrade()
  return s
}

const q = (s, role) => s.element.querySelector(`[data-role="${role}"]`)
const rows = (s) => [...s.element.querySelectorAll('[data-role="counter-row"]')]
const rowFor = (s, name) => rows(s).find((r) => r.dataset.counter === name)
const boxIn = (row) => row.querySelector('[data-role="counter-option"]')
const aggIn = (row) => row.querySelector('[data-role="counter-aggregation"]')
const names = (s) => rows(s).map((r) => r.dataset.counter)
const adder = (s) => q(s, 'counter-adder')
const adderRow = (s) => q(s, 'counter-adder-row')
const hint = (s) => q(s, 'counters-hint')
const summaryError = (s) => q(s, 'counters-error')

/** obs-checkbox reports the new state; the host attribute follows it. */
const tick = (row, on = true) => {
  const box = boxIn(row)
  if (on) box.setAttribute('checked', '')
  else box.removeAttribute('checked')
  box.dispatchEvent(new CustomEvent('change', { detail: [on] }))
}
const chooseAgg = (row, list) =>
  aggIn(row).dispatchEvent(new CustomEvent('change', { detail: [list] }))
/** Adding through the "Select Counter" control arrives as a change, however it was produced. */
const addCounter = (s, name) =>
  adder(s).dispatchEvent(new CustomEvent('change', { detail: [name] }))

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
    expect(hint(s)).not.toBeNull()
    expect(hint(s).textContent).toBe('Choose a Trading API above to see its counters.')
  })

  it('shows NO aggregation dropdown', () => {
    expect(build().element.querySelector('[data-role="counter-aggregation"]')).toBeNull()
  })

  it('shows NO counter adder', () => {
    expect(adder(build())).toBeNull()
  })

  it('hides the column labels', () => {
    expect(build().element.querySelector('.counters__head').hidden).toBe(true)
  })

  it('reports nothing chosen', () => {
    expect(build().value()).toEqual({ counters: [] })
  })
})

describe('state 2 — a custom endpoint with no mapped counters', () => {
  it('offers the adder instead of a "no counters" message', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')

    expect(hint(s)).toBeNull()
    expect(adder(s)).not.toBeNull()
    expect(adder(s).getAttribute('placeholder')).toBe('Select Counter')
  })

  it('accepts a counter the user names', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')

    expect(rows(s)).toHaveLength(0)
    addCounter(s, 'p99')

    expect(names(s)).toEqual(['p99'])
  })

  it('shows no aggregation dropdown until a counter exists', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')
    expect(s.element.querySelector('[data-role="counter-aggregation"]')).toBeNull()

    addCounter(s, 'p99')
    expect(s.element.querySelector('[data-role="counter-aggregation"]')).not.toBeNull()
  })

  it('keeps the added counter unticked with its aggregation disabled', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')
    addCounter(s, 'p99')

    const row = rowFor(s, 'p99')
    expect(boxIn(row).hasAttribute('checked')).toBe(false)
    expect(aggIn(row).hasAttribute('disabled')).toBe(true)
  })

  it('takes several added counters, in order', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')
    addCounter(s, 'p95')
    addCounter(s, 'p99')

    expect(names(s)).toEqual(['p95', 'p99'])
  })

  it('ignores a blank or duplicate name', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')
    addCounter(s, 'p99')
    addCounter(s, 'p99')
    addCounter(s, '   ')

    expect(names(s)).toEqual(['p99'])
  })
})

describe('state 3 — a mapped endpoint', () => {
  it('lists the mapped counters and offers the adder below them', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    expect(names(s)).toEqual(['benchmark', 'peakOrder'])
    expect(adder(s)).not.toBeNull()
  })

  it('puts the adder last, after every counter row', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const children = [...s.element.querySelector('[data-role="counter-list"]').children]

    expect(children.at(-1)).toBe(adderRow(s))
  })

  it('gives the adder row no aggregation of its own', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    expect(adderRow(s).querySelector('[data-role="counter-aggregation"]')).toBeNull()
  })

  it('appends a new counter after the mapped ones', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    addCounter(s, 'customRatio')

    expect(names(s)).toEqual(['benchmark', 'peakOrder', 'customRatio'])
  })

  it('refuses to add a counter the endpoint already maps', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    addCounter(s, 'benchmark')

    expect(names(s)).toEqual(['benchmark', 'peakOrder'])
  })

  it('swaps the rows when the endpoint changes', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    s.setTradingApi('/metrics/network')

    expect(names(s)).toEqual([
      'network.bandwidth.utilization',
      'network.latency.ms',
      'network.packet.error.count',
    ])
  })

  it('keeps added counters with the endpoint they were added to', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    addCounter(s, 'customRatio')
    s.setTradingApi('/metrics/network')

    expect(names(s)).not.toContain('customRatio')

    s.setTradingApi('/metrics/cap-utilization')
    expect(names(s)).toContain('customRatio')
  })
})

describe('the aggregation picker is enabled only for ticked counters', () => {
  it('starts disabled on every row', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    for (const row of rows(s)) expect(aggIn(row).hasAttribute('disabled')).toBe(true)
  })

  it('is still visible while disabled', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    expect(aggIn(rowFor(s, 'benchmark')).hidden).toBe(false)
  })

  it('enables on tick and disables again on untick', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const row = rowFor(s, 'benchmark')

    tick(row)
    expect(aggIn(row).hasAttribute('disabled')).toBe(false)

    tick(row, false)
    expect(aggIn(row).hasAttribute('disabled')).toBe(true)
  })

  it('enables only the row that was ticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rowFor(s, 'benchmark'))

    expect(aggIn(rowFor(s, 'benchmark')).hasAttribute('disabled')).toBe(false)
    expect(aggIn(rowFor(s, 'peakOrder')).hasAttribute('disabled')).toBe(true)
  })

  it('applies to a counter the user added too', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')
    addCounter(s, 'p99')
    const row = rowFor(s, 'p99')

    expect(aggIn(row).hasAttribute('disabled')).toBe(true)
    tick(row)
    expect(aggIn(row).hasAttribute('disabled')).toBe(false)
  })
})

describe('value', () => {
  it('reports each ticked counter with its own aggregations', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rowFor(s, 'benchmark'))
    chooseAgg(rowFor(s, 'benchmark'), ['Avg', 'Max'])
    tick(rowFor(s, 'peakOrder'))
    chooseAgg(rowFor(s, 'peakOrder'), ['Sum'])

    expect(s.value()).toEqual({
      counters: [
        { name: 'benchmark', aggregations: ['Avg', 'Max'] },
        { name: 'peakOrder', aggregations: ['Sum'] },
      ],
    })
  })

  it('includes an added counter once ticked', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')
    addCounter(s, 'p99')
    tick(rowFor(s, 'p99'))
    chooseAgg(rowFor(s, 'p99'), ['Last'])

    expect(s.value()).toEqual({ counters: [{ name: 'p99', aggregations: ['Last'] }] })
  })

  it('omits counters that are not ticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rowFor(s, 'benchmark'))
    chooseAgg(rowFor(s, 'benchmark'), ['Avg'])
    tick(rowFor(s, 'benchmark'), false)

    expect(s.value()).toEqual({ counters: [] })
  })
})

describe('validate', () => {
  it('passes when nothing is ticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    expect(s.validate()).toBe(true)
  })

  it('fails and marks a ticked counter with no aggregation', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rowFor(s, 'benchmark'))

    expect(s.validate()).toBe(false)
    expect(aggIn(rowFor(s, 'benchmark')).hasAttribute('error')).toBe(true)
    expect(summaryError(s).hidden).toBe(false)
  })

  it('does not mark an unticked counter', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rowFor(s, 'benchmark'))
    s.validate()

    expect(aggIn(rowFor(s, 'peakOrder')).hasAttribute('error')).toBe(false)
  })

  it('passes once every ticked counter has an aggregation', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rowFor(s, 'benchmark'))
    chooseAgg(rowFor(s, 'benchmark'), ['Avg'])

    expect(s.validate()).toBe(true)
    expect(summaryError(s).hidden).toBe(true)
  })

  it('clears the mark and the message as soon as the gap is filled', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const row = rowFor(s, 'benchmark')
    tick(row)
    s.validate()
    expect(summaryError(s).hidden).toBe(false)

    chooseAgg(row, ['Avg'])
    expect(aggIn(row).hasAttribute('error')).toBe(false)
    expect(summaryError(s).hidden).toBe(true)
  })

  it('clears the mark when the offending counter is unticked instead', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const row = rowFor(s, 'benchmark')
    tick(row)
    s.validate()
    expect(aggIn(row).hasAttribute('error')).toBe(true)

    tick(row, false)
    expect(aggIn(row).hasAttribute('error')).toBe(false)
    expect(s.validate()).toBe(true)
  })

  it('passes with no endpoint, where there is nothing to validate', () => {
    expect(build().validate()).toBe(true)
  })
})

describe('reset', () => {
  it('unticks everything and forgets added counters', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    addCounter(s, 'customRatio')
    tick(rowFor(s, 'benchmark'))
    chooseAgg(rowFor(s, 'benchmark'), ['Avg'])

    s.reset()

    expect(s.value()).toEqual({ counters: [] })
    expect(names(s)).toEqual(['benchmark', 'peakOrder'])
    for (const row of rows(s)) {
      expect(boxIn(row).hasAttribute('checked')).toBe(false)
      expect(aggIn(row).hasAttribute('disabled')).toBe(true)
    }
  })
})
