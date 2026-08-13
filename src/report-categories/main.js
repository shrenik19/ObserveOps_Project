import '@mtdt/observeops-ds-elements'
// NOT '@mtdt/observeops-ds-css/dist/observeops-ds.css' — that path is absent from the package's
// exports map and throws under Vite. See the reference doc, correction 7.
import '@mtdt/observeops-ds-css/observeops-ds.css'
// Populates globalThis.__OBS_LOGOS__, which obs-logo reads; the elements bundle does not import it.
// G12 is FIXED as of elements@0.1.143 — `./logos` is now in the package's exports map, so this is a
// plain import. (Before 0.1.143 every path was ERR_PACKAGE_PATH_NOT_EXPORTED and this needed a Vite
// alias.) Without it every <obs-logo> still renders "?", including obs-sidebar's default.
import '@mtdt/observeops-ds-elements/logos'

import { createStore } from './store.js'
import { renderCategorySettingsPanel } from './categorySettingsPanel.js'
import './categorySettingsPanel.css'
import { augmentCategoryRows } from './augmentSideMenu.js'
import { renderDeleteConfirmDialog } from './deleteConfirmDialog.js'
import './deleteConfirmDialog.css'
import './hostPage.css'

const builtin = (id, name, visibility = 'public', sharedWith = []) => ({
  id,
  name,
  type: 'builtin',
  visibility,
  sharedWith,
})

const seedCategories = [
  builtin('all-reports', 'All Reports'),
  builtin('config', 'Config'),
  builtin('windows', 'Windows'),
  { id: 'inventory', name: 'Inventory', type: 'custom', visibility: 'private', sharedWith: [{ type: 'user', id: 'u1' }] },
  builtin('flow-reports', 'Flow Reports'),
  builtin('wan-link', 'WAN Link'),
  builtin('alert', 'Alert'),
  builtin('virtualization', 'Virtualization'),
  builtin('availability', 'Availability'),
  { id: 'wireless', name: 'Wireless', type: 'custom', visibility: 'public', sharedWith: [] },
  builtin('performance', 'Performance'),
  builtin('network', 'Network'),
  builtin('server', 'Server'),
  builtin('service-check', 'Service Check'),
]

// Stands in for the real users/profiles endpoint.
const directory = [
  { type: 'user', id: 'u1', label: 'Alice Chen' },
  { type: 'user', id: 'u2', label: 'Ravi Menon' },
  { type: 'user', id: 'u3', label: 'Sam Okafor' },
  { type: 'profile', id: 'p1', label: 'Ops Team' },
  { type: 'profile', id: 'p2', label: 'Network Admins' },
]

// Reports shown in the content area, so the category filter has something to act on.
// `schedule` is a real boolean and `favorite` a real flag — obs-table's typed cells render them as
// controls (see the column config below).
const report = (id, name, category, description, type, reportType, on = false, favorite = false) => ({
  id,
  category,
  description,
  type,
  reportType,
  schedule: on,
  favorite,
  // The product's NAME cell is ★ + report name together, under the NAME header. A type="link"
  // cell ({text, icon, href}) is the only cell that renders an icon beside text.
  name: { text: name, icon: favorite ? 'filledStar' : 'star', href: '#' },
  // type="button" cell → { text?, icon?, variant? }
  download: { icon: 'download', variant: 'transparent' },
})

const reports = [
  report('r1', '3rd August Training', 'config', '', 'Performance', 'Custom'),
  report('r2', 'Active Alerts', 'alert', 'Active Alerts', 'Active Alerts', 'Default', true, true),
  report('r3', 'Alert Report', 'alert', '', 'Active Alerts', 'Custom'),
  report('r4', 'All Access Point Availability', 'wireless', 'All Access Point Availability', 'Availability', 'Default'),
  report('r5', 'All Devices System CPU Percent', 'performance', 'All Devices System CPU Percent', 'Custom Script', 'Default'),
  report('r6', 'All Down Interfaces', 'network', 'All Down Interfaces', 'Active Alerts', 'Default'),
  report('r7', 'All Down Monitors', 'availability', 'All Down Monitors', 'Active Alerts', 'Default'),
  report('r8', 'All Interface Availability', 'network', 'All Interface Availability', 'Availability', 'Default'),
  report('r9', 'All Monitor Availability', 'availability', 'All Monitor Availability', 'Availability', 'Default'),
  report('r10', 'All Network Interface Availability', 'network', 'All Network Interface Availability', 'Custom Script', 'Default'),
  report('r11', 'All Network Monitor Availability', 'network', 'All Network Monitor Availability', 'Availability', 'Default'),
  report('r12', 'All Network Monitors Performance', 'performance', 'All Network Monitors Performance', 'Custom Script', 'Default'),
  report('r13', 'Windows Service Status', 'windows', 'Windows Service Status', 'Availability', 'Default'),
  report('r14', 'Switch Inventory', 'inventory', 'Switch Inventory', 'Inventory', 'Custom'),
  report('r15', 'Firmware Compliance', 'inventory', 'Firmware Compliance', 'Inventory', 'Custom', true),
  report('r16', 'SSID Utilisation', 'wireless', 'SSID Utilisation', 'Performance', 'Default'),
  report('r17', 'WAN Link Utilisation', 'wan-link', 'WAN Link Utilisation', 'Performance', 'Default'),
  report('r18', 'VM Host Summary', 'virtualization', 'VM Host Summary', 'Performance', 'Default'),
  report('r19', 'Server Disk Usage', 'server', 'Server Disk Usage', 'Performance', 'Default'),
  report('r20', 'Service Check Summary', 'service-check', 'Service Check Summary', 'Availability', 'Default'),
]

