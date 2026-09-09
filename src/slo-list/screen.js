// Artboard 1 — the SLO estate. The shipped SLO_1 tile grid plus an Evaluation slot.
//
// The tiles are app markup because the DS has no card component (G47); src/app/cardList.js sets
// the precedent. Everything inside them that the DS does have — the status — is the DS's.

import { pageHeaderHTML } from '../app/pageHeader.js'
import { createStore } from './sloStore.js'
import './sloList.css'

export const meta = { pageHeader: { heading: 'SLO', icon: 'slo' } }

// obs-severity carries the level; `value` overrides its label so `critical` reads `Breached`.
const STATUS_LABEL = { up: 'Ok', warning: 'Warning', critical: 'Breached' }

export const severityHTML = (status) =>
  `<obs-severity severity="${status}" shape="bg" value="${STATUS_LABEL[status]}"></obs-severity>`

export const tileHTML = (slo) => {
  // The full reading goes on `title` too: `.slo-tile__eval` clips with an ellipsis (sloList.css),
  // and nothing should be lost when it does.
  const evalText = slo.evaluation ? `Redundant · ${slo.evaluation}` : 'Strict'
  return `
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
        <span class="slo-tile__eval" title="${evalText}">${evalText}</span>
      </div>
    </div>
    <div class="slo-tile__nums">
      <div class="slo-tile__num"><b>${slo.target}</b><span>Target</span></div>
      <div class="slo-tile__num"><b>${slo.achieved}</b><span>Achieved</span></div>
      <div class="slo-tile__num"><b>${slo.violation}</b><span>Violation</span></div>
    </div>
  </article>
`
}

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'SLO', icon: 'slo' })}
  <div class="app-shell__body">
    <main class="app-shell__content" id="slo-content">
      <obs-toolbar data-role="content-toolbar">
        <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
        <obs-button id="slo-bs-toggle" variant="default" title="Group by Business Service">
          <obs-icon name="businessService" size="16" label="Group by Business Service"></obs-icon>
        </obs-button>
        <!-- Drawn because SLO_1 has it; inert because the table alternative is out of scope. -->
        <obs-button id="slo-list-view" variant="default" title="List view" disabled>
          <obs-icon name="list" size="16" label="List view"></obs-icon>
        </obs-button>
      </obs-toolbar>
      <div id="slo-cards"></div>
    </main>
  </div>
`

// A service heading names the service once for every SLO beneath it, which is why the tile itself
// does not repeat it. Its status is the SEVEREST among its SLOs — see sloStore.js.
export const groupHTML = (group) => `
  <section class="slo-group">
    <header class="slo-group__head">
      <obs-icon name="businessService" size="16"></obs-icon>
      <span class="slo-group__name">${group.service}</span>
      <span class="slo-group__count">${group.count} ${group.count === 1 ? 'SLO' : 'SLOs'}</span>
      ${severityHTML(group.status)}
    </header>
    <div class="slo-grid">${group.slos.map(tileHTML).join('')}</div>
  </section>
`

// Spec §3's state table, and §6's mapping of it onto obs-page-header: `heading` swaps between
// `SLO` and `Business Services`; `meta` carries the counters (flat) or the services summary
// (grouped). Rendered and confirmed live (not read from the manifest, which has been wrong
// before): `meta` takes JSON `[{label?, value, icon?, status?}]` and paints each entry as a
// `label: value` pair, with a coloured `obs-severity` dot when `status` is given, joined by `|` —
// which is the closest honest rendering of "SLO + the Breached / Warning / Ok / Total counters"
// the component actually offers. `count` (a single pill next to the heading) cannot hold four
// figures at once, so it is not used here.
const FLAT_META_LABELS = [
  { key: 'critical', label: 'Breached', status: 'critical' },
  { key: 'warning', label: 'Warning', status: 'warning' },
  { key: 'up', label: 'Ok', status: 'up' },
]

const flatMetaJSON = (list) => {
  const counts = { up: 0, warning: 0, critical: 0 }
  for (const s of list) counts[s.status] = (counts[s.status] ?? 0) + 1
  return JSON.stringify([
    ...FLAT_META_LABELS.map(({ key, label, status }) => ({ label, value: counts[key], status })),
    { label: 'Total', value: list.length },
  ])
}

// A single meta entry with no `label`/`status` renders as its bare `value` string — the closest
// honest way to show "N services · M SLOs" as one reading rather than as separate pipe-joined
// items (which would print "N services | M SLOs" instead of the spec's own punctuation).
const groupedMetaJSON = (groups) => {
  const totalSlos = groups.reduce((n, g) => n + g.count, 0)
  const services = `${groups.length} ${groups.length === 1 ? 'service' : 'services'}`
  const slos = `${totalSlos} ${totalSlos === 1 ? 'SLO' : 'SLOs'}`
  return JSON.stringify([{ value: `${services} · ${slos}` }])
}

export function mount(root) {
  root.innerHTML = TEMPLATE
  const store = createStore()

  // Tiles do not navigate: artboards 3-5 are not in this build, so a click would lead nowhere.
  // Spec P3.
  const cards = root.querySelector('#slo-cards')
  const toggle = root.querySelector('#slo-bs-toggle')
  const header = root.querySelector('obs-page-header')
  let grouped = false

  const render = () => {
    if (grouped) {
      const groups = store.groups()
      cards.innerHTML = groups.map(groupHTML).join('')
      header.setAttribute('heading', 'Business Services')
      header.setAttribute('meta', groupedMetaJSON(groups))
    } else {
      const list = store.list()
      cards.innerHTML = `<div class="slo-grid">${list.map(tileHTML).join('')}</div>`
      header.setAttribute('heading', 'SLO')
      header.setAttribute('meta', flatMetaJSON(list))
    }
  }

  const onToggle = () => { grouped = !grouped; toggle.setAttribute('variant', grouped ? 'primary' : 'default'); render() }
  toggle.addEventListener('click', onToggle)
  render()

  return function unmount() {
    toggle.removeEventListener('click', onToggle)
  }
}
