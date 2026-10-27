// Create Custom Report -> SLO: the report types, the SLO query's option lists, and the preview's
// columns and rows. No DOM, no DS. Option lists are the product's (user-confirmed screenshots).

import { SLO_PROFILES, INSTANCE_NAMES } from './sloReportData.js'

// The product's eighteen tiles in its order, then SLO.
export const REPORT_TYPES = [
  'Availability', 'Performance', 'Inventory', 'Active Alerts',
  'Availability Flap Summary', 'Metric Alerts', 'Audit', 'Log Events',
  'Trap Events', 'Log Analytics', 'Flow Analytics', 'Custom Script',
  'Polling Data', 'Historical Trend', 'Compliance', 'APM',
  'RUM', 'NetRoute', 'SLO',
]

// This design covers SLO only; the other tiles show but do nothing.
export const CLICKABLE = new Set(['SLO'])

export const SLO_TYPES = ['SLO', 'Metric', 'APM', 'RUM', 'NetRoute']

const COUNTER_NAMES = ['achieved.percent', 'violated.percent', 'error.budget.left.percent', 'mttr.seconds', 'mtbf.seconds', 'burn.rate']

// The SLO type reports on SLOs (slo.*); every other type on the instances behind them (slo.instance.*).
export const countersFor = (sloType) =>
  COUNTER_NAMES.map((c) => (sloType === 'SLO' ? `slo.${c}` : `slo.instance.${c}`))

export const AGGREGATIONS = ['Last']
export const SOURCE_FILTERS = ['Performance SLO', 'Availability SLO']
export const WIDGET_TYPES = ['Grid', 'Top N']
export const TOPN_VIEWS = [
  { key: 'area', label: 'Area' },
  { key: 'line', label: 'Line' },
  { key: 'hbar', label: 'Horizontal Bar' },
  { key: 'vbar', label: 'Vertical Bar' },
  { key: 'pie', label: 'Pie' },
  { key: 'gauge', label: 'Solid Gauge' },
  { key: 'grid', label: 'Grid' },
]
export const ORIENTATIONS = ['Auto', 'Portrait', 'Landscape']

const kindOf = (filter) => filter.replace(' SLO', '')

export const sourcesFor = (filter) =>
  filter ? SLO_PROFILES.filter((p) => p.kind === kindOf(filter)).map((p) => p.name) : []

export function previewColumns({ sloType, counters }) {
  return [
    { key: 'id', title: 'SLO.ID' },
    { key: 'name', title: 'SLO.PROFILE.NAME' },
    ...(sloType === 'SLO' ? [] : [{ key: 'instance', title: 'INSTANCE' }]),
    ...counters.filter(Boolean).map((c) => ({ key: c, title: c.toUpperCase() })),
    { key: 'target', title: 'SLO.TARGET' },
    { key: 'service', title: 'SLO.PROFILE.BUSINESS SERVICE' },
    { key: 'tags', title: 'SLO.PROFILE.TAGS' },
    { key: 'frequency', title: 'SLO.FREQUENCY' },
    { key: 'profileType', title: 'SLO.PROFILE.TYPE' },
  ]
}

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d

// Every counter derives from one achieved percent, so a row's numbers agree with each other. `seed`
// varies instances of one profile without randomness — the preview must not flicker.
function counterValue(counter, achieved, target, seed) {
  const name = counter.replace(/^slo\.(instance\.)?/, '')
  const violated = round(100 - achieved)
  const budget = 100 - target
  switch (name) {
    case 'achieved.percent': return achieved
    case 'violated.percent': return violated
    case 'error.budget.left.percent': return round(budget ? ((budget - violated) / budget) * 100 : 0)
    case 'mttr.seconds': return Math.round(violated * 36 + 60 + seed * 7)
    case 'mtbf.seconds': return Math.round(achieved * 864 + seed * 13)
    case 'burn.rate': return round(budget ? violated / budget : 0, 2)
    default: return 0
  }
}

// The Source Filter picks a kind of SLO; Source, if any are picked, narrows within it.
export function previewRows({ sloType, counters, sourceFilter = '', sources = [] }) {
  const picked = SLO_PROFILES
    .filter((p) => !sourceFilter || p.kind === kindOf(sourceFilter))
    .filter((p) => !sources.length || sources.includes(p.name))
  const base = (p) => ({
    id: p.id, name: p.name, target: p.target, service: p.service, tags: [...p.tags],
    frequency: p.frequency, profileType: p.kind,
  })
  const withCounters = (row, achieved, seed) => {
    for (const c of counters.filter(Boolean)) row[c] = counterValue(c, achieved, row.target, seed)
    return row
  }

  if (sloType === 'SLO') return picked.map((p) => withCounters(base(p), p.achieved, 0))

  const names = INSTANCE_NAMES[sloType] ?? []
  return picked.flatMap((p) => [0, 1].map((k) => {
    const instance = names[(p.id - 1 + k * 3) % names.length]
    // The second instance runs a little behind the first, capped at 100.
    const achieved = Math.min(100, round(p.achieved - k * 1.7 + 0.4))
    return withCounters({ ...base(p), id: `${p.id}-${k + 1}`, instance }, achieved, k + 1)
  }))
}
