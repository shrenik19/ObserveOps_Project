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

  it('returns nothing for an unknown or empty endpoint', () => {
    expect(countersFor('/metrics/nope')).toEqual([])
    expect(countersFor('')).toEqual([])
  })

  it('offers the seven aggregations', () => {
    expect(AGGREGATIONS).toEqual(['Avg', 'Min', 'Max', 'Median', 'Sum', 'Count', 'Last'])
  })
})

describe('initial state', () => {
  it('is titled for both controls', () => {
    expect(build().element.querySelector('[data-role="counters-title"]').textContent).toBe(
      'Counters & Aggregation'
    )
  })

  it('shows no rows and a hint before an endpoint is chosen', () => {
    const s = build()
    expect(rows(s)).toHaveLength(0)
    expect(hint(s).hidden).toBe(false)
    expect(hint(s).textContent).toContain('Choose a Trading API')
  })

  it('reports nothing chosen', () => {
    expect(build().value()).toEqual({ counters: [] })
  })
})

describe('a row per counter', () => {
  it('gives every counter its own aggregation picker', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    expect(names(s)).toEqual(['benchmark', 'peakOrder'])
    for (const row of rows(s)) {
      expect(aggIn(row)).not.toBeNull()
      expect(aggIn(row).options.map((o) => o.value)).toEqual(AGGREGATIONS)
      expect(aggIn(row).hasAttribute('multiple')).toBe(true)
      expect(aggIn(row).hasAttribute('allow-select-all')).toBe(true)
    }
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

  it('explains itself for a custom endpoint with no counters', () => {
    const s = build()
    s.setTradingApi('/metrics/custom-latency')

    expect(rows(s)).toHaveLength(0)
    expect(hint(s).textContent).toContain('No counters are mapped')
  })
})

describe('the aggregation picker is enabled only for ticked counters', () => {
  it('starts disabled on every row', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    for (const row of rows(s)) expect(aggIn(row).hasAttribute('disabled')).toBe(true)
  })

  // Disabled, NOT hidden — the choice on offer stays visible.
  it('is still visible while disabled', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    expect(aggIn(rowFor(s, 'benchmark'))).not.toBeNull()
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

  it('omits counters that are not ticked, even if they carry aggregations', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rowFor(s, 'benchmark'))
    chooseAgg(rowFor(s, 'benchmark'), ['Avg'])
    tick(rowFor(s, 'benchmark'), false)

    expect(s.value()).toEqual({ counters: [] })
  })

  it('restores an aggregation when its counter is ticked again', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    const row = rowFor(s, 'benchmark')
    tick(row)
    chooseAgg(row, ['Avg'])
    tick(row, false)
    tick(row)

    expect(s.value()).toEqual({ counters: [{ name: 'benchmark', aggregations: ['Avg'] }] })
  })

  it('forgets state for counters the new endpoint does not expose', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rowFor(s, 'benchmark'))
    chooseAgg(rowFor(s, 'benchmark'), ['Avg'])
    s.setTradingApi('/metrics/network')

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

  it('marks every offending row at once', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rowFor(s, 'benchmark'))
    tick(rowFor(s, 'peakOrder'))

    expect(s.validate()).toBe(false)
    expect(aggIn(rowFor(s, 'benchmark')).hasAttribute('error')).toBe(true)
    expect(aggIn(rowFor(s, 'peakOrder')).hasAttribute('error')).toBe(true)
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
})

describe('reset', () => {
  it('unticks everything and disables every picker again', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(rowFor(s, 'benchmark'))
    chooseAgg(rowFor(s, 'benchmark'), ['Avg'])

    s.reset()

    expect(s.value()).toEqual({ counters: [] })
    for (const row of rows(s)) {
      expect(boxIn(row).hasAttribute('checked')).toBe(false)
      expect(aggIn(row).hasAttribute('disabled')).toBe(true)
    }
  })

  it('keeps the endpoint rows on screen', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    s.reset()
    expect(names(s)).toEqual(['benchmark', 'peakOrder'])
  })
})
