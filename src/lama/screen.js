import { pageHeaderHTML } from '../app/pageHeader.js'
import { renderLamaProfileDrawer } from './lamaProfileDrawer.js'
import './lama.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Settings', icon: 'settings' })}

  <main class="app-shell__content lama-page">
    <!-- The LAMA intro strip: mark, title, and the framework blurb the product shows. -->
    <header class="lama-page__intro">
      <div class="lama-page__heading">
        <h2 class="lama-page__title">LAMA</h2>
        <p class="lama-page__blurb">
          Accelerate regulatory compliance under SEBI's LAMA framework with Motadata
          ObserveOps. For more information:
          <span class="lama-page__link">LAMA Framework</span>
        </p>
      </div>
    </header>

    <obs-toolbar data-role="lama-toolbar">
      <obs-input
        slot="start"
        class="lama-page__search"
        type="search"
        placeholder="Search"
        data-role="lama-search"
      ></obs-input>

      <obs-button variant="transparent" squared aria-label="Preview">
        <obs-icon name="eye" size="16"></obs-icon>
      </obs-button>
      <obs-button variant="transparent" squared aria-label="Export PDF">
        <obs-icon name="filePdf" size="16"></obs-icon>
      </obs-button>
      <obs-button variant="transparent" squared aria-label="Export XLS">
        <obs-icon name="fileExcel" size="16"></obs-icon>
      </obs-button>
      <obs-button variant="primary" id="create-lama-profile">Create LAMA Profile</obs-button>
    </obs-toolbar>

    <obs-table
      id="lama-table"
      sticky-header
      empty-text="No records available"
      page-size="50"
    ></obs-table>
  </main>
`

export function mount(root) {
  root.innerHTML = TEMPLATE

  const overlay = document.getElementById('overlay-root')
  const table = root.querySelector('#lama-table')

  // The LAMA list. Starts empty, as the product does before a profile exists. Declared inside
  // mount, so revisiting the screen starts from the product's real initial state.
  const profiles = []

  table.columns = [
    { key: 'name', title: 'NAME', sortable: true },
    { key: 'description', title: 'DESCRIPTION' },
    { key: 'exchange', title: 'EXCHANGE', width: 130 },
    { key: 'application', title: 'APPLICATION', width: 150 },
    { key: 'dataInterval', title: 'DATA INTERVAL', width: 140 },
    { key: 'monitoringHours', title: 'MONITORING HOURS', width: 170 },
    { key: 'lastSyncAt', title: 'LAST SYNC AT', width: 150 },
    { key: 'status', title: 'STATUS', type: 'status', width: 110 },
  ]
  table.rowActions = [
    { key: 'edit', label: 'Edit', icon: 'pencil' },
    { key: 'delete', label: 'Delete', icon: 'trash', danger: true },
  ]
  table.rows = profiles

  const closeDrawer = () => overlay.replaceChildren()

  function openDrawer() {
    const { element } = renderLamaProfileDrawer({
      onCancel: closeDrawer,
      onCreate: ({ metadataFields, counters }) => {
        // No backend: show the result by adding the profile to the grid, so the flow is visible.
        profiles.push({
          id: `lama-${profiles.length + 1}`,
          name: document.querySelector('[data-role="lama-name"]')?.getAttribute('value') || 'Untitled Profile',
          description: `${counters.counters.length} counter(s), ${metadataFields.length} metadata field(s)`,
          exchange: 'NSE',
          application: 'Trading',
          dataInterval: '5 Minute(s)',
          monitoringHours: 'Market Hours',
          lastSyncAt: '—',
          status: 'Active',
        })
        table.rows = [...profiles]
        closeDrawer()
      },
    })
    overlay.replaceChildren(element)
    // Object-valued props must be assigned after the elements are in the document.
    requestAnimationFrame(() => element.upgradeSelects())
  }

  root.querySelector('#create-lama-profile').addEventListener('click', openDrawer)

  // Every listener is on a node inside `root`, so clearing it drops them all. The screen host
  // clears the overlay too; closing here keeps the teardown honest on its own.
  return function unmount() {
    closeDrawer()
  }
}
