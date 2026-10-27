import { describe, it, expect } from 'vitest'
import { chartSvg, topN, niceMax } from './charts.js'

const ITEMS = [
  { label: 'Checkout Availability', value: 100 },
  { label: 'Payment Gateway Uptime', value: 99.8 },
  { label: 'Core Switching Availability', value: 23.9 },
]
const marks = (svg) => (svg.match(/data-item="/g) || []).length

describe('Top N charts', () => {
  for (const view of ['area', 'line', 'hbar', 'vbar', 'pie', 'gauge']) {
    it(`draws one mark per item as ${view}, coloured only by class`, () => {
      const svg = chartSvg(view, ITEMS, { unit: '%' })
      expect(svg.startsWith('<svg')).toBe(true)
      expect(marks(svg)).toBe(3)
      expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i)
    })
  }

  it('labels every item', () => {
    const svg = chartSvg('vbar', ITEMS, { unit: '%' })
    for (const i of ITEMS) expect(svg).toContain(i.label.slice(0, 10))
  })

  it('escapes item labels', () => {
    expect(chartSvg('hbar', [{ label: 'Search & <Catalogue>', value: 1 }], {})).toContain('Search &amp; &lt;Catalogue&gt;')
  })

  it('ranks highest first and keeps the top ten', () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ label: `s${i}`, value: i }))
    const top = topN(many)
    expect(top).toHaveLength(10)
    expect(top[0].value).toBe(13)
    expect(top.at(-1).value).toBe(4)
  })

  it('rounds the value axis up to a readable maximum', () => {
    expect(niceMax(99.8)).toBe(100)
    expect(niceMax(7210)).toBe(10000)
    expect(niceMax(2100)).toBe(2500)
    expect(niceMax(0)).toBe(1)
  })
})
