import { pageHeaderHTML } from '../app/pageHeader.js'
import { LINKS, PROBES } from './probes.js'
import { renderDetailDrawer } from './detailDrawer.js'
import { renderConfigDrawer } from './configDrawer.js'
import './wanLink.css'

export const meta = { pageHeader: { heading: 'Monitors', icon: 'monitor' } }

// The product's Monitors category bar. WAN Link is one tab among many; the rest render and do
// nothing, exactly as the other screens in this app treat their inert chrome.
const CATEGORIES = [
  'Inventory', 'Network', 'SDN', 'Server & Apps', 'Storage', 'Virtualization', 'HCI',
  'Database', 'Container Orchestration', 'Cloud', 'Interface', 'WAN Link', 'Process',
  'Container', 'Service', 'Service Check', 'Other',
]

const tabKey = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Monitors', icon: 'monitor' })}
  <div class="module-tabs">
    <obs-tabs id="wan-link-tabs"></obs-tabs>
  </div>
  <div class="app-shell__body">
    <main class="app-shell__content" id="wan-link-content">
      <obs-toolbar data-role="content-toolbar">
        <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
        <obs-button variant="primary" data-role="add-probe">Add WAN Link Probe</obs-button>
        <obs-button variant="neutral-lightest" squared aria-label="Export as PDF">
          <obs-icon name="exportPdf" size="14"></obs-icon>
        </obs-button>
        <obs-button variant="neutral-lightest" squared aria-label="Export as spreadsheet">
          <obs-icon name="exportXlsx" size="14"></obs-icon>
        </obs-button>
      </obs-toolbar>
      <obs-filters id="wan-link-filters" kind="bar"></obs-filters>
      <obs-table id="wan-link-table" row-key="id" sort="name:asc" page-size="50" sticky-header max-height="100%"></obs-table>
    </main>
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE

  // Set as a JSON attribute so the value survives regardless of custom-element upgrade timing —
  // the same reason report-categories does it this way.
  const tabs = root.querySelector('#wan-link-tabs')
  tabs.setAttribute('tabs', JSON.stringify(CATEGORIES.map((label) => ({ key: tabKey(label), label }))))
  tabs.setAttribute('value', 'wan-link')

  const table = root.querySelector('#wan-link-table')

  table.columns = [
    { key: 'name', title: 'WAN LINK NAME', sortable: true, cls: 'wl-name' },
    { key: 'monitor', title: 'MONITOR', sortable: true, width: 200 },
    { key: 'type', title: 'TYPE', width: 70, align: 'center', type: 'icon' },
    { key: 'probe', title: 'WAN PROBE TYPE', sortable: true, width: 160 },
    { key: 'sourceIp', title: 'SOURCE IP', width: 140 },
    { key: 'destinationIp', title: 'DESTINATION IP', width: 150 },
    { key: 'sourceInterface', title: 'SOURCE INTERFACE', width: 160 },
    // RTT sits BEFORE status, per the reference screenshot.
    { key: 'rtt', title: 'RTT', width: 90 },
    { key: 'status', title: 'STATUS', width: 110 },
  ]

  const toRow = (l) => ({
    ...l,
    probe: PROBES[l.probe].label,
    type: { icon: 'networkTopology' },
  })

  table.rows = LINKS.map(toRow)

  const distinct = (key) => [...new Set(table.rows.map((r) => r[key]))].sort()
  const filters = root.querySelector('#wan-link-filters')
  filters.fields = [
    { key: 'probe', label: 'WAN Probe Type', type: 'enum', values: distinct('probe') },
    { key: 'status', label: 'Status', type: 'enum', values: distinct('status') },
  ]
  filters.value = []

  // The shell provides one #overlay-root per screen and clears it between navigations.
  const overlay = document.getElementById('overlay-root')
  const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)
  const closeOverlay = () => overlay?.replaceChildren()

  table.addEventListener('rowclick', (event) => {
    const id = detailValue(event)?.id
    const link = LINKS.find((l) => l.id === id)
    if (!link || !overlay) return
    overlay.replaceChildren(renderDetailDrawer({ link, onClose: closeOverlay }))
  })

  root.querySelector('[data-role="add-probe"]').addEventListener('click', () => {
    if (!overlay) return
    overlay.replaceChildren(renderConfigDrawer({ onClose: closeOverlay }))
  })

  return function unmount() {
    closeOverlay()
  }
}
