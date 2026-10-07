// Settings -> Integration. The Settings section menu with Integration open, and one pane beside it:
//   - nothing picked      the Integration landing, a card per integration
//   - Integration Profile the profile table and its Create Integration Profile drawer
//   - ME Service Desk Plus the SDP connection form (new)
//   - LAMA                the existing LAMA screen, by route
//   - anything else       a note that it is an existing screen outside this design
// The picked view is kept in the hash (`?view=`), so each one can be linked to directly.

import { pageHeaderHTML } from '../app/pageHeader.js'
import { href } from '../app/router.js'
import { SDP, INTEGRATIONS, createProfileStore } from './catalogue.js'
import { renderProfileDrawer } from './profileDrawer.js'
import { renderConnectionForm } from './connectionForm.js'
import './integrations.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

const PROFILE = 'Integration Profile'

// The Settings section menu. Only Integration is in scope; the other sections carry one stand-in
// child each so they render as collapsible sections, which is what they are in the product.
const SECTIONS = [
  ['Log Settings', 'log'],
  ['Flow Settings', 'flow'],
  ['Plugin Library', 'pluginLibrary'],
  ['Dependency Mapper', 'networkTopology'],
  ['Service Level Objective', 'slo'],
  ['Utility', 'utility'],
  ['APM', 'apm'],
  ['Real User Monitoring', 'rum'],
]

// SDP is the one new entry; `count` is the side menu's trailing tag.
const INTEGRATION_SECTION = {
  label: 'Integration',
  icon: 'integration',
  children: INTEGRATIONS.map((label) => (label === SDP ? { label, count: 'NEW' } : { label })),
}

export const MENU_ITEMS = [
  ...SECTIONS.map(([label, icon]) => ({ label, icon, children: [{ label: `${label} settings` }] })),
  INTEGRATION_SECTION,
]

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

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/'/g, '&#39;')

// obs-side-menu opens its sections ONCE, at setup: the first section that has children, plus the
// one holding `active`. Items assigned later never open anything. Seeding the markup with only the
// Integration section makes it the section opened; the full list is assigned after mount, and the
// open state survives because setup does not run again. DS-GAPS G53.
const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Settings', icon: 'settings' })}
  <div class="app-shell__body">
    <nav class="integration-nav" aria-label="Settings">
      <obs-side-menu id="settings-menu" mode="sections" placeholder="Search"
        items='${escapeAttr(JSON.stringify([INTEGRATION_SECTION]))}'></obs-side-menu>
    </nav>
    <main class="app-shell__content integration-pane" id="integration-pane"></main>
  </div>
`

const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

export function viewFromHash(hash) {
  const query = String(hash || '').split('?')[1] || ''
  const view = new URLSearchParams(query).get('view')
  return INTEGRATIONS.includes(view) ? view : ''
}

export function mount(root) {
  root.innerHTML = TEMPLATE
  const overlay = document.getElementById('overlay-root')
  const menu = root.querySelector('#settings-menu')
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
      card.addEventListener('click', () => show(name))
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

  function renderElsewhere(name) {
    pane.innerHTML = `
      <header class="integration-intro">
        <h2 class="integration-intro__title"></h2>
      </header>
      <obs-banner variant="info" data-role="out-of-scope"></obs-banner>
    `
    pane.querySelector('.integration-intro__title').textContent = name
    pane.querySelector('obs-banner').textContent =
      `${name} keeps its existing screen. Only Integration Profile and ME Service Desk Plus change in this design.`
  }

  // --- View switching ---------------------------------------------------------------------------
  function show(view, { push = true } = {}) {
    // LAMA already has its own screen in this app.
    if (view === 'LAMA') {
      window.location.hash = href('settings', 'lama')
      return
    }
    closeDrawer()
    menu.setAttribute('active', view)
    if (view === PROFILE) renderProfiles()
    else if (view === SDP) renderConnection()
    else if (view) renderElsewhere(view)
    else renderLanding()

    // replaceState, not location.hash: a hashchange would remount the screen.
    if (push) {
      const next = view ? `${href('settings', 'integration')}?view=${encodeURIComponent(view)}` : href('settings', 'integration')
      if (window.location.hash !== next) history.replaceState(null, '', next)
    }
  }

  menu.addEventListener('select', (event) => {
    const label = detailValue(event)?.label
    if (INTEGRATIONS.includes(label)) show(label)
  })

  show(viewFromHash(window.location.hash), { push: false })
  // After the first render, so the seeded open state above is already in place.
  requestAnimationFrame(() => { menu.items = MENU_ITEMS })

  return function unmount() {
    closeDrawer()
  }
}
