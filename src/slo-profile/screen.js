// Settings -> Service Level Objective (BETA) -> SLO Profile. Two views of one screen: the profile
// table (artboard 6) and the Create SLO Profile form (artboard 2). Creating does not change route,
// which is how the shipped product behaves.

import { pageHeaderHTML } from '../app/pageHeader.js'
import { createProfileStore } from './profiles.js'
import { renderCreateForm } from './createForm.js'
import './sloProfile.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

// The filter bar's leading chips, in the order the screenshot shows them. `key` is the row field
// the chip filters on; `label` is the chip's caption.
const FILTER_FIELDS = [
  { key: 'type', label: 'SLO Type' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'service', label: 'Business Service' },
]

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Settings', icon: 'settings' })}
  <div class="app-shell__body">
    <main class="app-shell__content" id="slo-profile-content">
      <section id="slo-profile-list">
        <obs-toolbar data-role="content-toolbar">
          <obs-input slot="start" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
          <obs-button id="slo-profile-create" variant="primary">Create SLO Profile</obs-button>
        </obs-toolbar>

        <!-- The DS FilterBar, the same obs-filters kind="bar" report-categories uses: it brings its
             own "+ Filter", Match All/Any and Clear All, so none of that is ours. -->
        <obs-filters id="slo-profile-filters" kind="bar"></obs-filters>

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

  // --- Filter bar ---------------------------------------------------------------------------------
  // obs-filters kind="bar". Contract as of elements@0.1.150:
  //   fields  -> [{ key, label, type:'enum', values:[...] }]
  //   value   -> active conditions [{ field, operator, value }]  (value=[] renders just "+ Filter")
  //   change  -> emits { conditions, match }
  //
  // The screenshot's three leading chips are the product's `defaultChips` — non-removable captions
  // the module declares. The ELEMENT has no defaultChips: probing it in real Chrome showed only
  // `fields`, `value` and `match`, and both a defaultChips property and a default-chips attribute
  // were ignored. Seeding `value` with one VALUELESS condition per field renders the same chip row
  // through the documented API, so that is what we do. The two cosmetic differences it leaves — the
  // chips keep a removable x, and Match/Clear All show before anything is applied — are DS-GAPS G37.
  const filters = root.querySelector('#slo-profile-filters')
  let conditions = FILTER_FIELDS.map((f) => ({ field: f.key, operator: '=', value: [] }))
  let matchMode = 'all'

  const distinct = (key) => [...new Set(store.rows().map((r) => r[key]))].sort()

  // Re-read after every store write: a created profile can introduce a Business Service the
  // pickers have never seen.
  const syncFields = () => {
    filters.fields = FILTER_FIELDS.map((f) => ({ ...f, type: 'enum', values: distinct(f.key) }))
  }

  /** A condition's value may be a single value or a list — normalise before comparing. */
  const matches = (row, condition) => {
    const wanted = Array.isArray(condition.value) ? condition.value : [condition.value]
    return wanted.includes(row[condition.field])
  }

  // A chip with no value yet is a default chip at rest, not a filter that matches nothing.
  const active = () => conditions.filter((c) => (Array.isArray(c.value) ? c.value.length : c.value != null && c.value !== ''))

  function applyFilters(rows) {
    const on = active()
    if (!on.length) return rows
    const test = (row) => on.map((c) => matches(row, c))
    return rows.filter((row) => (matchMode === 'any' ? test(row).some(Boolean) : test(row).every(Boolean)))
  }

  // Every write to table.rows goes through here, so a filtered view survives a create.
  const render = () => { table.rows = applyFilters(store.rows()) }

  syncFields()
  filters.value = conditions
  render()

  // DS events deliver the value in event.detail as an array — unwrap.
  const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

  filters.addEventListener('change', (event) => {
    const next = detailValue(event)
    // { conditions, match } since 0.1.150; tolerate the bare array the element emitted before it.
    conditions = Array.isArray(next) ? next : (next?.conditions ?? [])
    matchMode = Array.isArray(next) ? 'all' : (next?.match ?? 'all')
    render()
  })

  const list = root.querySelector('#slo-profile-list')
  const form = root.querySelector('#slo-profile-form')

  const showList = () => { form.hidden = true; list.hidden = false; form.innerHTML = '' }
  const showForm = () => {
    list.hidden = true
    form.hidden = false
    renderCreateForm(form, {
      onCancel: showList,
      // The Create form creates (spec §8): persist the draft, refresh the table from the store so
      // the new row is there, then return — the same pattern lama/screen.js and
      // wan-link-discovery/profileStore.js already use for their own Create flows.
      onCreate: (draft) => {
        store.add(draft)
        syncFields()
        render()
        showList()
      },
    })
  }

  const openCreateForm = () => showForm()
  root.querySelector('#slo-profile-create').addEventListener('click', openCreateForm)

  return function unmount() {
    root.querySelector('#slo-profile-create')?.removeEventListener('click', openCreateForm)
  }
}
