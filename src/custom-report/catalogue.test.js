import { describe, it, expect } from 'vitest'
import {
  REPORT_TYPES, CLICKABLE, SLO_TYPES, countersFor, AGGREGATIONS, SOURCE_FILTERS, WIDGET_TYPES, TOPN_VIEWS,
  ORIENTATIONS, sourcesFor, previewColumns, previewRows,
} from './catalogue.js'

describe('custom report catalogue', () => {
  it("lists the product's eighteen report types, then SLO", () => {
    expect(REPORT_TYPES).toHaveLength(19)
    expect(REPORT_TYPES.slice(0, 4)).toEqual(['Availability', 'Performance', 'Inventory', 'Active Alerts'])
    expect(REPORT_TYPES.slice(-2)).toEqual(['NetRoute', 'SLO'])
  })

  it('makes only SLO clickable', () => {
    expect([...CLICKABLE]).toEqual(['SLO'])
  })

  it('offers the five SLO types of Create Widget', () => {
    expect(SLO_TYPES).toEqual(['SLO', 'Metric', 'APM', 'RUM', 'NetRoute'])
  })

  it('gives the SLO type slo.* counters and every other type slo.instance.* counters', () => {
    expect(countersFor('SLO')).toEqual([
      'slo.achieved.percent', 'slo.violated.percent', 'slo.error.budget.left.percent',
      'slo.mttr.seconds', 'slo.mtbf.seconds', 'slo.burn.rate',
    ])
    for (const t of ['Metric', 'APM', 'RUM', 'NetRoute']) {
      expect(countersFor(t)).toEqual(countersFor('SLO').map((c) => c.replace('slo.', 'slo.instance.')))
    }
  })

  it('pins the user-confirmed option lists', () => {
    expect(AGGREGATIONS).toEqual(['Last'])
    expect(SOURCE_FILTERS).toEqual(['Performance SLO', 'Availability SLO'])
    expect(WIDGET_TYPES).toEqual(['Grid', 'Top N'])
    expect(TOPN_VIEWS.map((v) => v.label)).toEqual(['Area', 'Line', 'Horizontal Bar', 'Vertical Bar', 'Pie', 'Solid Gauge', 'Grid'])
    expect(ORIENTATIONS).toEqual(['Auto', 'Portrait', 'Landscape'])
  })

  it('lists the SLOs of each kind as sources, and none twice', () => {
    const perf = sourcesFor('Performance SLO')
    const avail = sourcesFor('Availability SLO')
    expect(perf.length).toBeGreaterThan(0)
    expect(avail.length).toBeGreaterThan(0)
    expect(perf.filter((n) => avail.includes(n))).toEqual([])
    expect(sourcesFor('')).toEqual([])
  })
})

describe('preview columns', () => {
  it('puts one column per counter between the profile name and the target', () => {
    const cols = previewColumns({ sloType: 'SLO', counters: ['slo.achieved.percent', 'slo.burn.rate'] }).map((c) => c.title)
    expect(cols).toEqual(['SLO.ID', 'SLO.PROFILE.NAME', 'SLO.ACHIEVED.PERCENT', 'SLO.BURN.RATE', 'SLO.TARGET',
      'SLO.PROFILE.BUSINESS SERVICE', 'SLO.PROFILE.TAGS', 'SLO.FREQUENCY', 'SLO.PROFILE.TYPE'])
  })

  it('adds INSTANCE for the instance-level types only', () => {
    const t = (sloType) => previewColumns({ sloType, counters: ['x'] }).map((c) => c.title)
    expect(t('SLO')).not.toContain('INSTANCE')
    expect(t('APM')[2]).toBe('INSTANCE')
  })

  it('skips counter rows still unset', () => {
    expect(previewColumns({ sloType: 'SLO', counters: ['slo.burn.rate', ''] }).map((c) => c.title)).toContain('SLO.BURN.RATE')
    expect(previewColumns({ sloType: 'SLO', counters: ['slo.burn.rate', ''] })).toHaveLength(9 - 1)
  })
})

describe('preview rows', () => {
  const counters = ['slo.achieved.percent']

  it('has one row per SLO for the SLO type, carrying the counter value', () => {
    const rows = previewRows({ sloType: 'SLO', counters, sources: [] })
    expect(rows.length).toBe(sourcesFor('Performance SLO').length + sourcesFor('Availability SLO').length)
    expect(typeof rows[0]['slo.achieved.percent']).toBe('number')
    expect(rows[0].instance).toBeUndefined()
  })

  it('has one row per instance for the other types', () => {
    const rows = previewRows({ sloType: 'Metric', counters: ['slo.instance.achieved.percent'], sources: [] })
    expect(rows.every((r) => r.instance)).toBe(true)
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length)
  })

  it('keeps to the Source Filter kind when no source is picked', () => {
    const rows = previewRows({ sloType: 'SLO', counters, sourceFilter: 'Availability SLO', sources: [] })
    expect(rows.map((r) => r.name)).toEqual(sourcesFor('Availability SLO'))
    expect(rows.every((r) => r.profileType === 'Availability')).toBe(true)
  })

  it('narrows to the picked sources', () => {
    const [one] = sourcesFor('Availability SLO')
    const rows = previewRows({ sloType: 'SLO', counters, sources: [one] })
    expect(rows.map((r) => r.name)).toEqual([one])
  })

  it('gives the same numbers every time', () => {
    const a = previewRows({ sloType: 'APM', counters: ['slo.instance.burn.rate'], sources: [] })
    const b = previewRows({ sloType: 'APM', counters: ['slo.instance.burn.rate'], sources: [] })
    expect(a).toEqual(b)
  })
})
