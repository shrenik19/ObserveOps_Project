// src/wan-link-discovery/monitors.js
// The already-monitored network devices a WAN link can be created on, and the credential profiles
// that reach them. Seeded in memory — this app has no backend.
//
// The whole point of the redesign is that these devices are ALREADY monitored, so their vendor, OS,
// collector, interfaces and credential are known before the form asks anything.

import { PLATFORMS } from './platforms.js'

export const CREDENTIALS = {
  SSH: ['Router-SSH-Admin', 'NXOS-SSH-Ops', 'Branch-SSH'],
  SNMP: ['Core-SNMP-v2c', 'Edge-SNMP-v3'],
}

export const MONITORS = [
  {
    id: 'm-xe', name: 'PMG-Router.test.com', ip: '172.16.9.41',
    vendor: 'Cisco Systems', os: 'ios-xe', collector: 'COL-DC1',
    interfaces: ['GigabitEthernet0/0/0', 'GigabitEthernet0/0/1', 'GigabitEthernet0/0/2', 'Loopback0'],
    credential: 'Core-SNMP-v2c',
  },
  {
    id: 'm-xr', name: 'EDGE-RTR-XR.test.com', ip: '10.100.1.7',
    vendor: 'Cisco Systems', os: 'ios-xr', collector: 'COL-DC1',
    interfaces: ['TenGigE0/0/0/0', 'TenGigE0/0/0/1', 'BVI100'],
    credential: 'Router-SSH-Admin',
  },
  {
    id: 'm-nxos', name: 'CORE-NX-01.test.com', ip: '10.20.40.12',
    vendor: 'Cisco Systems', os: 'nx-os', collector: 'COL-DC2',
    interfaces: ['Ethernet1/1', 'Ethernet1/2', 'Ethernet1/48', 'mgmt0'],
    credential: 'NXOS-SSH-Ops',
  },
  {
    id: 'm-juniper', name: 'BR-JUN-01.test.com', ip: '10.100.54.11',
    vendor: 'Juniper', os: 'rpm', collector: 'COL-BR1',
    interfaces: ['ge-0/0/0', 'ge-0/0/1', 'lo0'],
    // Deliberately null: the empty-prefill branch needs a monitor that exercises it.
    credential: null,
  },
]

export const findMonitor = (id) => MONITORS.find((m) => m.id === id)

export const monitorOptions = () =>
  MONITORS.map((m) => ({
    value: m.id,
    text: `${m.name}  ·  ${m.ip}  ·  ${m.vendor} ${PLATFORMS[m.os].label}`,
  }))

export const credentialOptions = (method) =>
  (CREDENTIALS[method] ?? []).map((c) => ({ value: c, text: c }))

export const interfaceOptions = (monitor) =>
  (monitor?.interfaces ?? []).map((i) => ({ value: i, text: i }))

/**
 * The monitor already has a credential, but it is the one used to MONITOR the device — which may
 * speak a different protocol than the WAN link needs. Prefill only on a match; otherwise the field
 * stays empty and required.
 */
export const prefillCredential = (monitor, method) =>
  monitor?.credential && (CREDENTIALS[method] ?? []).includes(monitor.credential)
    ? monitor.credential
    : ''
