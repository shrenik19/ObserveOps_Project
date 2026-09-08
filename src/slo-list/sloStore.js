// The SLO estate behind artboard 1. No DOM and no DS — the screen renders this, and the tests
// assert it without a browser.
//
// `evaluation` is the quorum a redundant SLO holds (`2 of 3`), or null for Strict. It is NEVER a
// count of redundancy groups: one profile carries one group or is Strict, so a count says nothing.
// See 2026-09-01-redundancy-slo-design.md §4.

const SEED = [
  { id: 'slo-checkout', name: 'Checkout Availability', service: 'E-commerce Platform',
    status: 'up', frequency: 'Daily', evaluation: '2 of 3', target: '99%', achieved: '100%', violation: '0%' },
  { id: 'slo-payments', name: 'Payment Gateway Uptime', service: 'E-commerce Platform',
    status: 'up', frequency: 'Daily', evaluation: '3 of 4', target: '99%', achieved: '99.8%', violation: '0.2%' },
  { id: 'slo-search', name: 'Search & Catalogue', service: 'E-commerce Platform',
    status: 'critical', frequency: 'Daily', evaluation: null, target: '99%', achieved: '91.2%', violation: '8.8%' },
  { id: 'slo-core-sw', name: 'Core Switching Availability', service: 'Network Core',
    status: 'critical', frequency: 'Daily', evaluation: null, target: '95%', achieved: '23.9%', violation: '76.1%' },
  { id: 'slo-branch-wan', name: 'Branch WAN Links', service: 'Branch Connectivity',
    status: 'warning', frequency: 'Daily', evaluation: null, target: '98%', achieved: '98.4%', violation: '1.6%' },
]

// Severity order. A service shows the worst thing happening inside it; an average of SLOs with
// different Targets would not mean anything, and "the first one" would be an accident of order.
const RANK = { up: 0, warning: 1, critical: 2 }

export function createStore(seed = SEED) {
  const slos = seed.map((s) => ({ ...s }))

  const severestOf = (list) =>
    list.reduce((worst, s) => (RANK[s.status] > RANK[worst] ? s.status : worst), 'up')

  const services = () => [...new Set(slos.map((s) => s.service))]

  return {
    list: () => slos.map((s) => ({ ...s })),
    services,
    severestOf,
    groups: () =>
      services().map((service) => {
        const members = slos.filter((s) => s.service === service).map((s) => ({ ...s }))
        return { service, slos: members, count: members.length, status: severestOf(members) }
      }),
  }
}
