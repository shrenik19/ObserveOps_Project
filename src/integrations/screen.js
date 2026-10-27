// Settings -> Integration, in the Settings layout's pane. Which view it shows comes from the menu
// item that opened it (src/settings/menu.js):
//   - ''                  the Integration landing, a card per integration
//   - Integration Profile the profile table and its Create Integration Profile drawer
//   - ME Service Desk Plus the SDP connection form (new)
// A landing card navigates to that integration's own menu item, so every view has its own route.

import { href } from '../app/router.js'
import { leafByLabel } from '../settings/menu.js'
import { SDP, INTEGRATIONS, createProfileStore } from './catalogue.js'
import { renderProfileDrawer } from './profileDrawer.js'
import { renderConnectionForm } from './connectionForm.js'
import './integrations.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

const PROFILE = 'Integration Profile'

const BLURBS = {
  [PROFILE]: 'Decide how alerts become tickets and messages',
  'Motadata ServiceOps': 'Create tickets in Motadata ServiceOps',
  ServiceNow: 'Create events and incidents in ServiceNow',
  [SDP]: 'Create requests in ManageEngine ServiceDesk Plus',
  'Atlassian Jira': 'Create issues in Jira',
  'Microsoft Teams': 'Send alerts to Teams channels',
  Slack: 'Send alerts to Slack channels',
  LAMA: 'Report to SEBI under the LAMA framework',
  'Geo Map': 'Configure the geo map provider',
}

const TEMPLATE = '<main class="app-shell__content integration-pane" id="integration-pane"></main>'

const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

export function mount(root, { view = '' } = {}) {
  root.innerHTML = TEMPLATE
  const overlay = document.getElementById('overlay-root')
  const pane = root.querySelector('#integration-pane')
  const store = createProfileStore()

  const closeDrawer = () => overlay?.replaceChildren()

  // --- Landing ----------------------------------------------------------------------------------
  // No DS card (G47), so each integration is a token-styled button.
  function renderLanding() {
    pane.innerHTML = `
      <header class="integration-intro">
        <h2 class="integration-intro__title">Integration</h2>
        <p class="integration-intro__blurb">
          Connect Motadata ObserveOps with ITSM and collaboration tools. Select an integration to configure it.
        </p>
      </header>
      <div class="integration-cards" data-role="integration-cards"></div>
    `
    const cards = pane.querySelector('.integration-cards')
    for (const name of INTEGRATIONS) {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'integration-card'
      card.dataset.integration = name
      card.innerHTML = '<span class="integration-card__name"></span><span class="integration-card__blurb"></span>'
      card.querySelector('.integration-card__name').textContent = name
      card.querySelector('.integration-card__blurb').textContent = BLURBS[name]
      if (name === SDP) {
        const tag = document.createElement('obs-tag')
        tag.textContent = 'NEW'
        card.querySelector('.integration-card__name').append(' ', tag)
      }
      card.addEventListener('click', () => open(name))
      cards.append(card)
    }
  }

  // --- Integration Profile ----------------------------------------------------------------------
  function renderProfiles() {
    pane.innerHTML = `
      <obs-toolbar data-role="content-toolbar">
        <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search" data-role="profile-search"></obs-input>
        <obs-button variant="neutral-lightest" squared aria-label="Export as PDF">
          <obs-icon name="exportPdf" size="14"></obs-icon>
        </obs-button>
        <obs-button variant="neutral-lightest" squared aria-label="Export as spreadsheet">
          <obs-icon name="exportXlsx" size="14"></obs-icon>
        </obs-button>
        <obs-button variant="primary" data-role="create-profile">Create Integration Profile</obs-button>
      </obs-toolbar>
      <obs-filters id="integration-filters" kind="bar"></obs-filters>
      <obs-table id="integration-table" row-key="id" selectable sort="name:asc" page-size="50" sticky-header max-height="100%"></obs-table>
    `
    const table = pane.querySelector('#integration-table')
    table.columns = [
      { key: 'name', title: 'PROFILE NAME', sortable: true },
      { key: 'description', title: 'DESCRIPTION' },
      { key: 'type', title: 'INTEGRATION TYPE', width: 220, sortable: true },
      { key: 'used', title: 'USED COUNT', width: 130, align: 'center', sortable: true },
    ]
    table.rowActions = [
      { key: 'edit', label: 'Edit', icon: 'pencil' },
      { key: 'delete', label: 'Delete', icon: 'trash', danger: true },
    ]

    let query = ''
    let typeFilter = []
    const filters = pane.querySelector('#integration-filters')
    const syncFields = () => {
      const types = [...new Set(store.rows().map((r) => r.type))].sort()
      filters.fields = [{ key: 'type', label: 'Integration Type', type: 'enum', values: types }]
    }
    // A valueless condition renders the product's default chip (G50).
    filters.value = [{ field: 'type', operator: '=', value: [] }]
    syncFields()

    const render = () => {
      const q = query.trim().toLowerCase()
      table.rows = store.rows().filter((r) =>
        (!q || `${r.name} ${r.description} ${r.type}`.toLowerCase().includes(q)) &&
        (!typeFilter.length || typeFilter.includes(r.type)))
    }
    render()

    filters.addEventListener('change', (event) => {
      const next = detailValue(event)
      const conditions = Array.isArray(next) ? next : (next?.conditions ?? [])
      // One field, so Match All / Any cannot change the result.
      typeFilter = conditions.filter((c) => c.field === 'type').flatMap((c) => [].concat(c.value ?? []))
      render()
    })
    pane.querySelector('[data-role="profile-search"]').addEventListener('input', (event) => {
      query = String(detailValue(event) ?? event.target.value ?? '')
      render()
    })

    pane.querySelector('[data-role="create-profile"]').addEventListener('click', () => {
      const drawer = renderProfileDrawer({
        isTaken: store.isTaken,
        onCreate: (draft) => {
          store.add(draft)
          syncFields()
          render()
          closeDrawer()
        },
        onClose: closeDrawer,
      })
      overlay.replaceChildren(drawer)
      // Object-valued props must be assigned after the elements are in the document.
      requestAnimationFrame(() => drawer.upgrade())
    })
  }

  // --- ME Service Desk Plus ---------------------------------------------------------------------
  function renderConnection() {
    const form = renderConnectionForm({
      onTest: () => {
        form.querySelector('obs-banner')?.remove()
        const banner = document.createElement('obs-banner')
        banner.setAttribute('variant', 'success')
        banner.setAttribute('closable', '')
        banner.dataset.role = 'sdp-test-result'
        banner.textContent = 'Connected to ME Service Desk Plus.'
        form.querySelector('.sdp-connection__actions').before(banner)
      },
    })
    pane.replaceChildren(form)
    requestAnimationFrame(() => form.upgrade())
  }

  // --- View switching ---------------------------------------------------------------------------
  // A card opens its integration's own menu item: the route changes, and the Settings layout
  // highlights the item and remounts this screen with that view.
  function open(name) {
    const leaf = leafByLabel(name)
    if (leaf) window.location.hash = href('settings', leaf.key)
  }

  if (view === PROFILE) renderProfiles()
  else if (view === SDP) renderConnection()
  else renderLanding()

  return function unmount() {
    closeDrawer()
  }
}
