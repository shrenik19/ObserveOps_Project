// Settings -> Service Level Objective (BETA) -> SLO Profile. Two views of one screen: the profile
// table (artboard 6) and the Create SLO Profile form (artboard 2). Creating does not change route,
// which is how the shipped product behaves.

import { pageHeaderHTML } from '../app/pageHeader.js'
import { createProfileStore } from './profiles.js'
import './sloProfile.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Settings', icon: 'settings' })}
  <div class="app-shell__body">
    <main class="app-shell__content" id="slo-profile-content">
      <section id="slo-profile-list">
        <obs-toolbar data-role="content-toolbar">
          <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
          <obs-button id="slo-profile-create" variant="primary">Create SLO Profile</obs-button>
        </obs-toolbar>
        <obs-table id="slo-profile-table" row-key="id" page-size="0" sticky-header max-height="100%"></obs-table>
      </section>
      <section id="slo-profile-form" hidden></section>
    </main>
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE
  const store = createProfileStore()

  const table = root.querySelector('#slo-profile-table')
  table.columns = [
    { key: 'type', title: 'SLO TYPE', width: 130, sortable: true },
    { key: 'name', title: 'SLO NAME', sortable: true },
    { key: 'frequency', title: 'FREQUENCY', width: 120, sortable: true },
    // Beside FREQUENCY so the evaluation parameters read together. Plain text: G1 records that
    // obs-table cannot put a component or an icon in a cell.
    { key: 'evaluation', title: 'EVALUATION LOGIC', width: 170, sortable: true },
    { key: 'warning', title: 'WARNING', width: 110, align: 'center' },
    { key: 'target', title: 'TARGET', width: 110, align: 'center' },
    { key: 'service', title: 'BUSINESS SERVICE NAME', width: 220, sortable: true },
    { key: 'start', title: 'START DATE', width: 140 },
  ]
  table.rows = store.rows()

  return function unmount() {}
}
