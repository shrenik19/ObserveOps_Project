// Artboard 1 — the SLO estate. The shipped SLO_1 tile grid plus an Evaluation slot.
//
// The tiles are app markup because the DS has no card component (G47); src/app/cardList.js sets
// the precedent. Everything inside them that the DS does have — the status — is the DS's.

import { pageHeaderHTML } from '../app/pageHeader.js'
import { createStore } from './sloStore.js'
import './sloList.css'

export const meta = { pageHeader: { heading: 'SLO', icon: 'monitor' } }

// obs-severity carries the level; `value` overrides its label so `critical` reads `Breached`.
const STATUS_LABEL = { up: 'Ok', warning: 'Warning', critical: 'Breached' }

export const severityHTML = (status) =>
  `<obs-severity severity="${status}" shape="bg" value="${STATUS_LABEL[status]}"></obs-severity>`

export const tileHTML = (slo) => `
  <article class="slo-tile">
    <header class="slo-tile__head">
      <span class="slo-tile__name">${slo.name}</span>
      ${severityHTML(slo.status)}
    </header>
    <div class="slo-tile__slots">
      <div class="slo-tile__slot"><span class="slo-tile__lb">Type</span><span>Availability</span></div>
      <div class="slo-tile__slot"><span class="slo-tile__lb">Frequency</span><span>${slo.frequency}</span></div>
      <div class="slo-tile__slot">
        <span class="slo-tile__lb">Evaluation</span>
        <span class="slo-tile__eval">${slo.evaluation ? `Redundant · ${slo.evaluation}` : 'Strict'}</span>
      </div>
    </div>
    <div class="slo-tile__nums">
      <div class="slo-tile__num"><b>${slo.target}</b><span>Target</span></div>
      <div class="slo-tile__num"><b>${slo.achieved}</b><span>Achieved</span></div>
      <div class="slo-tile__num"><b>${slo.violation}</b><span>Violation</span></div>
    </div>
  </article>
`

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'SLO', icon: 'monitor' })}
  <div class="app-shell__body">
    <main class="app-shell__content" id="slo-content">
      <obs-toolbar data-role="content-toolbar">
        <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
        <!-- Drawn because SLO_1 has it; inert because the table alternative is out of scope. -->
        <obs-button id="slo-list-view" variant="default" title="List view" disabled>
          <obs-icon name="list" size="16" label="List view"></obs-icon>
        </obs-button>
      </obs-toolbar>
      <div id="slo-cards"></div>
    </main>
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE
  const store = createStore()

  // Tiles do not navigate: artboards 3-5 are not in this build, so a click would lead nowhere.
  // Spec P3.
  root.querySelector('#slo-cards').innerHTML =
    `<div class="slo-grid">${store.list().map(tileHTML).join('')}</div>`

  return function unmount() {}
}
