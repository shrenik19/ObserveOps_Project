// src/wan-link-discovery/profileStore.test.js
import { describe, it, expect } from 'vitest'
import { createStore } from './profileStore.js'

const draft = (over = {}) => ({
  name: 'NX Core → Airtel', monitorId: 'm-nxos', osKey: 'nx-os', mode: 'single',
  links: [{ probe: 'ICMP Echo', isp: 'Airtel', iface: 'Ethernet1/48', srcLocation: '', dip: '8.8.8.8', dstLocation: '', port: '' }],
  ...over,
})

describe('profile store', () => {
  it('starts from the seed', () => {
    expect(createStore().list().length).toBeGreaterThan(0)
  })

  it('adds a profile that has never run', () => {
    const store = createStore([])
    const p = store.add(draft())
    expect(store.list()).toHaveLength(1)
    expect(p.ranAt).toBeNull()
    expect(p.provisioned).toBe(false)
    expect(p.discovered).toBe(0)
  })

  it('records a run without provisioning it', () => {
    const store = createStore([])
    const p = store.add(draft())
    store.recordRun(p.id, { discovered: 1, failed: 0, ranAt: '2026-09-03 11:04:12' })
    const after = store.list()[0]
    expect(after.discovered).toBe(1)
    expect(after.provisioned).toBe(false)
  })
})

describe('immutability after provisioning', () => {
  it('lets you edit and run a profile that has never run', () => {
    const store = createStore([])
    const p = store.add(draft())
    expect(store.canEdit(p)).toBe(true)
    expect(store.canRun(p)).toBe(true)
  })

  it('still lets you edit and run one whose run failed', () => {
    const store = createStore([])
    const p = store.add(draft())
    store.recordRun(p.id, { discovered: 0, failed: 1, ranAt: '2026-09-03 11:04:12' })
    expect(store.canEdit(store.list()[0])).toBe(true)
    expect(store.canRun(store.list()[0])).toBe(true)
  })

  it('freezes a profile once it is provisioned', () => {
    const store = createStore([])
    const p = store.add(draft())
    store.recordRun(p.id, { discovered: 1, failed: 0, ranAt: '2026-09-03 11:04:12' })
    store.provision(p.id)
    const after = store.list()[0]
    expect(after.provisioned).toBe(true)
    expect(store.canEdit(after)).toBe(false)
    expect(store.canRun(after)).toBe(false)
  })

  it('offers only View and Delete on a provisioned profile', () => {
    const store = createStore([])
    const p = store.add(draft())
    store.provision(p.id)
    expect(store.menuFor(store.list()[0])).toEqual(['View Discovered Objects', 'Delete'])
  })

  it('offers the full menu otherwise', () => {
    const store = createStore([])
    const p = store.add(draft())
    expect(store.menuFor(p)).toEqual(['Edit', 'Run', 'View Discovered Objects', 'Delete'])
  })
})

describe('grid rows', () => {
  it("puts the monitor's IP in the IP/Host column and the destination on the title", () => {
    const store = createStore([])
    store.add(draft())
    const row = store.gridRows()[0]
    expect(row.target).toBe('10.20.40.12')
    expect(row.targetTitle).toContain('8.8.8.8')
  })

  it('shows the platform label and the collector inherited from the monitor', () => {
    const store = createStore([])
    store.add(draft())
    const row = store.gridRows()[0]
    expect(row.platform).toBe('NX-OS')
    expect(row.collector).toBe('COL-DC2')
  })

  it('reads Never ran until it has run, then the timestamp', () => {
    const store = createStore([])
    const p = store.add(draft())
    expect(store.gridRows()[0].status).toBe('Never ran')
    store.recordRun(p.id, { discovered: 1, failed: 0, ranAt: '2026-09-03 11:04:12' })
    expect(store.gridRows()[0].status).toBe('Last ran at 2026-09-03 11:04:12')
  })

  it('says the run failed when nothing was discovered', () => {
    const store = createStore([])
    const p = store.add(draft())
    store.recordRun(p.id, { discovered: 0, failed: 1, ranAt: '2026-09-03 11:04:12' })
    expect(store.gridRows()[0].status).toBe('Last ran failed at 2026-09-03 11:04:12')
  })

  it('counts discovered objects, which is N in CSV mode', () => {
    const store = createStore([])
    const p = store.add(draft({ mode: 'csv', links: [{}, {}, {}] }))
    store.recordRun(p.id, { discovered: 3, failed: 0, ranAt: '2026-09-03 11:04:12' })
    expect(store.gridRows()[0].discovered).toBe(3)
  })
})
