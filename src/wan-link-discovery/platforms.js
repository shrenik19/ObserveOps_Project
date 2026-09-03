// The platform matrix behind WAN Link discovery.
// See docs/superpowers/specs/2026-09-02-wan-link-discovery-design.md.
//
// Two independent tables, not four bespoke forms: the probe list varies by PLATFORM, and the field
// set varies by PROBE. Everything else on the form is shared.

export const VENDORS = ['Cisco Systems', 'Juniper']

export const PLATFORMS = {
  'ios-xe': {
    key: 'ios-xe', vendor: 'Cisco Systems', label: 'IOS XE', method: 'SNMP',
    probes: ['ICMP Echo', 'ICMP Jitter', 'Path Echo'],
  },
  'ios-xr': {
    key: 'ios-xr', vendor: 'Cisco Systems', label: 'IOS XR', method: 'SSH',
    probes: ['ICMP Echo', 'UDP Echo', 'UDP Jitter', 'ICMP Path Echo', 'ICMP Path Jitter'],
  },
  'nx-os': {
    key: 'nx-os', vendor: 'Cisco Systems', label: 'NX-OS', method: 'SSH',
    probes: ['ICMP Echo', 'UDP Echo', 'UDP Jitter'],
  },
  rpm: {
    key: 'rpm', vendor: 'Juniper', label: 'RPM', method: 'SNMP',
    probes: ['ICMP Ping'],
  },
}

// Probe names are the platform's OWN vocabulary and are deliberately not unified: IOS XE says
// `Path Echo` where IOS XR says `ICMP Path Echo`, and Juniper says `ICMP Ping` where Cisco says
// `ICMP Echo`. The device CLI is what a network engineer will check the UI against.

/** The only conditional field on the form. UDP addresses a port; ICMP does not. */
const PORT_PROBES = ['UDP Echo', 'UDP Jitter']
export const needsPort = (probe) => PORT_PROBES.includes(probe)

// Only the three NX-OS probes have a monitor template today. The others create a valid operation
// that nothing can yet render, so the dropdown says so rather than leaving it silent.
const TEMPLATED = ['ICMP Echo', 'UDP Echo', 'UDP Jitter']
export const hasTemplate = (probe) => TEMPLATED.includes(probe)

export const platformsFor = (vendor) =>
  Object.values(PLATFORMS).filter((p) => p.vendor === vendor)

export const osOptions = (vendor) =>
  platformsFor(vendor).map((p) => ({ value: p.key, text: p.label }))

export const probeOptions = (osKey) =>
  (PLATFORMS[osKey]?.probes ?? []).map((probe) => ({
    value: probe,
    text: hasTemplate(probe) ? probe : `${probe}   (no monitor template yet)`,
  }))

/** The Operations block is named by the vendor — the product already varies this string. */
export const slaTitle = (vendor) =>
  vendor === 'Juniper'
    ? 'Juniper RPM Operations Test Parameters'
    : 'IP SLA Operations Test Parameters'
