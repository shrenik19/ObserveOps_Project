// The report visualization on Report Criteria: the Grid or Top N preview on the left, and the
// collapsible Properties panel (Style tab only — user decision) on the right.

import { previewColumns, previewRows, TOPN_VIEWS } from './catalogue.js'
import { chartSvg, topN } from './charts.js'
import { segmented, detailValue, valueOf, setLater } from './dom.js'

const FONT_SIZES = ['Small', 'Medium', 'Large']

// Whether a wizard's Properties panel is collapsed. Kept outside the wizard: it is a view
// preference, not part of the report, and must survive the preview being rebuilt.
const collapsed = new WeakMap()

// Small inline pictures for the view picker — the DS has no chart-type icons (see DS-GAPS).
const VIEW_ICON = {
  area: '<path class="cr-icon-fill" d="M2 14 L6 8 L9 10 L14 3 L14 14 Z"/>',
  line: '<polyline class="cr-icon-line" points="2,13 6,7 9,10 14,3"/>',
  hbar: '<rect class="cr-icon-fill" x="2" y="3" width="11" height="2.5"/><rect class="cr-icon-fill" x="2" y="7" width="8" height="2.5"/><rect class="cr-icon-fill" x="2" y="11" width="5" height="2.5"/>',
  vbar: '<rect class="cr-icon-fill" x="3" y="4" width="2.5" height="10"/><rect class="cr-icon-fill" x="7" y="7" width="2.5" height="7"/><rect class="cr-icon-fill" x="11" y="10" width="2.5" height="4"/>',
  pie: '<circle class="cr-icon-line" cx="8" cy="8" r="6"/><path class="cr-icon-fill" d="M8 8 L8 2 A6 6 0 0 1 14 8 Z"/>',
  gauge: '<path class="cr-icon-line" d="M2.5 12 A5.5 5.5 0 0 1 13.5 12"/><path class="cr-icon-fill-line" d="M2.5 12 A5.5 5.5 0 0 1 10.5 7"/>',
  grid: '<rect class="cr-icon-line" x="2" y="3" width="12" height="10"/><line class="cr-icon-line" x1="2" y1="6.5" x2="14" y2="6.5"/><line class="cr-icon-line" x1="2" y1="10" x2="14" y2="10"/><line class="cr-icon-line" x1="7" y1="3" x2="7" y2="13"/>',
}

// The product's tags cell: the first tag, then "+N" for the rest.
const chips = (tags) => (tags.length > 1 ? [tags[0], `+${tags.length - 1}`] : [...tags])

const unitOf = (counter) => (counter.endsWith('.percent') ? '%' : counter.endsWith('.seconds') ? 's' : '')

// Fixed widths: nine-plus columns do not fit beside the Properties panel, and a squeezed column
// clips its text. With widths set, the preview scrolls sideways instead.
const WIDTH = { id: 80, name: 220, instance: 180, target: 110, service: 220, tags: 170, frequency: 130, profileType: 140 }
const COUNTER_WIDTH = 230

function table(state, rows) {
  const el = document.createElement('obs-table')
  el.dataset.role = 'preview-table'
  el.setAttribute('row-key', 'id')
  el.setAttribute('sticky-header', '')
  const columns = previewColumns({ sloType: state.query.sloType, counters: state.query.rows.map((r) => r.counter) })
    .map((c) => ({ ...c, width: WIDTH[c.key] ?? COUNTER_WIDTH, ...(c.key === 'tags' ? { type: 'tags' } : {}) }))
  // obs-table shrinks to its box and squeezes the widths; held at their sum, the preview scrolls.
  el.style.minWidth = `${columns.reduce((n, c) => n + c.width, 0)}px`
  return setLater(el, {
    columns,
    rows: rows.map((r) => ({ ...r, tags: chips(r.tags) })),
  })
}

function empty() {
  const el = document.createElement('p')
  el.className = 'slo-preview__empty'
  el.dataset.role = 'preview-empty'
  el.textContent = 'No data found'
  return el
}

