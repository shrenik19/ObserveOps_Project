// Step 1 — Report Type: the product's tile grid, with SLO added after NetRoute. Only SLO is a
// button; the other tiles are drawn as in the product but are inert (this design covers SLO only).

import { REPORT_TYPES, CLICKABLE } from './catalogue.js'
import { tileArt } from './tileArt.js'

export function renderReportTypeStep({ onPick }) {
  const el = document.createElement('section')
  el.className = 'report-type-step'
  el.dataset.role = 'report-type-step'

  const search = document.createElement('obs-input')
  search.dataset.role = 'report-type-search'
  search.setAttribute('type', 'search')
  search.setAttribute('placeholder', 'Search')
  search.className = 'report-type-step__search'

  const grid = document.createElement('div')
  grid.className = 'report-type-step__grid'
  for (const type of REPORT_TYPES) {
    const live = CLICKABLE.has(type)
    const tile = document.createElement(live ? 'button' : 'div')
    tile.className = 'report-tile'
    tile.dataset.type = type
    if (live) {
      tile.type = 'button'
      tile.addEventListener('click', () => onPick(type))
    } else {
      tile.setAttribute('aria-disabled', 'true')
    }
    tile.innerHTML = `${tileArt(type)}<span class="report-tile__label"></span>`
    tile.querySelector('.report-tile__label').textContent = type
    grid.append(tile)
  }

  // obs-input re-emits its inner input's events; read the value off the host.
  const filter = () => {
    const q = String(search.value ?? '').trim().toLowerCase()
    for (const tile of grid.children) tile.hidden = Boolean(q) && !tile.dataset.type.toLowerCase().includes(q)
  }
  search.addEventListener('input', filter)
  search.addEventListener('change', filter)

  const more = document.createElement('p')
  more.className = 'custom-report__more'
  more.append('For more information: ')
  const link = document.createElement('obs-link')
  link.setAttribute('external', '')
  link.textContent = 'Create Custom Report'
  more.append(link)

  el.append(search, grid, more)
  return el
}
