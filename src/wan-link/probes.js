// The NX-OS WAN Link template, derived from what `show ip sla statistics` actually reports.
// See docs/superpowers/specs/2026-09-01-nxos-wan-link-design.md for the full counter mapping.

export const PROBES = {
  'icmp-echo': { key: 'icmp-echo', label: 'ICMP Echo', needsPort: false },
  'udp-echo': { key: 'udp-echo', label: 'UDP Echo', needsPort: true },
  'udp-jitter': { key: 'udp-jitter', label: 'UDP Jitter', needsPort: true },
}

const link = (id, probe, carrier, src, dst, iface, status, rtt) => ({
  id,
  probe,
  name: `nxos${probe.replace('-', '')}-${carrier}-${src}→${dst}`,
  monitor: 'site2.test2.com',
  sourceIp: src,
  destinationIp: dst,
  sourceInterface: iface,
  // The product leaves RTT empty on a down link rather than showing a stale number.
  rtt: status === 'down' ? '' : rtt,
  status,
})

export const LINKS = [
  link('l1', 'icmp-echo', 'Jio', '70.70.70.2', '70.70.70.1', 'Eth1/1', 'up', '12 ms'),
  link('l2', 'icmp-echo', 'Airtel', '70.70.70.2', '172.16.14.53', 'Eth1/2', 'up', '8 ms'),
  link('l3', 'icmp-echo', 'Vodafone', '172.16.14.52', '70.70.70.1', 'Eth1/3', 'down', ''),
  link('l4', 'icmp-echo', 'Docomo', '172.16.14.52', '65.65.65.1', 'Eth1/4', 'up', '19 ms'),
  link('l5', 'icmp-echo', 'Aircel', '192.168.60.1', '172.16.14.51', 'Eth1/5', 'clear', '7 ms'),
  link('l6', 'udp-echo', 'Airtel', '70.70.70.2', '70.70.70.1', 'Eth1/6', 'up', '9 ms'),
  link('l7', 'udp-echo', 'Jio', '70.70.70.2', '65.65.65.2', 'Eth1/7', 'up', '14 ms'),
  link('l8', 'udp-echo', 'Vodafone', '172.16.14.52', '70.70.70.1', 'Eth1/8', 'down', ''),
  link('l9', 'udp-echo', 'Docomo', '172.16.14.52', '172.16.14.53', 'Eth1/9', 'warning', '31 ms'),
  link('l10', 'udp-jitter', 'VI', '70.70.70.2', '70.70.70.1', 'Eth2/1', 'up', '15 ms'),
  link('l11', 'udp-jitter', 'Airtel', '172.16.14.52', '70.70.70.1', 'Eth2/2', 'up', '11 ms'),
  link('l12', 'udp-jitter', 'Jio', '60.60.60.2', '60.60.60.1', 'Eth2/3', 'down', ''),
  link('l13', 'udp-jitter', 'Aircel', '172.16.14.52', '65.65.65.2', 'Eth2/4', 'critical', '87 ms'),
  link('l14', 'udp-jitter', 'Docomo', '192.168.60.1', '172.16.14.53', 'Eth2/5', 'up', '22 ms'),
]

const ECHO_WINDOWS = ['Last Day', 'Last 7 Days', 'Last 15 Days']
const JITTER_WINDOWS = ['7 Days', '15 Days', '30 Days']

export const availabilityWindows = (probeKey) =>
  (probeKey === 'udp-jitter' ? JITTER_WINDOWS : ECHO_WINDOWS)

const XT = ['12:00', '18:00', '24:00', '06:00', '12:00']
const YT = ['120', '85', '65', '35', '0']

