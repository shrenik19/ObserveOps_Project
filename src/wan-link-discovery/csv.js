// src/wan-link-discovery/csv.js
// Bulk mode. One row per link, carrying exactly the fields the Single form asks per link — the
// same shape for every Device OS. Credential Profile, Timeout and the Operations Test Parameters
// stay on the form and apply to every row.
//
// The Bulk tab in the product shows no WAN Probe field, so the probe must be a column, and one file
// may therefore mix probe types. That is inferred from the screenshots, not observed in a CSV.

import { PLATFORMS, needsPort } from './platforms.js'

export const CSV_COLUMNS = [
  'wan_probe', 'isp', 'source_interface', 'source_router_location',
  'destination_ip', 'destination_router_location', 'udp_port',
]

const KEYS = ['probe', 'isp', 'iface', 'srcLocation', 'dip', 'dstLocation', 'port']
const MANDATORY = { probe: 'wan_probe', isp: 'isp', dip: 'destination_ip' }

const SAMPLE_ISPS = ['Airtel', 'Jio', 'Tata']
const SAMPLE_DIPS = ['8.8.8.8', '1.1.1.1', '9.9.9.9']

/** Three rows, cycling the platform's own probes and the monitor's own interfaces. */
export function sampleCsv(monitor, osKey) {
  const probes = PLATFORMS[osKey]?.probes ?? []
  const ifaces = monitor?.interfaces ?? []
  const rows = [0, 1, 2].map((i) => {
    const probe = probes[i % probes.length]
    return [
      probe,
      SAMPLE_ISPS[i],
      ifaces[i % ifaces.length] ?? '',
      'Pune DC',
      SAMPLE_DIPS[i],
      'Mumbai DC',
      needsPort(probe) ? String(5000 + i) : '',
    ].join(',')
  })
  return [CSV_COLUMNS.join(','), ...rows].join('\n')
}

export function parseCsv(text) {
  const lines = String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { rows: [], errors: ['The file is empty.'] }

  const header = lines[0].split(',').map((c) => c.trim())
  if (header.join(',') !== CSV_COLUMNS.join(',')) {
    return { rows: [], errors: [`Unexpected header. Expected: ${CSV_COLUMNS.join(', ')}`] }
  }

  const rows = []
  const errors = []
  lines.slice(1).forEach((line, i) => {
    const cells = line.split(',').map((c) => c.trim())
    const row = Object.fromEntries(KEYS.map((k, n) => [k, cells[n] ?? '']))
    const at = `row ${i + 1}`

    for (const [key, column] of Object.entries(MANDATORY)) {
      if (!row[key]) errors.push(`${at}: ${column} is required.`)
    }
    // The one conditional field, enforced per row rather than per file — a mixed file is legal.
    if (needsPort(row.probe) && !row.port) {
      errors.push(`${at}: udp_port is required for ${row.probe}.`)
    }
    rows.push(row)
  })

  return errors.length ? { rows: [], errors } : { rows, errors }
}
