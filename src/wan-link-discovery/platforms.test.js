import { describe, it, expect } from 'vitest'
import {
  VENDORS, PLATFORMS, osOptions, probeOptions, needsPort, hasTemplate, slaTitle,
} from './platforms.js'

describe('platform matrix', () => {
  it('carries exactly the four platforms', () => {
    expect(Object.keys(PLATFORMS)).toEqual(['ios-xe', 'ios-xr', 'nx-os', 'rpm'])
  })

  it('gives every platform exactly one method', () => {
    expect(PLATFORMS['ios-xe'].method).toBe('SNMP')
    expect(PLATFORMS['ios-xr'].method).toBe('SSH')
    expect(PLATFORMS['nx-os'].method).toBe('SSH')
    expect(PLATFORMS['rpm'].method).toBe('SNMP')
  })

  it('lists each platform its own probes', () => {
    expect(PLATFORMS['ios-xe'].probes).toEqual(['ICMP Echo', 'ICMP Jitter', 'Path Echo'])
    expect(PLATFORMS['ios-xr'].probes).toEqual([
      'ICMP Echo', 'UDP Echo', 'UDP Jitter', 'ICMP Path Echo', 'ICMP Path Jitter',
    ])
    expect(PLATFORMS['nx-os'].probes).toEqual(['ICMP Echo', 'UDP Echo', 'UDP Jitter'])
    expect(PLATFORMS['rpm'].probes).toEqual(['ICMP Ping'])
  })

  it('does not normalise probe names across platforms', () => {
    expect(PLATFORMS['ios-xe'].probes).toContain('Path Echo')
    expect(PLATFORMS['ios-xr'].probes).toContain('ICMP Path Echo')
    expect(PLATFORMS['rpm'].probes).toContain('ICMP Ping')
    expect(PLATFORMS['rpm'].probes).not.toContain('ICMP Echo')
  })

  it('cascades Device OS from Vendor', () => {
    expect(VENDORS).toEqual(['Cisco Systems', 'Juniper'])
    expect(osOptions('Cisco Systems').map((o) => o.value)).toEqual(['ios-xe', 'ios-xr', 'nx-os'])
    expect(osOptions('Juniper').map((o) => o.value)).toEqual(['rpm'])
    expect(osOptions('Cisco Systems')[2].text).toBe('NX-OS')
  })

  it('needs a UDP port for exactly the two UDP probes', () => {
    expect(needsPort('UDP Echo')).toBe(true)
    expect(needsPort('UDP Jitter')).toBe(true)
    expect(needsPort('ICMP Echo')).toBe(false)
    expect(needsPort('ICMP Ping')).toBe(false)
    expect(needsPort('ICMP Path Jitter')).toBe(false)
  })

  it('marks the probes that have no monitor template', () => {
    expect(hasTemplate('ICMP Echo')).toBe(true)
    expect(hasTemplate('UDP Echo')).toBe(true)
    expect(hasTemplate('UDP Jitter')).toBe(true)
    expect(hasTemplate('Path Echo')).toBe(false)
    expect(hasTemplate('ICMP Path Jitter')).toBe(false)
    expect(hasTemplate('ICMP Ping')).toBe(false)
  })

  it('labels every probe with its own name, unqualified', () => {
    const xe = probeOptions('ios-xe')
    expect(xe[0]).toEqual({ value: 'ICMP Echo', text: 'ICMP Echo' })
    expect(xe[2]).toEqual({ value: 'Path Echo', text: 'Path Echo' })
    // Every option on every platform, keys taken from PLATFORMS itself so the list cannot go
    // stale — no caveat can creep back onto a single probe unnoticed.
    const all = Object.keys(PLATFORMS).flatMap((os) => probeOptions(os))
    expect(all.length).toBeGreaterThan(xe.length) // the sweep really covered more than one platform
    for (const o of all) expect(o.text).toBe(o.value)
  })

  it('names the Operations block after the vendor', () => {
    expect(slaTitle('Cisco Systems')).toBe('IP SLA Operations Test Parameters')
    expect(slaTitle('Juniper')).toBe('Juniper RPM Operations Test Parameters')
  })
})
