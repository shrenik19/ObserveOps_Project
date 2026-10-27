import { describe, it, expect, beforeEach } from 'vitest'
import { createWizard } from './wizard.js'

describe('create custom report wizard', () => {
  let w
  beforeEach(() => { w = createWizard() })

  it('starts on Report Type with the defaults the spec pins', () => {
    expect(w.state()).toMatchObject({
      step: 0, type: '', widgetType: 'Grid', view: 'area', fontSize: 'Small',
      query: { sloType: 'SLO', rows: [{ counter: 'slo.achieved.percent', aggregation: 'Last' }], sourceFilter: '', sources: [] },
      props: { name: '', description: '', category: '', orientation: 'Auto', schedule: false },
    })
  })

  it('ignores every tile but SLO', () => {
    w.pickType('APM')
    expect(w.state()).toMatchObject({ step: 0, type: '' })
    w.pickType('SLO')
    expect(w.state()).toMatchObject({ step: 1, type: 'SLO' })
  })

  it('resets the counters when the SLO Type changes, defaulting the first to achieved percent', () => {
    w.setCounter(0, 'slo.burn.rate')
    w.addRow()
    w.setCounter(1, 'slo.mttr.seconds')
    w.setSloType('Metric')
    expect(w.state().query.rows).toEqual([{ counter: 'slo.instance.achieved.percent', aggregation: 'Last' }, { counter: '', aggregation: 'Last' }])
  })

  it('starts an added row with no counter', () => {
    w.addRow()
    expect(w.state().query.rows[1]).toEqual({ counter: '', aggregation: 'Last' })
  })

  it('refuses a counter from another SLO Type', () => {
    w.setSloType('APM')
    w.setCounter(0, 'slo.achieved.percent')
    expect(w.state().query.rows[0].counter).toBe('')
  })

  it('clears the sources when the Source Filter changes', () => {
    w.setSourceFilter('Performance SLO')
    w.setSources(['Firewall Throughput'])
    w.setSourceFilter('Availability SLO')
    expect(w.state().query.sources).toEqual([])
  })

  it('removes the middle row and keeps the rows either side', () => {
    w.setCounter(0, 'slo.achieved.percent')
    w.addRow(); w.setCounter(1, 'slo.burn.rate')
    w.addRow(); w.setCounter(2, 'slo.mttr.seconds')
    w.removeRow(1)
    expect(w.state().query.rows.map((r) => r.counter)).toEqual(['slo.achieved.percent', 'slo.mttr.seconds'])
  })

  it('never removes the last row', () => {
    w.removeRow(0)
    expect(w.state().query.rows).toHaveLength(1)
  })

  it('names every incomplete criteria field', () => {
    w.addRow()
    w.setCounter(0, '')
    expect(w.criteriaErrors()).toEqual({
      'counter-0': 'Select a Counter', 'counter-1': 'Select a Counter', 'source-filter': 'Select a Source Filter',
    })
    w.setCounter(0, 'slo.achieved.percent'); w.setCounter(1, 'slo.burn.rate'); w.setSourceFilter('Availability SLO')
    expect(w.criteriaErrors()).toEqual({})
  })

  it('moves forward only past a complete step, and back freely', () => {
    w.pickType('SLO')
    expect(w.go(2)).toBe(false)
    w.setCounter(0, 'slo.achieved.percent'); w.setSourceFilter('Availability SLO')
    expect(w.go(2)).toBe(true)
    expect(w.go(1)).toBe(true)
    expect(w.state().step).toBe(1)
  })

  it('checks the properties: name required and unique, category required', () => {
    expect(w.propsErrors(() => false)).toEqual({ name: 'Report Name is required', category: 'Select a Report Category' })
    w.setProps({ name: ' Taken ', category: 'availability' })
    expect(w.propsErrors((n) => n === 'Taken')).toEqual({ name: 'A report with this name already exists' })
  })

  it('turns the answers into a report for the list', () => {
    w.pickType('SLO')
    w.setCounter(0, 'slo.achieved.percent'); w.setSourceFilter('Availability SLO')
    w.setProps({ name: ' SLO weekly ', description: 'All SLOs', category: 'availability', schedule: true })
    expect(w.toReport()).toMatchObject({
      name: 'SLO weekly', description: 'All SLOs', category: 'availability', type: 'SLO', reportType: 'Custom',
      schedule: true, orientation: 'Auto',
      criteria: { widgetType: 'Grid', sloType: 'SLO', rows: [{ counter: 'slo.achieved.percent', aggregation: 'Last' }], sourceFilter: 'Availability SLO', sources: [] },
    })
  })

  it('hands out copies, so callers cannot change its state', () => {
    w.state().query.rows.push({})
    expect(w.state().query.rows).toHaveLength(1)
  })
})
