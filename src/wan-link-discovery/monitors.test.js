// src/wan-link-discovery/monitors.test.js
import { describe, it, expect } from 'vitest'
import { PLATFORMS } from './platforms.js'
import {
  MONITORS, CREDENTIALS, findMonitor, monitorOptions,
  credentialOptions, interfaceOptions, prefillCredential,
} from './monitors.js'

describe('seeded monitors', () => {
  it('covers every platform at least once', () => {
    for (const key of Object.keys(PLATFORMS)) {
      expect(MONITORS.filter((m) => m.os === key).length).toBeGreaterThan(0)
    }
  })

  it('gives every monitor an OS the matrix knows and a matching vendor', () => {
    for (const m of MONITORS) {
      expect(PLATFORMS[m.os]).toBeDefined()
      expect(PLATFORMS[m.os].vendor).toBe(m.vendor)
    }
  })

  it('gives every monitor interfaces to offer as Source Interface', () => {
    expect(MONITORS.every((m) => m.interfaces.length > 0)).toBe(true)
  })

  it('labels each option with name, IP and platform', () => {
    const opt = monitorOptions().find((o) => o.value === 'm-nxos')
    expect(opt.text).toContain('CORE-NX-01.test.com')
    expect(opt.text).toContain('10.20.40.12')
    expect(opt.text).toContain('NX-OS')
  })

  it('finds a monitor by id', () => {
    expect(findMonitor('m-nxos').name).toBe('CORE-NX-01.test.com')
    expect(findMonitor('nope')).toBeUndefined()
  })
})

describe('credential prefill', () => {
  it('filters the dropdown to the platform protocol', () => {
    expect(credentialOptions('SSH').map((o) => o.value)).toEqual(CREDENTIALS.SSH)
    expect(credentialOptions('SNMP').map((o) => o.value)).toEqual(CREDENTIALS.SNMP)
  })

  it('prefills when the monitor credential matches the protocol', () => {
    expect(prefillCredential(findMonitor('m-nxos'), 'SSH')).toBe('NXOS-SSH-Ops')
  })

  it('leaves it empty when the protocol does not match', () => {
    // The NX-OS box is monitored over SSH; asking for its SNMP credential must not invent one.
    expect(prefillCredential(findMonitor('m-nxos'), 'SNMP')).toBe('')
  })

  it('leaves it empty when the monitor has no credential on record', () => {
    expect(findMonitor('m-juniper').credential).toBeNull()
    expect(prefillCredential(findMonitor('m-juniper'), 'SNMP')).toBe('')
  })
})

describe('source interfaces', () => {
  it('offers the selected monitor its own interfaces', () => {
    const opts = interfaceOptions(findMonitor('m-nxos'))
    expect(opts.map((o) => o.value)).toContain('Ethernet1/48')
    expect(opts.map((o) => o.value)).not.toContain('ge-0/0/0')
  })
})