// Both echo probes report a single timing value, `Latest RTT`. There is no min or max, so the two
// extra RTT History charts in the XE/XR template have no source and are not carried over.
const ECHO_CHARTS = [
  { row: 'A', title: "Today's Availability", span: 2, kind: 'donut', series: [] },
  { row: 'A', title: 'Availability Statistics', span: 4, kind: 'bars', series: [] },
  {
    row: 'A', title: 'RTT History', span: 6, kind: 'line', flat: true,
    series: ['ipsla.latency.ms.avg'],
    yTicks: ['8 ms'], xTicks: ['1. Sep', '04:00', '08:00', '12:00', '16:00'],
  },
]

const LOSS_SERIES = [
  'Loss Periods', 'Period Length Min', 'Period Length Max',
  'Inter-Loss Length Min', 'Inter-Loss Length Max',
]

const JITTER_CHARTS = [
  { row: 'A', title: "Today's Availability", span: 2, kind: 'donut', series: [] },
  { row: 'A', title: 'Availability Last 30 Days', span: 4, kind: 'bars', series: [] },
  {
    row: 'A', title: 'RTT History', span: 6, kind: 'line',
    series: ['Min. RTT', 'Avg. RTT', 'Max. RTT'],
    yTicks: ['25', '20', '15', '10', '5', '0'], xTicks: XT,
  },

  {
    row: 'B', title: 'Source to Destination Jitter', span: 4, kind: 'line',
    series: ['Min. Jitter', 'Avg. Jitter', 'Max. Jitter'], yTicks: YT, xTicks: XT,
  },
  {
    row: 'B', title: 'Destination to Source Jitter', span: 4, kind: 'line',
    series: ['Min. Jitter', 'Avg. Jitter', 'Max. Jitter'], yTicks: YT, xTicks: XT,
  },
  {
    row: 'B', title: 'Packet Loss Statistics', span: 4, kind: 'line',
    series: ['Packet Skipped', 'Out Of Sequence', 'Packet Late Arrival', 'Tail Drop'],
    yTicks: YT, xTicks: XT,
  },

  {
    row: 'C', title: 'Source to Destination Latency', span: 6, kind: 'line',
    series: ['Min. Latency', 'Avg. Latency', 'Max. Latency'], yTicks: YT, xTicks: XT,
  },
  {
    row: 'C', title: 'Destination to Source Latency', span: 6, kind: 'line',
    series: ['Min. Latency', 'Avg. Latency', 'Max. Latency'], yTicks: YT, xTicks: XT,
  },

  {
    row: 'D', title: 'Source to Destination Loss Periods', span: 6, kind: 'line',
    series: LOSS_SERIES, yTicks: ['20', '15', '10', '5', '0'], xTicks: XT,
  },
  {
    row: 'D', title: 'Destination to Source Loss Periods', span: 6, kind: 'line',
    series: LOSS_SERIES, yTicks: ['20', '15', '10', '5', '0'], xTicks: XT,
  },
]

// Values are the ones from the NX-OS sample output, so every tile traces back to a CLI line.
const JITTER_TILES = [
  {
    title: 'RTT', caption: 'Avg: 2 ms',
    values: [{ label: 'Min', value: '1', unit: 'ms' }, { label: 'Max', value: '4', unit: 'ms' }],
  },
  { title: 'SRC to DST Jitter', caption: '', values: [{ label: '', value: '1', unit: 'ms' }] },
  { title: 'DST to SRC Jitter', caption: '', values: [{ label: '', value: '1', unit: 'ms' }] },
  { title: 'SRC to DST Latency', caption: '', values: [{ label: '', value: '0', unit: 'ms' }] },
  { title: 'DST to SRC Latency', caption: '', values: [{ label: '', value: '0', unit: 'ms' }] },
  {
    title: 'Packet Lost', caption: '',
    values: [
      { label: 'SRC to DST', value: '0', unit: '' },
      { label: 'DST to SRC', value: '0', unit: '' },
    ],
  },
]

export const tilesFor = (probeKey) => (probeKey === 'udp-jitter' ? JITTER_TILES : [])

export const chartsFor = (probeKey) => (probeKey === 'udp-jitter' ? JITTER_CHARTS : ECHO_CHARTS)
