// src/wan-link-discovery/profileStore.js
// Discovery profiles of type WAN Link, and the one rule that makes them different from every other
// discovery profile: once provisioned, a profile CANNOT be edited and CANNOT be re-run.
//
// The reason is physical rather than cosmetic. The profile's identity IS an IP SLA operation living
// on a router. Editing Monitor, WAN Probe or Destination IP would describe a DIFFERENT operation,
// and re-running would leave the original still executing on the device with nothing watching it.

import { PLATFORMS } from './platforms.js'
import { findMonitor } from './monitors.js'

const SEED = [
  {
    id: 'p-seed-1', name: 'NX Core → Airtel', monitorId: 'm-nxos', osKey: 'nx-os', mode: 'single',
    links: [{ probe: 'ICMP Echo', isp: 'Airtel', iface: 'Ethernet1/48', srcLocation: '', dip: '8.8.8.8', dstLocation: '', port: '' }],
    discovered: 1, failed: 0, ranAt: '2026-09-02 11:04:12', provisioned: true,
  },
  {
    id: 'p-seed-2', name: 'XR Edge → Jio', monitorId: 'm-xr', osKey: 'ios-xr', mode: 'single',
    links: [{ probe: 'UDP Echo', isp: 'Jio', iface: 'TenGigE0/0/0/0', srcLocation: '', dip: '1.1.1.1', dstLocation: '', port: '5000' }],
    discovered: 0, failed: 1, ranAt: '2026-09-01 18:22:40', provisioned: false,
  },
]

export function createStore(seed = SEED) {
  const profiles = seed.map((p) => ({ ...p }))

  // Scoped to this store, not the module: the screen recreates its store on remount, and a shared
  // counter would carry ids across instances that are otherwise independent.
  let seq = 0
  const nextId = () => `p-${++seq}`

  const byId = (id) => profiles.find((p) => p.id === id)

  const gridRow = (p) => {
    const monitor = findMonitor(p.monitorId)
    const destinations = p.links.map((l) => l.dip).filter(Boolean)
    return {
      id: p.id,
      name: p.name,
      // The profile's TARGET is the monitor, so its IP fills the IP/Host column. The destination
      // is what the operation points AT, and rides in the title attribute.
      target: monitor?.ip ?? '',
      targetTitle: destinations.length ? `Destination ${destinations.join(', ')}` : '',
      platform: PLATFORMS[p.osKey]?.label ?? '',
      discovered: p.discovered,
      status: !p.ranAt
        ? 'Never ran'
        : `Last ran${p.discovered === 0 ? ' failed' : ''} at ${p.ranAt}`,
      collector: monitor?.collector ?? '',
      provisioned: p.provisioned,
    }
  }

  return {
    list: () => profiles.map((p) => ({ ...p })),

    add(draft) {
      const profile = {
        id: nextId(),
        discovered: 0,
        failed: 0,
        ranAt: null,
        provisioned: false,
        ...draft,
      }
      profiles.push(profile)
      return { ...profile }
    },

    recordRun(id, { discovered, failed, ranAt }) {
      const p = byId(id)
      if (!p) return
      Object.assign(p, { discovered, failed, ranAt })
    },

    provision(id) {
      const p = byId(id)
      if (p) p.provisioned = true
    },

    canEdit: (p) => !p.provisioned,
    canRun: (p) => !p.provisioned,

    menuFor: (p) =>
      p.provisioned
        ? ['View Discovered Objects', 'Delete']
        : ['Edit', 'Run', 'View Discovered Objects', 'Delete'],

    gridRows: () => profiles.map(gridRow),
  }
}
