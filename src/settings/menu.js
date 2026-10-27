// The Settings section menu: the product's eighteen sections in the product's order (build 10.0.1).
// Sub-items are listed only for the sections that have design work in this app. Every other section
// still shows, drawn as a section, but holds one inert stand-in row and opens nothing. No DOM, no DS.
//
// A leaf's `key` is its route: #/settings/<key>. `screen` names the registry screen that fills the
// pane (src/app/registry.js, module `settings`); `view` is passed on to that screen's mount. A leaf
// with no `screen` opens the placeholder.
//
// obs-side-menu identifies items by LABEL — `active` is a label and `select` reports one — so every
// label in this tree must be unique. A test enforces it.

import { SDP } from '../integrations/catalogue.js'

const slug = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const leaf = (label, extra = {}) => ({ key: slug(label), label, ...extra })

// obs-side-menu draws an item as a section only if it has children (DS-GAPS G56), so a section with
// no design work carries this one row. It has no route; picking it changes nothing.
export const STUB_LABEL = 'Not in this design yet'
const untouched = (label, icon) => ({ label, icon, children: [{ label: STUB_LABEL, stub: true }] })

export const SECTIONS = [
  {
    label: 'My Account', icon: 'myAccount',
    children: [
      leaf('My Profile', { screen: 'my-profile' }),
      leaf('UI Preference'),
      leaf('License'),
    ],
  },
  untouched('User Settings', 'userSettings'),
  untouched('System Settings', 'systemSettings'),
  {
    label: 'Policy Settings', icon: 'policySettings',
    children: [
      leaf('Metric Policy'),
      leaf('Log Policy'),
      leaf('Flow Policy'),
      leaf('Trap Policy'),
      leaf('NetRoute Policy'),
      leaf('APM Policy'),
      leaf('Network Config Policy'),
      leaf('RUM Policy'),
    ],
  },
  {
    label: 'Discovery Settings', icon: 'networkDiscovery',
    children: [
      leaf('Credential Profile'),
      leaf('Discovery Profile', { screen: 'wan-link-discovery' }),
    ],
  },
  untouched('Monitor Settings', 'monitor'),
  untouched('Network Config Settings', 'ncm'),
  untouched('Compliance Settings', 'ruleCompliance'),
  {
    label: 'SNMP Trap', icon: 'snmpTrapSettings',
    children: [
      leaf('SNMP Trap Profile'),
      leaf('SNMP Trap Forwarder'),
      leaf('SNMP Trap Listener'),
    ],
  },
  untouched('Observability Pipeline', 'pipeline'),
  untouched('Flow Settings', 'flow'),
  {
    label: 'Plugin Library', icon: 'pluginLibrary',
    children: [
      leaf('Runbook'),
      leaf('Metric', { key: 'metric-plugin' }),
      leaf('Topology', { key: 'topology-plugin' }),
      leaf('Log Parser Plugin'),
    ],
  },
  untouched('Dependency Mapper', 'networkTopology'),
  {
    label: 'Service Level Objective', icon: 'slo', count: 'BETA',
    children: [
      leaf('SLO Profile', { screen: 'slo-profile' }),
      leaf('Correction Profile'),
      leaf('Penalty Profile'),
    ],
  },
  untouched('Utility', 'utility'),
  {
    label: 'APM', icon: 'apm',
    children: [leaf('Application Registration')],
  },
  untouched('Real User Monitoring', 'rum'),
  {
    label: 'Integration', icon: 'integration',
    children: [
      leaf('Integration Profile', { screen: 'integration', view: 'Integration Profile' }),
      leaf('Motadata ServiceOps'),
      leaf('ServiceNow'),
      // Not in the product's menu: this app's own addition, tagged as such.
      leaf(SDP, { screen: 'integration', view: SDP, count: 'NEW' }),
      leaf('Atlassian Jira'),
      leaf('Microsoft Teams'),
      leaf('Slack'),
      leaf('LAMA', { screen: 'lama' }),
      leaf('Geo Map'),
    ],
  },
]

export const DEFAULT_KEY = 'my-profile'

// Every item that has a route, with the section it sits in. Stand-in rows are left out.
export const LEAVES = SECTIONS.flatMap((section) =>
  section.children.filter((item) => !item.stub).map((item) => ({ ...item, section })))

// Routes that predate this menu, kept so already-shared links still land on the right item.
const ALIASES = { 'wan-link-discovery': 'discovery-profile' }

// The Integration landing — a card per integration — has a route but no menu item of its own.
const INTEGRATION = SECTIONS.find((s) => s.label === 'Integration')
export const INTEGRATION_LANDING = {
  key: 'integration', label: 'Integration', screen: 'integration', view: '', section: INTEGRATION, inMenu: false,
}

export const leafByKey = (key) => LEAVES.find((l) => l.key === key)
export const leafByLabel = (label) => LEAVES.find((l) => l.label === label)

/**
 * '#/settings/slo-profile' -> the SLO Profile leaf. Unknown or missing keys fall back to My Profile,
 * which is where Settings opens. '#/settings/integration?view=<label>' is the old Integration deep
 * link; it resolves to that integration's own item.
 */
export function leafFromHash(hash) {
  const [path, query = ''] = String(hash || '').replace(/^#/, '').split('?')
  const key = path.split('/').filter(Boolean)[1] ?? ''

  if (key === 'integration') {
    const view = new URLSearchParams(query).get('view')
    const named = view && leafByLabel(view)
    return named && named.section === INTEGRATION ? named : INTEGRATION_LANDING
  }
  return leafByKey(ALIASES[key] ?? key) ?? leafByKey(DEFAULT_KEY)
}

// The menu model obs-side-menu takes: {label, icon?, count?, children?} and nothing else.
const toItem = ({ label, icon, count, children }) => ({
  label,
  ...(icon && { icon }),
  ...(count && { count }),
  ...(children && { children: children.map(toItem) }),
})

export const menuItems = () => SECTIONS.map(toItem)

// The markup seed for a menu opening on `leaf`: only its own section. obs-side-menu opens the
// first section with children when it is created and never recomputes (DS-GAPS G53), so seeding
// with one section opens exactly that one; the full list is assigned after mount.
export const seedItems = (leaf) => [toItem(leaf.section)]
