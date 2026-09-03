import { pageHeaderHTML } from '../app/pageHeader.js'
import { LINKS, PROBES } from './probes.js'
import { renderDetailDrawer } from './detailDrawer.js'
// configDrawer.js is deliberately NOT imported: the Add WAN Link Probe button was dropped, so the
// screen has no entry point to it. The module and its tests are kept, unreached by the page — the
// same treatment categoryRow.js gets in the report-categories screen.
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

const SEVERITIES = ['down', 'critical', 'major', 'warning', 'clear', 'unreachable']

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Monitors', icon: 'monitor' })}
  <div class="module-tabs">
    <obs-tabs id="wan-link-tabs"></obs-tabs>
  </div>
  <div class="app-shell__body">
    <main class="app-shell__content" id="wan-link-content">
      <obs-toolbar data-role="content-toolbar">
        <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
        <obs-button variant="neutral-lightest" squared aria-label="Export as PDF">
          <obs-icon name="exportPdf" size="14"></obs-icon>
        </obs-button>
        <obs-button variant="neutral-lightest" squared aria-label="Export as spreadsheet">
          <obs-icon name="exportXlsx" size="14"></obs-icon>
        </obs-button>
      </obs-toolbar>
      <obs-filters id="wan-link-filters" kind="bar"></obs-filters>
      <!-- page-size="0" turns obs-table's own pager off. The product puts pagination, page size,
           the severity legend and the item count in ONE band pinned to the bottom of the page;
           obs-table renders its pager at its own content height and offers no attribute, part or
           custom property to move it, so the band below is ours. See DS-GAPS G36. -->
      <obs-table id="wan-link-table" row-key="id" sort="name:asc" page-size="0" sticky-header max-height="100%"></obs-table>

      <div class="wl-footer">
        <!-- The arrows are disabled because there is one page. The conformance checker scores a
             disabled obs-button as off-reference while reporting identical colours on both sides
             (DS-GAPS G37); the correct affordance is kept over the better score. -->
        <div class="wl-footer__pager">
          <obs-button variant="neutral-lightest" squared disabled aria-label="First page">
            <obs-icon name="chevron-double-left" size="12"></obs-icon>
          </obs-button>
          <obs-button variant="neutral-lightest" squared disabled aria-label="Previous page">
            <obs-icon name="chevron-left" size="12"></obs-icon>
          </obs-button>
          <span class="wl-footer__page">1</span>
          <obs-button variant="neutral-lightest" squared disabled aria-label="Next page">
            <obs-icon name="chevron-right" size="12"></obs-icon>
          </obs-button>
          <obs-button variant="neutral-lightest" squared disabled aria-label="Last page">
            <obs-icon name="chevron-double-right" size="12"></obs-icon>
          </obs-button>
          <!-- block makes the control fill its host instead of the fixed 240px, which is the only
               supported way to narrow it: sizing the host alone is overflowed by the inner control.
               (No backticks in this comment: the template is a JS template literal.) -->
          <obs-select id="wan-link-page-size" value="50" block></obs-select>
          <span class="wl-footer__label">items per page</span>
        </div>

        <!-- The product's severity legend sits under every monitor list. -->
        <div class="wl-legend" id="wan-link-legend"></div>

        <div class="wl-footer__count" id="wan-link-count"></div>
      </div>
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
    // type="status" renders the product's status pill (obs-tag status="…"). Neither this nor
    // type="severity" is listed in elements-api.json — both were found by rendering. See DS-GAPS.
    { key: 'status', title: 'STATUS', width: 110, type: 'status' },
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

  // obs-severity display-text renders the dot plus its own capitalised label, so the legend needs
  // no text of ours — one element per level.
  root.querySelector('#wan-link-legend').innerHTML = SEVERITIES
    .map((s) => `<obs-severity severity="${s}" shape="dot" display-text></obs-severity>`)
    .join('')

  root.querySelector('#wan-link-page-size').options = [25, 50, 100]
    .map((n) => ({ value: String(n), text: String(n) }))

  const total = table.rows.length
  root.querySelector('#wan-link-count').textContent = `1 - ${total} of ${total} items`

  // The shell provides one #overlay-root per screen and clears it between navigations.
  const overlay = document.getElementById('overlay-root')
  const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)
  const closeOverlay = () => overlay?.replaceChildren()

  table.addEventListener('rowclick', (event) => {
    // Confirmed by rendering: obs-table emits the ROW KEY as a bare string — detail is ['l10'],
    // not [{ id: 'l10' }]. The object shape is tolerated in case the contract widens.
    const payload = detailValue(event)
    const id = typeof payload === 'string' ? payload : payload?.id
    const link = LINKS.find((l) => l.id === id)
    if (!link || !overlay) return
    overlay.replaceChildren(renderDetailDrawer({ link, onClose: closeOverlay }))
  })

  return function unmount() {
    closeOverlay()
  }
}
