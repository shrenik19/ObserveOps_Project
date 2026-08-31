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
  { key: 'monitors', label: 'Monitors', icon: 'monitor', screens: [] },
  { key: 'alerts', label: 'Alerts', icon: 'alert', screens: [] },
  { key: 'topology', label: 'Topology', icon: 'networkTopology', screens: [] },
  { key: 'reports', label: 'Reports', icon: 'report', screens: [] },
  { key: 'settings', label: 'Settings', icon: 'settings', screens: [] },
]

export const findModule = (mods, key) => mods.find((m) => m.key === key)

export const findScreen = (mods, moduleKey, screenKey) =>
  findModule(mods, moduleKey)?.screens.find((s) => s.key === screenKey)

// Flattened [{ module, screen }] pairs, in registry order — what the card grids are built from.
export const allScreens = (mods) =>
  mods.flatMap((module) => module.screens.map((screen) => ({ module, screen })))
