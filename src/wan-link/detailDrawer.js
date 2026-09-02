import { PROBES, tilesFor, chartsFor, availabilityWindows } from './probes.js'
import { chartHTML } from './chart.js'

const escape = (value) =>
  String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

const tileHTML = (tile) => `
  <div class="wl-card wl-tile">
    <h3 class="wl-card__title">${escape(tile.title)}</h3>
    ${tile.caption ? `<div class="wl-tile__label">${escape(tile.caption)}</div>` : ''}
    <div class="wl-tile__values">
      ${tile.values.map((v) => `
        <div>
          ${v.label ? `<div class="wl-tile__label">${escape(v.label)}</div>` : ''}
          <div class="wl-tile__value">${escape(v.value)}${v.unit ? `<span class="wl-tile__unit">${escape(v.unit)}</span>` : ''}</div>
        </div>`).join('')}
    </div>
  </div>`

const donutHTML = (def) => `
  <section class="wl-card" style="--wl-span:${def.span}">
    <h3 class="wl-card__title">${escape(def.title)}</h3>
    <div class="wl-donut"><span>Up<b>100%</b></span></div>
  </section>`

const barsHTML = (def, windows) => `
  <section class="wl-card" style="--wl-span:${def.span}">
    <h3 class="wl-card__title">${escape(def.title)}</h3>
    ${windows.map((w) => `
      <div class="wl-bar">
        <div class="wl-tile__label">${escape(w)}</div>
        <div class="wl-bar__track"></div>
        <div class="wl-bar__ends"><span>0%</span><span>100%</span></div>
      </div>`).join('')}
  </section>`

export function renderDetailDrawer({ link, onClose }) {
  const probe = PROBES[link.probe]
  const windows = availabilityWindows(link.probe)

  const body = chartsFor(link.probe)
    .map((def) => {
      if (def.kind === 'donut') return donutHTML(def)
      if (def.kind === 'bars') return barsHTML(def, windows)
      return chartHTML(def)
    })
    .join('')

  const tiles = tilesFor(link.probe)

  const drawer = document.createElement('obs-drawer')
  drawer.setAttribute('placement', 'right')
  drawer.setAttribute('width', '92%')
  drawer.setAttribute('mask-closable', '')
  drawer.setAttribute('use-padding', '')
  drawer.setAttribute('open', '')

  drawer.innerHTML = `
    <div slot="title">
      <div class="wl-drawer__title">
        <span class="wl-name">${escape(link.name)}</span>
        <span class="wl-drawer__sep" aria-hidden="true"></span>
        <span class="wl-drawer__probe">${escape(probe.label)}</span>
        <span class="wl-drawer__sep" aria-hidden="true"></span>
        <obs-severity severity="${escape(link.status)}" shape="chip" display-text></obs-severity>
      </div>
      <div class="wl-drawer__groups">
        <obs-tag>${escape(link.group)}</obs-tag>
        ${link.moreGroups ? `<obs-tag>+${escape(link.moreGroups)}</obs-tag>` : ''}
      </div>
    </div>
    ${tiles.length ? `<div class="wl-tiles">${tiles.map(tileHTML).join('')}</div>` : ''}
    <div class="wl-grid">${body}</div>
  `

  drawer.addEventListener('close', () => onClose())
  return drawer
}
