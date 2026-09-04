// src/wan-link-discovery/provisionGrid.js
// What the run produced, and which of it to keep. Same furniture as the device provision grid —
// checkbox column, inline rename, N/P/U legend, Cancel / Add Selected Objects — with WAN-Link
// columns, because a link has no host and no interface count.
//
// The IP SLA operation id is deliberately NOT a column. It stays internal.
//
// obs-table's checkbox column is a real, documented feature (elements-api.json: `selectable`
// boolean + `selected` — a String|Array prop that "reflects to el.selected (JSON)"), so the
// selectable/selected attributes below wire the real component. `el.select` / `el.selectAll` stay
// the exported test seam — jsdom does not register the DS's custom elements, so in tests they are
// the only thing driving selection; in the real page the `change` listener keeps the same internal
// state in sync with clicks on the component's own checkboxes.

const BADGES = [
  ['N', 'New', 'Created on the device and verified — not yet a monitored instance'],
  ['P', 'Provisioned', 'This exact link already exists as a monitored WAN link'],
  ['U', 'Unprovisioned', 'Operation is on the device but returned no data yet'],
]

export function renderProvisionGrid({ profileName, monitor, results, onCancel, onAdd }) {
  const el = document.createElement('section')
  el.className = 'wld-provision'
  el.innerHTML = `
    <header class="wld-progress__head">
      <h2 id="wld-prov-title"></h2>
      <span class="wld-form__spacer"></span>
      <span>Discovered Objects <b id="wld-prov-ok">0</b></span>
      <span>Failed Objects <b id="wld-prov-failed">0</b></span>
    </header>
    <obs-table id="wld-prov-table" row-key="id" page-size="0" sticky-header max-height="100%" selectable></obs-table>
    <footer class="wld-form__footer">
      <span id="wld-prov-legend" class="wld-provision__legend">
        ${BADGES.map(([k, label, hint]) =>
          `<span title="${hint}"><b>${k}</b> ${label}</span>`).join('')}
      </span>
      <span class="wld-form__spacer"></span>
      <obs-button id="wld-prov-cancel" variant="neutral-lightest">Cancel</obs-button>
      <obs-button id="wld-prov-add" variant="primary" disabled>Add Selected Objects</obs-button>
    </footer>
  `

  const $ = (id) => el.querySelector(`#${id}`)
  const verified = results.filter((r) => r.ok)

  $('wld-prov-title').textContent = profileName
  $('wld-prov-ok').textContent = String(verified.length)
  $('wld-prov-failed').textContent = String(results.length - verified.length)

  // Every row starts New: it was created and verified by this run, and is not yet a monitored
  // instance. P and U are reachable states of the same grid, hence the full legend.
  const state = verified.map((r, i) => ({
    id: `v${i}`,
    badge: 'N',
    name: `${r.link.isp} — ${r.link.dip}`,
    monitor: monitor.name,
    probe: r.link.probe,
    iface: r.link.iface,
    dip: r.link.dip,
    isp: r.link.isp,
    link: r.link,
    selected: false,
  }))

  const table = $('wld-prov-table')
  table.columns = [
    { key: 'name', title: 'NAME' },
    { key: 'monitor', title: 'MONITOR', width: 210 },
    { key: 'probe', title: 'WAN PROBE', width: 150 },
    { key: 'iface', title: 'SOURCE INTERFACE', width: 170 },
    { key: 'dip', title: 'DESTINATION IP', width: 150 },
    { key: 'isp', title: 'ISP', width: 120 },
  ]

  const refresh = () => {
    table.rows = state.map(({ link, ...row }) => row)
    // Keep the real component's own checkbox state in step with ours, by id.
    table.selected = state.filter((r) => r.selected).map((r) => r.id)
    $('wld-prov-add').toggleAttribute('disabled', !state.some((r) => r.selected))
  }
  refresh()

  el.select = (index) => { state[index].selected = !state[index].selected; refresh() }
  el.selectAll = (on) => { state.forEach((r) => { r.selected = on }); refresh() }
  el.rename = (index, name) => { state[index].name = name; refresh() }

  // The component's own checkbox column drives selection in the real page; `selected` reflects
  // back onto the element per elements-api.json, so a plain `change` listener is enough to fold a
  // user's click back into the state that `refresh()` already renders from.
  table.addEventListener('change', () => {
    const ids = Array.isArray(table.selected) ? table.selected : []
    state.forEach((r) => { r.selected = ids.includes(r.id) })
    $('wld-prov-add').toggleAttribute('disabled', !state.some((r) => r.selected))
  })

  $('wld-prov-cancel').addEventListener('click', () => onCancel())
  $('wld-prov-add').addEventListener('click', () => {
    onAdd(state.filter((r) => r.selected).map(({ link, name }) => ({ link, name })))
  })

  return el
}
