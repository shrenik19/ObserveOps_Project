import { pageHeaderHTML } from '../app/pageHeader.js'
import { createStore } from './profileStore.js'
import { renderCreateForm } from './createForm.js'
import { renderPaneDrawer } from '../app/paneDrawer.js'
import { renderDiscoveryRail, renderDiscoveryHelp } from './discoveryPanes.js'
import { renderProgressPanel } from './progressPanel.js'
import { renderProvisionGrid } from './provisionGrid.js'
import './wanLinkDiscovery.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Settings', icon: 'settings' })}
  <div class="app-shell__body">
    <main class="app-shell__content" id="wld-content">
      <section id="wld-list">
        <obs-toolbar data-role="content-toolbar">
          <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
          <obs-button id="wld-create" variant="primary">Create Discovery Profile</obs-button>
        </obs-toolbar>
        <obs-filters id="wld-filters" kind="bar"></obs-filters>
        <obs-table id="wld-table" row-key="id" sort="name:asc" page-size="0" sticky-header max-height="100%"></obs-table>
      </section>
      <section id="wld-view"></section>
    </main>
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE
  const store = createStore()

  const table = root.querySelector('#wld-table')
  table.columns = [
    { key: 'name', title: 'DISCOVERY PROFILE NAME', sortable: true },
    // The profile's target is the MONITOR, so its IP fills this column; the destination is on hover.
    { key: 'target', title: 'IP/HOST/IP RANGE/CIDR/CSV', width: 200 },
    { key: 'platform', title: 'TYPE', width: 110 },
    { key: 'discovered', title: 'DISCOVERED OBJECTS', width: 170, align: 'center' },
    { key: 'status', title: 'STATUS', width: 230 },
    { key: 'collector', title: 'COLLECTOR', width: 130 },
    { key: 'actions', title: 'ACTIONS', width: 100, align: 'center' },
  ]

  const refresh = () => {
    table.rows = store.gridRows().map((r) => ({ ...r, actions: '' }))
    const platforms = [...new Set(table.rows.map((r) => r.platform))].sort()
    const filters = root.querySelector('#wld-filters')
    filters.fields = [
      { key: 'platform', label: 'Type', type: 'enum', values: platforms },
      { key: 'status', label: 'Status', type: 'enum', values: [...new Set(table.rows.map((r) => r.status))].sort() },
    ]
    filters.value = []
  }
  refresh()

  const list = root.querySelector('#wld-list')
  const view = root.querySelector('#wld-view')
  let live = null

  const showList = () => {
    live?.stop?.()
    live = null
    view.replaceChildren()
    list.hidden = false
    refresh()
  }

  const show = (element) => {
    live?.stop?.()
    live = element
    list.hidden = true
    view.replaceChildren(element)
  }

  // A monitor in the hash means the user came from that device's WAN Link tab. The old in-device
  // drawer is retired; this is the one form, entered with the Monitor already decided.
  const monitorFromHash = () =>
    new URLSearchParams((window.location.hash.split('?')[1] ?? '')).get('monitor')

  // Create Discovery Profile opens OVER the list as the DS's large / full-screen drawer — width 96%,
  // scrolled-content="false", a 2 : 6 : 4 body. The spec always described it this way: "Left rail:
  // the existing category tree, `WAN Link` selected as a leaf." The form was built without that rail
  // and so without the drawer that carries it; this restores both.
  //
  // Only the FORM is a drawer. The progress panel and the provision grid are the steps after it and
  // stay full-page views — they are not a form beside a reference panel.
  function openForm(monitorId = null) {
    const form = renderCreateForm({
      monitorId,
      locked: Boolean(monitorId),
      onCancel: showList,
      onRun: openProgress,
    })

    live?.stop?.()
    live = form
    // The list stays mounted and visible: a drawer that hides what it overlays is not a drawer.
    list.hidden = false
    view.replaceChildren(renderPaneDrawer({
      title: 'Create Discovery Profile',
      nav: renderDiscoveryRail(),
      form,
      help: renderDiscoveryHelp(),
      onClose: showList,
    }))
  }

  function openProgress({ name, monitor, osKey, mode, links }) {
    const profile = store.add({ name, monitorId: monitor.id, osKey, mode, links })
    refresh()
    const panel = renderProgressPanel({
      profileName: name,
      monitor,
      osKey,
      links,
      outcome: 'ok',
      onCancel: showList,
      onDone: (results) => {
        store.recordRun(profile.id, {
          discovered: results.filter((r) => r.ok).length,
          failed: results.filter((r) => !r.ok).length,
          ranAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        refresh()
      },
    })
    panel.addEventListener('provision', () => {
      openProvision({ profile, monitor, name, results: panel.results.filter(Boolean) })
    })
    show(panel)
  }

  function openProvision({ profile, monitor, name, results }) {
    show(renderProvisionGrid({
      profileName: name,
      monitor,
      results,
      onCancel: showList,
      onAdd: () => {
        // Add Selected Objects is what makes the profile immutable: from here it IS an IP SLA
        // operation living on a router, and editing or re-running would orphan it.
        store.provision(profile.id)
        showList()
      },
    }))
  }

  root.querySelector('#wld-create').addEventListener('click', () => openForm())

  const deepLinked = monitorFromHash()
  if (deepLinked) openForm(deepLinked)

  return function unmount() {
    live?.stop?.()
  }
}
