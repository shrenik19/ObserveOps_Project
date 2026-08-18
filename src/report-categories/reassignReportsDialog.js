// The "this category still holds reports" step. Every report in the doomed category is listed with
// a destination picker, so nothing is silently orphaned.
//
// WHY THIS IS NOT AN obs-table. A per-row dropdown cannot live in a DS table cell: obs-table
// reports `slots: []` (no per-cell slot), its column `type` enum has no `select` member, and its
// `editable` mode turns editable columns into obs-inputs — text fields, not selects. So the grid is
// composed here from real DS elements instead. See docs/DS-GAPS.md, the G23 entry.

/** DS events wrap their value in an array — unwrap, tolerating a bare value. */
function detailValue(event) {
  const { detail } = event
  if (Array.isArray(detail)) return detail[0]
  if (detail !== undefined && detail !== null) return detail
  return event.target?.value
}

function button({ role, label, variant }) {
  const el = document.createElement('obs-button')
  el.setAttribute('data-role', role)
  el.setAttribute('variant', variant)
  el.textContent = label
  return el
}

export function renderReassignReportsDialog({
  categoryName,
  reports = [],
  categories = [],
  onCancel,
  onMoveAndDelete,
  onProceedAnyway,
} = {}) {
  // reportId -> destination categoryId. The single source of truth for what the user has chosen.
  const assignments = Object.create(null)
  /** @type {Map<string, {row: HTMLElement, select: HTMLElement}>} */
  const controls = new Map()

  const dialog = document.createElement('obs-modal')
  dialog.setAttribute('data-role', 'reassign-dialog')
  dialog.setAttribute('open', '')
  dialog.setAttribute('title', `Delete '${categoryName}'`)
  dialog.setAttribute('width', '720')
  dialog.setAttribute('scrollable', '')
  // Match the product default: a destructive decision must not be dismissed by a stray backdrop
  // click. Escape still works and is treated as a cancel.
  dialog.setAttribute('mask-closable', 'false')

  const body = document.createElement('div')
  body.className = 'reassign-dialog'
  dialog.appendChild(body)

  // --- Summary error ----------------------------------------------------
  const summaryError = document.createElement('p')
  summaryError.setAttribute('data-role', 'reassign-summary-error')
  summaryError.className = 'reassign-dialog__error'
  summaryError.textContent = 'New category not selected for all reports.'
  summaryError.hidden = true
  body.appendChild(summaryError)

  // --- Search -----------------------------------------------------------
  const search = document.createElement('obs-input')
  search.setAttribute('data-role', 'reassign-search')
  search.setAttribute('type', 'search')
  search.setAttribute('placeholder', 'Search')
  search.setAttribute('block', '')
  search.addEventListener('input', (event) => applyFilter(String(detailValue(event) ?? '')))
  body.appendChild(search)

  // --- Header -----------------------------------------------------------
  const grid = document.createElement('div')
  grid.className = 'reassign-dialog__grid'
  body.appendChild(grid)

  const header = document.createElement('div')
  header.className = 'reassign-dialog__head'
  for (const title of ['Reports', 'New Category']) {
    const cell = document.createElement('span')
    cell.className = 'reassign-dialog__head-cell'
    cell.textContent = title
    header.appendChild(cell)
  }
  grid.appendChild(header)

  // --- One row per report -----------------------------------------------
  for (const report of reports) {
    const row = document.createElement('div')
    row.setAttribute('data-role', 'reassign-row')
    row.dataset.reportId = report.id
    row.className = 'reassign-dialog__row'

    const name = document.createElement('span')
    name.className = 'reassign-dialog__name'
    name.textContent = report.name
    row.appendChild(name)

    const select = document.createElement('obs-select')
    select.setAttribute('data-role', 'reassign-select')
    select.setAttribute('placeholder', 'Select a category')
    select.setAttribute('block', '')
    select.setAttribute('aria-label', `New category for ${report.name}`)
    select.addEventListener('change', (event) => {
      const next = detailValue(event)
      if (!next) return
      assignments[report.id] = next
      select.removeAttribute('error')
      rowError.hidden = true
      if (isComplete()) summaryError.hidden = true
    })
    row.appendChild(select)

    // Per-row message. Colour alone is not an accessible error signal, and obs-select has no
    // errorMessage of its own to carry one.
    const rowError = document.createElement('p')
    rowError.setAttribute('data-role', 'reassign-row-error')
    rowError.className = 'reassign-dialog__row-error'
    rowError.textContent = 'Select a category'
    rowError.hidden = true
    row.appendChild(rowError)

    grid.appendChild(row)
    controls.set(report.id, { row, select, rowError })

    // Object-valued props are assigned only AFTER insertion: setting them on a not-yet-upgraded
    // custom element leaves own-properties that shadow the element's accessors once it upgrades,
    // and the trigger then renders the raw key instead of the option's label.
    // { value, text } is the web element's shape — NOT the catalogue's { key, text }.
    select.options = categories.map((c) => ({ value: c.id, text: c.name }))
    select.value = ''
  }

  /** Every report has a destination — including any hidden by the search filter. */
  const isComplete = () => reports.every((r) => Boolean(assignments[r.id]))

  function applyFilter(term) {
    const needle = term.trim().toLowerCase()
    for (const report of reports) {
      const { row } = controls.get(report.id)
      row.hidden = needle.length > 0 && !report.name.toLowerCase().includes(needle)
    }
  }

  function validate() {
    let ok = true
    for (const report of reports) {
      const { select, rowError } = controls.get(report.id)
      if (assignments[report.id]) {
        select.removeAttribute('error')
        rowError.hidden = true
      } else {
        // Marked even when the row is filtered out of view, so the error is not hidden by a search.
        select.setAttribute('error', '')
        rowError.hidden = false
        ok = false
      }
    }
    summaryError.hidden = ok
    return ok
  }

  // ONE outcome per dialog. Advancing to the next step replaces this element, which disconnects it
  // and makes obs-modal emit its own `close`. Read as a dismissal, that would tear down the step
  // this dialog just handed off to.
  let reported = false
  const once = (handler) => (...args) => {
    if (reported) return
    reported = true
    handler?.(...args)
  }

  // --- Footer -----------------------------------------------------------
  const footer = document.createElement('div')
  footer.setAttribute('slot', 'footer')
  footer.className = 'reassign-dialog__footer'

  const cancel = button({ role: 'reassign-cancel', label: 'Cancel', variant: 'default' })
  const reportCancel = once(onCancel)
  cancel.addEventListener('click', () => reportCancel())
  footer.appendChild(cancel)

  const spacer = document.createElement('span')
  spacer.className = 'reassign-dialog__spacer'
  footer.appendChild(spacer)

  const force = button({ role: 'reassign-force', label: 'Proceed Anyway', variant: 'error' })
  const reportProceed = once(onProceedAnyway)
  force.addEventListener('click', () => reportProceed())
  footer.appendChild(force)

  const move = button({ role: 'reassign-move', label: 'Move and Delete', variant: 'primary' })
  const reportMove = once(onMoveAndDelete)
  move.addEventListener('click', () => {
    // Validation runs BEFORE the latch: a rejected attempt is not an outcome, so the user can fix
    // the missing destinations and press the button again.
    if (!validate()) return
    reportMove({ ...assignments })
  })
  footer.appendChild(move)

  // A slotted child must be a direct child of the host.
  dialog.appendChild(footer)

  dialog.addEventListener('close', () => reportCancel())
  dialog.addEventListener('cancel', () => reportCancel())

  return dialog
}
