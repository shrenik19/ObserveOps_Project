import { describe, it, expect } from 'vitest'
import { renderCountersSection, countersFor, COUNTERS_BY_ENDPOINT, AGGREGATIONS } from './countersSection.js'

const build = () => {
  const s = renderCountersSection()
  s.upgrade()
  return s
}

const q = (s, role) => s.element.querySelector(`[data-role="${role}"]`)
const boxes = (s) => [...s.element.querySelectorAll('[data-role="counter-option"]')]
const names = (s) => boxes(s).map((b) => b.textContent)
const hint = (s) => q(s, 'counters-hint')
const agg = (s) => q(s, 'counters-aggregation')
const countersError = (s) => q(s, 'counters-error')
const aggError = (s) => q(s, 'aggregation-error')

/** obs-checkbox reports the new state; the host attribute follows it. */
const tick = (box, on = true) => {
  if (on) box.setAttribute('checked', '')
  else box.removeAttribute('checked')
  box.dispatchEvent(new CustomEvent('change', { detail: [on] }))
}
const chooseAgg = (s, list) => agg(s).dispatchEvent(new CustomEvent('change', { detail: [list] }))

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

  it('maps application to its four counters', () => {
    expect(countersFor('/metrics/application')).toEqual([
      'throughput',
      'latency',
      'historicalThroughput',
      'historicalLatency',
    ])
  })

  it('returns nothing for an unknown or empty endpoint', () => {
    expect(countersFor('/metrics/nope')).toEqual([])
    expect(countersFor('')).toEqual([])
    expect(countersFor(undefined)).toEqual([])
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

  it('shows no counters and a hint before an endpoint is chosen', () => {
    const s = build()
    expect(boxes(s)).toHaveLength(0)
    expect(hint(s).hidden).toBe(false)
    expect(hint(s).textContent).toContain('Choose a Trading API')
  })

  it('offers every aggregation, multi-select with select-all', () => {
    const s = build()
    expect(agg(s).options.map((o) => o.value)).toEqual(AGGREGATIONS)
    expect(agg(s).hasAttribute('multiple')).toBe(true)
    expect(agg(s).hasAttribute('allow-select-all')).toBe(true)
  })

  it('reports nothing chosen', () => {
    expect(build().value()).toEqual({ counters: [], aggregations: [] })
  })
})

describe('counters follow the Trading API', () => {
  it('lists the counters for the chosen endpoint', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')

    expect(names(s)).toEqual(['benchmark', 'peakOrder'])
    expect(hint(s).hidden).toBe(true)
  })

  it('swaps the list when the endpoint changes', () => {
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

    expect(boxes(s)).toHaveLength(0)
    expect(hint(s).hidden).toBe(false)
    expect(hint(s).textContent).toContain('No counters are mapped')
  })

  it('returns to the hint when the endpoint is cleared', () => {
    const s = build()
    s.setTradingApi('/metrics/network')
    s.setTradingApi('')

    expect(boxes(s)).toHaveLength(0)
    expect(hint(s).textContent).toContain('Choose a Trading API')
  })
})

describe('choosing counters', () => {
  it('reports the ticked counters in the endpoint order', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(boxes(s)[1])
    tick(boxes(s)[0])

    expect(s.value().counters).toEqual(['benchmark', 'peakOrder'])
  })

  it('drops a counter when it is unticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(boxes(s)[0])
    tick(boxes(s)[0], false)

    expect(s.value().counters).toEqual([])
  })

  it('lets every counter be chosen', () => {
    const s = build()
    s.setTradingApi('/metrics/application')
    boxes(s).forEach((b) => tick(b))

    expect(s.value().counters).toEqual(countersFor('/metrics/application'))
  })

  // Keeping them would report counters the new endpoint cannot produce.
  it('forgets ticks that do not exist on the new endpoint', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(boxes(s)[0])
    s.setTradingApi('/metrics/network')

    expect(s.value().counters).toEqual([])
  })

  it('keeps a tick when the endpoint is re-selected', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(boxes(s)[0])
    s.setTradingApi('/metrics/cap-utilization')

    expect(boxes(s)[0].hasAttribute('checked')).toBe(true)
    expect(s.value().counters).toEqual(['benchmark'])
  })
})

describe('aggregation', () => {
  it('reports the chosen aggregations', () => {
    const s = build()
    chooseAgg(s, ['Avg', 'Max'])
    expect(s.value().aggregations).toEqual(['Avg', 'Max'])
  })

  it('accepts all of them', () => {
    const s = build()
    chooseAgg(s, AGGREGATIONS)
    expect(s.value().aggregations).toEqual(AGGREGATIONS)
  })
})

describe('validate', () => {
  it('passes while the section is untouched', () => {
    expect(build().validate()).toBe(true)
  })

  it('fails when counters are chosen without an aggregation', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(boxes(s)[0])

    expect(s.validate()).toBe(false)
    expect(aggError(s).hidden).toBe(false)
    expect(agg(s).hasAttribute('error')).toBe(true)
    expect(countersError(s).hidden).toBe(true)
  })

  it('fails when an aggregation is chosen without counters', () => {
    const s = build()
    chooseAgg(s, ['Avg'])

    expect(s.validate()).toBe(false)
    expect(countersError(s).hidden).toBe(false)
    expect(aggError(s).hidden).toBe(true)
  })

  it('passes when both are given', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(boxes(s)[0])
    chooseAgg(s, ['Avg'])

    expect(s.validate()).toBe(true)
    expect(s.value()).toEqual({ counters: ['benchmark'], aggregations: ['Avg'] })
  })

  it('clears the aggregation mark as soon as one is chosen', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(boxes(s)[0])
    s.validate()
    expect(agg(s).hasAttribute('error')).toBe(true)

    chooseAgg(s, ['Sum'])
    expect(agg(s).hasAttribute('error')).toBe(false)
  })

  it('hides the aggregation message as soon as one is chosen, not on next submit', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(boxes(s)[0])
    s.validate()
    expect(aggError(s).hidden).toBe(false)

    chooseAgg(s, ['Avg'])
    expect(aggError(s).hidden).toBe(true)
  })

  it('hides the counters message as soon as one is ticked', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    chooseAgg(s, ['Avg'])
    s.validate()
    expect(countersError(s).hidden).toBe(false)

    tick(boxes(s)[0])
    expect(countersError(s).hidden).toBe(true)
  })

  it('goes back to passing if the counters are unticked again', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(boxes(s)[0])
    expect(s.validate()).toBe(false)

    tick(boxes(s)[0], false)
    expect(s.validate()).toBe(true)
  })
})

describe('reset', () => {
  it('clears the ticks and the aggregations', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    tick(boxes(s)[0])
    chooseAgg(s, ['Avg'])

    s.reset()

    expect(s.value()).toEqual({ counters: [], aggregations: [] })
    expect(boxes(s).every((b) => !b.hasAttribute('checked'))).toBe(true)
  })

  it('keeps the endpoint counter list on screen', () => {
    const s = build()
    s.setTradingApi('/metrics/cap-utilization')
    s.reset()
    expect(names(s)).toEqual(['benchmark', 'peakOrder'])
  })
})
