// src/wan-link-discovery/provisionGrid.js
// What the run produced, and which of it to keep. Same furniture as the device provision grid —
// title, export, search, checkbox column, inline rename with pencil, N/P/U legend,
// Cancel / Add Selected Objects — with WAN-Link columns, because a link has no host and no
// interface count. Export and Search are rendered inert (see the header markup below); they are
// spec furniture, not implemented behaviour.
//
// The IP SLA operation id is deliberately NOT a column. It stays internal.
//
// obs-table's checkbox column is a real, documented feature (elements-api.json: `selectable`
// boolean + `selected` — a String|Array prop that "reflects to el.selected (JSON)"), so the
// selectable/selected attributes below wire the real component. `el.select` / `el.selectAll` stay
// the exported test seam — jsdom does not register the DS's custom elements, so in tests they are
// the only thing driving selection; in the real page the `change` listener keeps the same internal
// state in sync with clicks on the component's own checkboxes.
//
// The NAME cell's pencil is the real thing too: `editable` (table) + `editable: true` (column) is
// a documented obs-table feature — "a pencil per row; editable columns become obs-inputs +
// Save/Cancel" (elements-api.json) — verified against the compiled component: the trailing
// edit-col renders a per-row pencil, and only columns flagged `editable: true` turn into an
// `obs-input` while that row is being edited, emitting `save` as `{id, values}`.
//
// What obs-table does NOT offer is a way to put the N/P/U badge and that pencil in the same cell —
// no column `type` composes a tag with editable text, and `slots` is `[]` (checked
// elements-api.json). So the badge is composed into the NAME cell's own text as an `N · ` prefix,
// per docs/DS-GAPS.md G39. `el.rename()` still takes and stores the raw name (the test seam is
// unchanged); the `save` listener below strips the badge prefix back off an edited cell's text
// before calling `el.rename()` with it, so a real pencil-driven edit lands the same raw name.

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
      <!-- Export and Search are spec furniture, rendered inert — present and correctly placed,
           doing nothing, the same treatment this app already gives unimplemented product chrome
           (the Monitors category bar and its export buttons in src/wan-link/screen.js). -->
      <obs-button id="wld-prov-export" variant="neutral-lightest" squared aria-label="Export as spreadsheet">
        <obs-icon name="exportXlsx" size="14"></obs-icon>
      </obs-button>
      <obs-input id="wld-prov-search" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
      <span class="wld-form__spacer"></span>
      <span>Discovered Objects <b id="wld-prov-ok">0</b></span>
      <span>Failed Objects <b id="wld-prov-failed">0</b></span>
    </header>
    <obs-table id="wld-prov-table" row-key="id" page-size="0" sticky-header max-height="100%" selectable editable></obs-table>
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
    // `editable: true` is a real, documented per-column flag (elements-api.json's `editable` note
    // on obs-table): with the table's own `editable` attribute set above, it turns this cell into
    // an obs-input behind a per-row pencil, exactly the "inline-editable name with pencil" the
    // spec calls for. The badge has nowhere else to render (see the file header and G39), so it is
    // composed into the same cell's text as an `N · ` prefix.
    { key: 'name', title: 'NAME', editable: true },
    { key: 'monitor', title: 'MONITOR', width: 210 },
    { key: 'probe', title: 'WAN PROBE', width: 150 },
    { key: 'iface', title: 'SOURCE INTERFACE', width: 170 },
    { key: 'dip', title: 'DESTINATION IP', width: 150 },
    { key: 'isp', title: 'ISP', width: 120 },
  ]

  // Matches a leading "<badge> · " so it can be stripped back off text that came out of the
  // component's own edit box (which starts from the composed, badged cell value).
  const BADGE_PREFIX = /^[NPU] · /

  const refresh = () => {
    // `link` is composition-internal and `selected` is tracked separately via `table.selected` —
    // neither belongs on the row object handed to obs-table.
    table.rows = state.map(({ link, selected, name, ...row }) => ({ ...row, name: `${row.badge} · ${name}` }))
    // Keep the real component's own checkbox state in step with ours, by id.
    table.selected = state.filter((r) => r.selected).map((r) => r.id)
    $('wld-prov-add').toggleAttribute('disabled', !state.some((r) => r.selected))
  }
  refresh()

  el.select = (index) => { state[index].selected = !state[index].selected; refresh() }
  el.selectAll = (on) => { state.forEach((r) => { r.selected = on }); refresh() }
  el.rename = (index, name) => { state[index].name = name; refresh() }

  /**
   * What `selected` actually hands back. elements-api.json types it `[String,Array]` and notes
   * "selected id array; reflects to el.selected (JSON)" — which reads as "you get your array back".
   * In the real browser you do not: the array this file assigns comes back as the JSON STRING
   * `'["v0"]'` the moment obs-table reflects a user's own checkbox click.
   *
   * Found by rendering (scripts/probe-wan-link-discovery.mjs, section G), not by reading: one click
   * fired `change` with detail `[["v0"]]` while `table.selected` read the string `'["v0"]'`, so the
   * `Array.isArray(table.selected)` guard that used to be here evaluated false, every click was
   * silently dropped, and **Add Selected Objects could never be enabled with the mouse** — the one
   * action this whole screen exists to reach. jsdom saw none of it: it does not register the DS's
   * custom elements, so the tests drive the `el.select()` seam and never touch this path.
   * See docs/DS-GAPS.md G41.
   */
  const selectedIds = (value) => {
    if (Array.isArray(value)) return value.map(String)
    if (typeof value !== 'string' || !value.trim()) return []
    try {
      const parsed = JSON.parse(value)
      return (Array.isArray(parsed) ? parsed : [parsed]).map(String)
    } catch {
      return value.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }

  // The component's own checkbox column drives selection in the real page. Read the event's own
  // payload first — the reflected property has not necessarily landed by the time `change` fires —
  // and fall back to the property for a `change` that carries no detail.
  table.addEventListener('change', (event) => {
    const payload = Array.isArray(event.detail) ? event.detail[0] : event.detail
    const ids = selectedIds(payload ?? table.selected)
    state.forEach((r) => { r.selected = ids.includes(r.id) })
    $('wld-prov-add').toggleAttribute('disabled', !state.some((r) => r.selected))
  })

  // A real pencil-driven edit: obs-table emits `save` as `{id, values}` (Vue custom-element
  // wrapper convention wraps the single emitted arg in `detail`, so either `detail` or `detail[0]`
  // — the same defensive read this app already uses elsewhere for these emits).
  table.addEventListener('save', (event) => {
    const detail = (event.detail && event.detail[0]) ?? event.detail
    if (!detail) return
    const index = state.findIndex((r) => r.id === detail.id)
    if (index < 0) return
    const edited = String((detail.values && detail.values.name) ?? '').replace(BADGE_PREFIX, '')
    el.rename(index, edited)
  })

  $('wld-prov-cancel').addEventListener('click', () => onCancel())
  $('wld-prov-add').addEventListener('click', () => {
    onAdd(state.filter((r) => r.selected).map(({ link, name }) => ({ link, name })))
  })

  return el
}
