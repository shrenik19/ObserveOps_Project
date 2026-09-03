import { describe, it, expect } from 'vitest'
import { SERIES_TOKENS, seriesToken, trace, chartHTML } from './chart.js'

describe('chart', () => {
  it('uses only DS chart tokens for series colour', () => {
    expect(SERIES_TOKENS.length).toBeGreaterThanOrEqual(8)
    expect(SERIES_TOKENS.every((t) => t.startsWith('--chart-'))).toBe(true)
  })

  it('assigns hues by order and wraps after the last', () => {
    expect(seriesToken(0)).toBe(SERIES_TOKENS[0])
    expect(seriesToken(SERIES_TOKENS.length)).toBe(SERIES_TOKENS[0])
  })

  it('produces a deterministic trace', () => {
    expect(trace(7, 50)).toBe(trace(7, 50))
    expect(trace(7, 50)).not.toBe(trace(8, 50))
  })

  it('keeps every plotted point inside the viewBox', () => {
    const ys = trace(3, 50).split(' ').map((p) => Number(p.split(',')[1]))
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...ys)).toBeLessThanOrEqual(104)
  })

  it('renders one polyline per series and a legend entry each', () => {
    const html = chartHTML({
      title: 'RTT History', span: 6, kind: 'line',
      series: ['Min. RTT', 'Avg. RTT', 'Max. RTT'], yTicks: ['5', '0'], xTicks: ['12:00'],
    })
    expect(html.match(/<polyline/g)).toHaveLength(3)
    expect(html).toContain('Min. RTT')
    expect(html).toContain('Avg. RTT')
    expect(html).toContain('Max. RTT')
  })

  it('draws a flat single-series chart as one line, not a trace', () => {
    const html = chartHTML({
      title: 'RTT History', span: 6, kind: 'line', flat: true,
      series: ['ipsla.latency.ms.avg'], yTicks: ['8 ms'], xTicks: ['1. Sep'],
    })
    expect(html).toContain('<line')
    expect(html.match(/<polyline/g)).toBeNull()
  })

  it('contains no hardcoded colour', () => {
    const html = chartHTML({
      title: 'Jitter', span: 4, kind: 'line',
      series: ['Min', 'Avg'], yTicks: ['0'], xTicks: ['12:00'],
    })
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(html).not.toMatch(/\b(rgb|hsl)a?\(/i)
  })

  it('escapes series names rather than interpolating markup', () => {
    const html = chartHTML({
      title: '<img src=x>', span: 4, kind: 'line', series: ['<b>x</b>'], yTicks: [], xTicks: [],
    })
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<b>')
  })
})
