import { pageHeaderHTML } from '../app/pageHeader.js'
import { createStore } from './store.js'
import { renderCategorySettingsPanel } from './categorySettingsPanel.js'
import { augmentCategoryRows } from './augmentSideMenu.js'
import { startDeleteCategoryFlow } from './deleteCategoryFlow.js'
import './categorySettingsPanel.css'
import './deleteConfirmDialog.css'
import './reassignReportsDialog.css'
import './forceDeleteDialog.css'
import './reportCategories.css'

export const meta = { pageHeader: { heading: 'Report', icon: 'report' } }

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Report', icon: 'report' })}

  <div class="module-tabs">
    <obs-tabs id="report-tabs" value="metric"></obs-tabs>
    <obs-button variant="primary" data-role="create-custom-report">Create Custom Report</obs-button>
  </div>

  <div class="app-shell__body">
    <!-- obs-side-menu mode="list" — the DS's report / saved-views rail. Its registry names
         this exact case: "All Reports (active) · ★ Favorites · user categories", as seen in
         report-sidebar.vue. It supplies the chrome (search, flat border-split rows, ★ row,
         active weight-500, pencil-on-hover); per its own known-issue the create/delete
         affordances and the wiring are the consumer's. -->
    <nav class="category-side-menu" aria-label="Report categories">
      <obs-side-menu id="category-list" mode="list" placeholder="Search">
        <!-- The DS projects this slot beside the search box, so the create affordance is a
             real slotted child — it used to be injected into the shadow root. -->
        <obs-button slot="search-action" data-role="new-category" variant="primary" squared aria-label="New Category">
          <obs-icon name="plus" size="14"></obs-icon>
        </obs-button>
      </obs-side-menu>
    </nav>

    <main class="app-shell__content">
      <!-- obs-toolbar (grid variant): \`start\` slot is the left group, the default slot the
           right one, space-between, 8px internal gaps. This was a hand-rolled flex div. -->
      <obs-toolbar data-role="content-toolbar">
        <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
        <obs-button variant="neutral-lightest" squared aria-label="Export as PDF">
          <obs-icon name="exportPdf" size="14"></obs-icon>
        </obs-button>
        <obs-button variant="neutral-lightest" squared aria-label="Export as spreadsheet">
          <obs-icon name="exportXlsx" size="14"></obs-icon>
        </obs-button>
        <obs-button variant="neutral-lightest" squared aria-label="Filter">
          <obs-icon name="filter" size="14"></obs-icon>
        </obs-button>
      </obs-toolbar>

      <!-- The real FilterBar. Was hand-composed from obs-select/obs-radio/obs-button while
           obs-filters was referenceOnly; as of elements@0.1.143 kind="bar" is functional —
           pass \`fields\`, read \`value\`, listen for \`change\`. It brings its own "+ Filter",
           Match All/Any and Clear All. -->
      <obs-filters id="filter-bar" kind="bar"></obs-filters>

      <obs-table id="reports-table" row-key="id" sort="name:asc" page-size="10" sticky-header max-height="100%"></obs-table>
    </main>
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE

  // render() re-binds the rail on the next animation frame, which can land after the screen has
  // been navigated away from. Without this flag that late frame rebuilds menuObserver on a rail
  // that is no longer in the document.
  let mounted = true

  const builtin = (id, name, visibility = 'public', sharedWith = []) => ({
    id,
    name,
    type: 'builtin',
    visibility,
    sharedWith,
  })

  const custom = (id, name, visibility = 'public', sharedWith = []) => ({
    id,
    name,
    type: 'custom',
    visibility,
    sharedWith,
  })

  const seedCategories = [
    builtin('all-reports', 'All Reports'),
    builtin('config', 'Config'),
    custom('windows', 'Windows', 'public'),
    custom('inventory', 'Inventory', 'private', [{ type: 'user', id: 'u1' }]),
    builtin('flow-reports', 'Flow Reports', 'private', [{ type: 'profile', id: 'p1' }]),
    custom('wireless', 'Wireless', 'private', [{ type: 'user', id: 'u2' }]),
    custom('wan-link', 'WAN Link', 'public'),
    // Deliberately holds no reports, so the "delete an empty category" path is reachable in the app.
    custom('capacity-planning', 'Capacity Planning', 'private', [{ type: 'profile', id: 'p2' }]),
    builtin('network', 'Network', 'private', [{ type: 'profile', id: 'p2' }]),
    builtin('alert', 'Alert'),
    builtin('availability', 'Availability', 'private', [{ type: 'user', id: 'u3' }]),
    builtin('performance', 'Performance'),
    builtin('virtualization', 'Virtualization'),
    builtin('server', 'Server', 'private', [{ type: 'user', id: 'u1' }]),
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
    // The plain name. `name` below is the DS link-cell shape and is awkward to read from anywhere
    // that is not obs-table, so keep the string itself available.
    title: name,
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

    // --- Inventory ------------------------------------------------------
    // Deliberately the biggest category in the seed. The delete flow's reassign step is the screen
    // that has to survive a real customer's data — a category with two reports never exercises the
    // search box, the bulk bar or a scrolling grid, so it never showed what that step actually costs.
    report('r21', 'Access Switch Inventory', 'inventory', 'Layer-2 access switches, by site', 'Inventory', 'Default', true),
    report('r22', 'Core Switch Inventory', 'inventory', 'Core and distribution switches', 'Inventory', 'Default', false, true),
    report('r23', 'Router Inventory', 'inventory', 'Edge and branch routers', 'Inventory', 'Default'),
    report('r24', 'Firewall Inventory', 'inventory', 'Perimeter and internal firewalls', 'Inventory', 'Custom'),
    report('r25', 'Wireless Controller Inventory', 'inventory', 'WLCs and their AP counts', 'Inventory', 'Default'),
    report('r26', 'Server Hardware Inventory', 'inventory', 'Physical hosts, make and model', 'Inventory', 'Default'),
    report('r27', 'Virtual Machine Inventory', 'inventory', 'Guests by cluster and datastore', 'Inventory', 'Custom'),
    report('r28', 'Storage Array Inventory', 'inventory', 'Arrays, shelves and raw capacity', 'Inventory', 'Default'),
    report('r29', 'Licence Expiry Report', 'inventory', 'Licences due to lapse in 90 days', 'Inventory', 'Custom', true, true),
    report('r30', 'Warranty Expiry Report', 'inventory', 'Assets out of warranty this year', 'Inventory', 'Custom'),
    report('r31', 'End of Life Devices', 'inventory', 'Hardware past vendor EoL', 'Inventory', 'Default', true),
    report('r32', 'Unmanaged Devices', 'inventory', 'Discovered but not monitored', 'Inventory', 'Custom'),
    report('r33', 'Interface Inventory', 'inventory', 'Ports by device, speed and state', 'Inventory', 'Default'),
    report('r34', 'IP Address Inventory', 'inventory', 'Allocated and free addresses', 'Inventory', 'Default'),
    report('r35', 'Software Version Spread', 'inventory', 'OS and firmware versions in use', 'Inventory', 'Custom'),
    report('r36', 'Asset Tag Reconciliation', 'inventory', 'Assets missing an asset tag', 'Inventory', 'Custom'),
  ]

  const store = createStore({ categories: seedCategories, reports })
  const menu = root.querySelector('#category-list')
  const table = root.querySelector('#reports-table')
  // The settings drawer and the four delete dialogs used to have a root each (#panel-root and
  // #dialog-root). The shell provides one #overlay-root for every screen, and clears it between
  // navigations; both names now point at it.
  const overlay = document.getElementById('overlay-root')
  const panelRoot = overlay
  const dialogRoot = overlay

  // obs-tabs normalizes each item as { key: key ?? label, label: label ?? key } — it is { key, label },
  // NOT the { value, text } shape obs-radio and obs-select use. Set as a JSON attribute so the value
  // survives regardless of upgrade timing.
  const reportTabs = ['Metric', 'Log', 'Flow', 'Trap', 'Audit', 'NCCM', 'APM', 'RUM', 'NetRoute', 'Log Compliance']
  const tabsEl = root.querySelector('#report-tabs')
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
    // The store holds the live rows, and hands out copies — so these must be written back THROUGH
    // the store. Mutating the seed array here would be discarded on the next render.
    const row = store.getReports().find((r) => r.id === action.id)
    if (!row) return

    if (action.key === 'schedule') {
      store.updateReport(row.id, { schedule: !row.schedule })
    }

    // The name cell holds two controls: the ★ favourites, the text opens the report. `part` tells
    // them apart — added in elements@0.1.159 (G15), which retired a shadow-root binding here.
    if (action.key === 'name' && action.part === 'icon') {
      const favorite = !row.favorite
      store.updateReport(row.id, { favorite, name: { ...row.name, icon: favorite ? 'filledStar' : 'star' } })
    }
    // part === 'text' would open the report; `download` would start a download, in a real app.

    // store.updateReport notifies, which re-renders — no explicit render() call needed.
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

  root
    .querySelector('[data-role="new-category"]')
    .addEventListener('click', () => openPanel('create', null))

  const filterBar = root.querySelector('#filter-bar')
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
              startDeleteCategoryFlow({
                category,
                store,
                mount: (dialog) => dialogRoot.replaceChildren(dialog),
                close: closeDialog,
                onDeleted: (deletedId) => {
                  // If the deleted category was the active filter, fall back to All Reports (spec).
                  if (activeId === deletedId) setActive('all-reports')
                },
              })
            }
          : undefined,
    })
    panelRoot.replaceChildren(panel)
  }

  const FAVORITES = 'Favorites'
  // Favorites is a pinned pseudo-category: it has no visibility of its own and cannot be edited or
  // deleted, so it is not in the RBAC store. This sentinel keeps it out of the category id space.
  const FAVORITES_ID = '\u0000favorites'

  // obs-side-menu is data-driven: label/icon/favorite/edit. `active` is matched by LABEL, not id.
  function toMenuItems(categories) {
    // From the STORE, not the seed array — the store holds the live rows, so toggling a star or
    // force-deleting a category has to move this count.
    const favourites = store.getReports().filter((r) => r.favorite).length
    return [
      { label: FAVORITES, favorite: true, ...(favourites ? { count: favourites } : {}) },
      ...categories.map((c) => ({
        label: c.name,
        // Paired padlocks: open = Public, closed = Private. NOT `unlockAlt`, which draws an undo
        // arrow despite its name (gap G3).
        icon: c.visibility === 'public' ? 'lockOpen' : 'lockAlt',
        edit: true,
      })),
    ]
  }

  /** Which reports belong to a rail selection. Reads the store, so a move or delete re-renders. */
  function rowsFor(id) {
    const all = store.getReports()
    if (id === FAVORITES_ID) return all.filter((r) => r.favorite)
    if (id === 'all-reports') return all
    return all.filter((r) => r.category === id)
  }

  // obs-side-menu supplies the chrome; per its own known-issue the create/delete affordances and the
  // wiring are the consumer's. augmentCategoryRows adds the create button and wires the pencil. The
  // component re-renders its rows on search and active changes, so observe the shadow root and
  // re-apply rather than running once.
  let menuObserver = null

  function augmentMenu(categories) {
    if (!mounted) return
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

  // The ONE thing on this screen that outlives its DOM: a MutationObserver on obs-side-menu's
  // shadow root. Without this disconnect every revisit stacks another observer, each re-running
  // augmentCategoryRows on every mutation.
  return function unmount() {
    mounted = false
    menuObserver?.disconnect()
    menuObserver = null
    overlay.replaceChildren()
  }
}
