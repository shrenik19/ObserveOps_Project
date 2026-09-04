import { pageHeaderHTML } from '../app/pageHeader.js'
import { createStore } from './profileStore.js'
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

  // Task 11 replaces this with the real view switch.
  root.querySelector('#wld-create').addEventListener('click', () => {})

  return function unmount() {
    root.replaceChildren()
  }
}