function view(state, complete) {
  // The product shows its preview box from the start, empty until the query is complete.
  if (!complete) return empty()
  const counter = state.query.rows[0].counter
  const rows = previewRows({
    sloType: state.query.sloType, counters: state.query.rows.map((r) => r.counter),
    sourceFilter: state.query.sourceFilter, sources: state.query.sources,
  })
  if (state.widgetType === 'Grid') return table(state, rows)

  const ranked = topN(rows.map((r) => ({ ...r, value: r[counter] })))
  if (state.view === 'grid') return table(state, ranked)
  const chart = document.createElement('div')
  chart.className = 'slo-preview__chart'
  chart.dataset.role = 'preview-chart'
  const label = (r) => (r.instance ? `${r.name} · ${r.instance}` : r.name)
  chart.innerHTML = chartSvg(state.view, ranked.map((r) => ({ label: label(r), value: r.value })), { unit: unitOf(counter) })
  return chart
}

function styleTab({ wizard, onChange }) {
  const state = wizard.state()
  const body = document.createElement('div')
  body.className = 'slo-properties__style'

  if (state.widgetType === 'Grid') {
    const label = document.createElement('span')
    label.className = 'cr-field__label'
    label.textContent = 'Header Font Size'
    const size = segmented('font-size', FONT_SIZES, state.fontSize)
    size.addEventListener('change', (e) => { wizard.setFontSize(detailValue(e) ?? valueOf(size)); onChange?.() })
    const wrap = document.createElement('div')
    wrap.className = 'cr-field'
    wrap.append(label, size)
    body.append(wrap)
    return body
  }

  const views = document.createElement('div')
  views.className = 'slo-properties__views'
  views.setAttribute('role', 'group')
  views.setAttribute('aria-label', 'Chart view')
  for (const v of TOPN_VIEWS) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'slo-properties__view'
    b.dataset.view = v.key
    b.title = v.label
    b.setAttribute('aria-label', v.label)
    b.setAttribute('aria-pressed', String(state.view === v.key))
    b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${VIEW_ICON[v.key]}</svg>`
    b.addEventListener('click', () => { wizard.setView(v.key); onChange?.() })
    views.append(b)
  }
  body.append(views)
  return body
}

export function renderPreview({ wizard, onChange }) {
  const state = wizard.state()
  const el = document.createElement('div')
  el.className = 'slo-preview-area'
  el.dataset.role = 'slo-preview'

  const preview = document.createElement('div')
  preview.className = 'slo-preview'
  preview.append(view(state, !Object.keys(wizard.criteriaErrors()).length))

  const panel = document.createElement('aside')
  panel.className = 'slo-properties'
  panel.classList.toggle('is-collapsed', Boolean(collapsed.get(wizard)))

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'slo-properties__toggle'
  toggle.dataset.role = 'properties-toggle'
  toggle.setAttribute('aria-expanded', String(!collapsed.get(wizard)))
  toggle.setAttribute('aria-label', 'Properties')
  toggle.innerHTML = '<obs-icon name="chevronRight" size="14"></obs-icon>'

  const title = document.createElement('span')
  title.className = 'slo-properties__title'
  title.textContent = 'Properties'
  toggle.addEventListener('click', () => {
    collapsed.set(wizard, !collapsed.get(wizard))
    panel.classList.toggle('is-collapsed', collapsed.get(wizard))
    toggle.setAttribute('aria-expanded', String(!collapsed.get(wizard)))
  })

  const tabs = document.createElement('obs-tabs')
  // The product's three tabs. Column Setting and Timeline Preference are shown but not clickable
  // (user decision) — only Style is built.
  tabs.setAttribute('tabs', JSON.stringify([
    { key: 'style', label: 'Style' },
    { key: 'column-setting', label: 'Column Setting', disabled: true },
    { key: 'timeline-preference', label: 'Timeline Preference', disabled: true },
  ]))
  tabs.setAttribute('value', 'style')

  const panelBody = document.createElement('div')
  panelBody.className = 'slo-properties__body'
  panelBody.append(tabs, styleTab({ wizard, onChange }))
  panel.append(toggle, title, panelBody)

  el.append(preview, panel)
  return el
}