const store = createStore(seedCategories)
const menu = document.getElementById('category-list')
const panelRoot = document.getElementById('panel-root')
const dialogRoot = document.getElementById('dialog-root')
const table = document.getElementById('reports-table')

document.getElementById('module-nav').items = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'monitors', label: 'Monitors', icon: 'monitor' },
  { key: 'alerts', label: 'Alerts', icon: 'alert' },
  { key: 'topology', label: 'Topology', icon: 'networkTopology' },
  { key: 'reports', label: 'Reports', icon: 'report' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
]

// Account links for the header's user menu; `select` reports which was chosen.
const userMenu = document.getElementById('user-menu')
userMenu.items = [
  { key: 'profile', label: 'My Profile', icon: 'userCircle' },
  { key: 'preferences', label: 'Preferences', icon: 'settings' },
  { key: 'about', label: 'About', icon: 'infoCircle', divider: true },
]

document.getElementById('app-header').actions = [
  { icon: 'search', label: 'Search' },
  { icon: 'bell', label: 'Notifications', badge: 3 },
]

// obs-tabs normalizes each item as { key: key ?? label, label: label ?? key } — it is { key, label },
// NOT the { value, text } shape obs-radio and obs-select use. Set as a JSON attribute so the value
// survives regardless of upgrade timing.
const reportTabs = ['Metric', 'Log', 'Flow', 'Trap', 'Audit', 'NCCM', 'APM', 'RUM', 'NetRoute', 'Log Compliance']
const tabsEl = document.getElementById('report-tabs')
tabsEl.setAttribute('tabs', JSON.stringify(reportTabs.map((label) => ({ key: label.toLowerCase(), label }))))
tabsEl.setAttribute('value', 'metric')

// Typed cells — obs-table escapes cell VALUES as text, so a control must be declared via the
// column's `type`, never passed as markup. type switch/icon/link/button landed in elements@0.1.146
// (gap G1); before that these four columns could not be built at all.
table.columns = [
  { key: 'name', title: 'NAME', type: 'link', sortable: true },
  { key: 'description', title: 'DESCRIPTION' },
  { key: 'type', title: 'TYPE', sortable: true, width: 160 },
  { key: 'reportType', title: 'REPORT TYPE', sortable: true, width: 150 },
  { key: 'schedule', title: 'SCHEDULE', type: 'switch', width: 120 },
  { key: 'download', title: 'DOWNLOAD', type: 'button', width: 120, align: 'center' },
]

// Every typed cell reports through one event: { id, key, type, value }.
table.addEventListener('cellaction', (event) => {
  const action = detailValue(event)
  if (!action) return
  const row = reports.find((r) => r.id === action.id)
  if (!row) return

  if (action.key === 'schedule') row.schedule = !row.schedule

  // The name cell holds two controls: the ★ favourites, the text opens the report. `part` tells
  // them apart — added in elements@0.1.159 (G15), which retired a shadow-root binding here.
  if (action.key === 'name' && action.part === 'icon') {
    row.favorite = !row.favorite
    row.name = { ...row.name, icon: row.favorite ? 'filledStar' : 'star' }
  }
  // part === 'text' would open the report; `download` would start a download, in a real app.

  render(store.getCategories())
})

table.rowActions = [
  { key: 'run', label: 'Run now', icon: 'play' },
  { key: 'download', label: 'Download', icon: 'download' },
  { key: 'edit', label: 'Edit', icon: 'pencil' },
  { key: 'delete', label: 'Delete', icon: 'trash', danger: true },
]

// --- Filter bar --------------------------------------------------------------------------------
// obs-filters kind="bar". Contract as of elements@0.1.150:
//   fields  → [{ key, label, type:'enum'|'string', values:[…] }]
//   value   → active conditions [{ field, operator, value }]  (value=[] renders just "+ Filter")
//   match   → 'all' (AND) | 'any' (OR)
//   change  → emits { conditions, match }
// It brings its own "+ Filter", Match All/Any and Clear All, so none of that is ours.
//
// All three of this feature's earlier workarounds are gone, fixed in 0.1.150: the array `value`
// seed no longer discards a half-built chip (G16), Match hides itself below two conditions (G17),
// and the match mode is emitted rather than scraped from the rendered label (G18).
const distinct = (key) => [...new Set(reports.map((r) => r[key]))].sort()

// DS events deliver the value in event.detail as an array — unwrap.
const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

document
  .querySelector('[data-role="new-category"]')
  .addEventListener('click', () => openPanel('create', null))

const filterBar = document.getElementById('filter-bar')
let conditions = []
let matchMode = 'all'

