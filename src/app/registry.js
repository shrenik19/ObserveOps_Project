// The single source of truth for what this app contains.
//
// To add a screen: write `src/<name>/screen.js` exporting `meta` and `mount(root)`, then add one
// entry to the right module's `screens` array below. It gets a sidebar module, a route, and a card
// on the Overview — all generated from this file. Nothing else needs editing.
//
// The module list is the product's own taxonomy, and is deliberately kept even where a module has
// no screens yet: those render in the sidebar and do nothing when clicked.

export const modules = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', screens: [] },
  {
    key: 'monitors', label: 'Monitors', icon: 'monitor',
    screens: [
      {
        key: 'wan-link',
        label: 'WAN Link',
        description:
          'Cisco NX-OS WAN Link monitoring: ICMP Echo, UDP Echo and UDP Jitter probes, each with ' +
          'a detail drawer built from the counters `show ip sla statistics` actually reports.',
        load: () => import('../wan-link/screen.js'),
      },
    ],
  },
  {
    key: 'slo', label: 'SLO', icon: 'slo',
    screens: [
      {
        key: 'list',
        label: 'SLO',
        description:
          'The SLO estate: Strict and Redundant SLOs side by side, and the same estate regrouped ' +
          'under its Business Services with each service carrying the severest status of its SLOs.',
        load: () => import('../slo-list/screen.js'),
      },
    ],
  },
  { key: 'alerts', label: 'Alerts', icon: 'alert', screens: [] },
  { key: 'topology', label: 'Topology', icon: 'networkTopology', screens: [] },
  {
    key: 'reports', label: 'Reports', icon: 'report',
    screens: [
      {
        key: 'categories',
        label: 'Report module',
        description:
          'Category-level Public/Private visibility and sharing. Paired padlock indicators, a ' +
          'hover-only custom-category marker, and a four-step delete flow that reassigns or ' +
          'force-deletes the reports inside a category.',
        load: () => import('../report-categories/screen.js'),
      },
    ],
  },
  {
    key: 'settings', label: 'Settings', icon: 'settings',
    screens: [
      {
        key: 'lama',
        label: 'LAMA integration',
        description:
          'The Create LAMA Profile drawer: interval or fixed-time scheduling, a counter catalogue ' +
          'driven by the chosen Trading API with per-counter aggregation, and repeating metadata fields.',
        load: () => import('../lama/screen.js'),
      },
      {
        key: 'wan-link-discovery',
        label: 'WAN Link discovery',
        description:
          'WAN Link as a category in the Discovery Profile tree: pick an already-monitored router, ' +
          'declare the link, push the IP SLA operation and provision what verified. Cisco IOS XE, ' +
          'IOS XR and NX-OS, plus Juniper RPM.',
        load: () => import('../wan-link-discovery/screen.js'),
      },
      {
        key: 'slo-profile',
        label: 'SLO Profile',
        description:
          'Settings -> Service Level Objective -> SLO Profile: the shipped profile table with ' +
          'Evaluation Logic beside Frequency, and the Create SLO Profile form behind it.',
        load: () => import('../slo-profile/screen.js'),
      },
    ],
  },
]

export const findModule = (mods, key) => mods.find((m) => m.key === key)

export const findScreen = (mods, moduleKey, screenKey) =>
  findModule(mods, moduleKey)?.screens.find((s) => s.key === screenKey)

// Flattened [{ module, screen }] pairs, in registry order — what the card grids are built from.
export const allScreens = (mods) =>
  mods.flatMap((module) => module.screens.map((screen) => ({ module, screen })))