filterBar.fields = [
  { key: 'type', label: 'Type', type: 'enum', values: distinct('type') },
  { key: 'reportType', label: 'Report Type', type: 'enum', values: distinct('reportType') },
]
filterBar.value = []

filterBar.addEventListener('change', (event) => {
  const next = detailValue(event)
  // { conditions, match } since 0.1.150; tolerate the bare array the element emitted before it.
  conditions = Array.isArray(next) ? next : (next?.conditions ?? [])
  matchMode = Array.isArray(next) ? 'all' : (next?.match ?? 'all')
  render(store.getCategories())
})

/** A condition's value may be a single value or a list — normalise before comparing. */
const matches = (row, condition) => {
  const wanted = Array.isArray(condition.value) ? condition.value : [condition.value]
  return wanted.includes(row[condition.field])
}

function applyFilters(rows) {
  if (!conditions.length) return rows
  const test = (row) => conditions.map((c) => matches(row, c))
  return rows.filter((row) => (matchMode === 'any' ? test(row).some(Boolean) : test(row).every(Boolean)))
}

let activeId = 'all-reports'

const closePanel = () => panelRoot.replaceChildren()
const closeDialog = () => dialogRoot.replaceChildren()

function openPanel(mode, category) {
  const panel = renderCategorySettingsPanel({
    mode,
    category,
    directory,
    onCancel: closePanel,
    onSave: (payload) => {
      if (mode === 'create') {
        store.addCategory(payload)
      } else {
        // edit-builtin reports no name (the field is disabled), so only visibility changes.
        const { visibility, sharedWith } = payload
        store.updateVisibility(category.id, { visibility, sharedWith })
      }
      closePanel()
    },
    onDelete:
      mode === 'edit-custom'
        ? () => {
            closePanel()
            openDeleteDialog(category)
          }
        : undefined,
  })
  panelRoot.replaceChildren(panel)
}

function openDeleteDialog(category) {
  const dialog = renderDeleteConfirmDialog({
    categoryName: category.name,
    onCancel: closeDialog,
    onConfirm: () => {
      store.deleteCategory(category.id)
      // If the deleted category was the active filter, fall back to All Reports (spec).
      if (activeId === category.id) setActive('all-reports')
      closeDialog()
    },
  })
  dialogRoot.replaceChildren(dialog)
}

const FAVORITES = 'Favorites'
// Favorites is a pinned pseudo-category: it has no visibility of its own and cannot be edited or
// deleted, so it is not in the RBAC store. This sentinel keeps it out of the category id space.
const FAVORITES_ID = '\u0000favorites'

// obs-side-menu is data-driven: label/icon/favorite/edit. `active` is matched by LABEL, not id.
function toMenuItems(categories) {
  const favourites = reports.filter((r) => r.favorite).length
  return [
    { label: FAVORITES, favorite: true, ...(favourites ? { count: favourites } : {}) },
    ...categories.map((c) => ({
      label: c.name,
      icon: c.visibility === 'public' ? 'globe' : 'lockAlt',
      edit: true,
    })),
  ]
}

/** Which reports belong to a rail selection. */
function rowsFor(id) {
  if (id === FAVORITES_ID) return reports.filter((r) => r.favorite)
  if (id === 'all-reports') return reports
  return reports.filter((r) => r.category === id)
}

// obs-side-menu supplies the chrome; per its own known-issue the create/delete affordances and the
// wiring are the consumer's. augmentCategoryRows adds the create button and wires the pencil. The
// component re-renders its rows on search and active changes, so observe the shadow root and
// re-apply rather than running once.
let menuObserver = null

function augmentMenu(categories) {
  const root = menu.shadowRoot
  if (!root) return

  // Deleting is the drawer's job, so the row carries only the edit affordance.
  augmentCategoryRows({
    root,
    categories,
    onEdit: (category) => openPanel(category.type === 'builtin' ? 'edit-builtin' : 'edit-custom', category),
  })

  if (menuObserver) return
  menuObserver = new MutationObserver(() => augmentMenu(store.getCategories()))
  menuObserver.observe(root, { childList: true, subtree: true })
}

function setActive(id) {
  activeId = id
  const category = id === FAVORITES_ID ? null : store.getCategory(id) ?? store.getCategory('all-reports')
  if (category) activeId = category.id

  table.rows = applyFilters(rowsFor(activeId))

  // `active` is matched by LABEL, not id.
  menu.setAttribute('active', category ? category.name : FAVORITES)
}

// Bound once — binding inside render() would add a fresh listener on every re-render.
menu.addEventListener('select', (event) => {
  const label = detailValue(event)?.label
  if (!label) return
  if (label === FAVORITES) return setActive(FAVORITES_ID)
  const found = store.getCategories().find((c) => c.name === label)
  if (found) setActive(found.id)
})

function render(categories) {
  menu.items = toMenuItems(categories)
  setActive(activeId)
  // The rows are re-rendered by the component, so re-bind after it has painted.
  requestAnimationFrame(() => augmentMenu(categories))
}

store.subscribe(render)
render(store.getCategories())

