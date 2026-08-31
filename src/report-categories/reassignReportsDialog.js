// The "this category still holds reports" step. Every report in the doomed category is listed with
// a destination picker, so nothing is silently orphaned.
//
// BULK MOVE. Setting eighteen pickers one at a time is the common case and the tedious one, so each
// row also carries a tick box and the header carries a select-all. Ticking anything reveals a bulk
// bar — "N selected · Move to [category]" — and CHOOSING a category writes it straight into every
// ticked row's picker. There is no Apply step: the choice is the action, so a picked category can
// never sit in the bar looking applied when it is not. The per-row pickers stay live for the
// exceptions, so the bulk bar is a shortcut and never a mode.
//
// The bar sits BETWEEN the search box and the grid, because it acts on the rows below it and on
// whatever the search has narrowed them to. Above the search it read as a header for the whole
// dialog rather than as a tool for the selection.
//
// NOT EVERY REPORT HAS TO MOVE. A destination is a choice to keep a report; leaving a row blank is a
// choice to let it go with the category. Move and Delete needs only ONE report going somewhere —
// the rest are deleted, and the final dialog says exactly how many before anything happens.
//
// Select-all deliberately spans only the rows currently VISIBLE under the search filter, so
// "search 'cpu', select all, move" is a whole workflow rather than a trap that also moves the
// twelve reports scrolled out of sight.
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
  // What the user had chosen last time this step was open. Coming BACK from the confirmation must
  // not cost them the work of re-picking eighteen destinations.
  initialAssignments = {},
  onCancel,
  onMoveAndDelete,
  onProceedAnyway,
} = {}) {
  // reportId -> destination categoryId. The single source of truth for what the user has chosen.
  const assignments = Object.create(null)
  for (const [reportId, destination] of Object.entries(initialAssignments)) {
    if (destination) assignments[reportId] = destination
  }
  /** Reports ticked for the bulk action. Selection is transient — it drives nothing but the bar. */
  const selected = new Set()
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
  summaryError.textContent =
    'Choose a new category for at least one report, or use Proceed Anyway to delete them all.'
  summaryError.hidden = true
  body.appendChild(summaryError)

  // --- Bulk bar ---------------------------------------------------------
  // Hidden until something is ticked: an empty bar is a control that does nothing, and it would
  // push the grid down on every open for no reason.
  // Laid out on the SAME track list as the grid rows, so its picker sits directly above the row
  // pickers instead of floating at its own width. See the grid rule in the stylesheet.
  const bulkBar = document.createElement('div')
  bulkBar.setAttribute('data-role', 'reassign-bulk-bar')
  bulkBar.className = 'reassign-dialog__bulk'
  bulkBar.hidden = true

  // A pill, not a sentence: the selection is a thing you can put down again, so it carries its own
  // dismiss. obs-tag closable+rounded IS the DS's chip — no need to fabricate one.
  const bulkCount = document.createElement('obs-tag')
  bulkCount.setAttribute('data-role', 'reassign-bulk-count')
  bulkCount.className = 'reassign-dialog__bulk-count'
  bulkCount.setAttribute('closable', '')
  bulkCount.setAttribute('rounded', '')
  bulkCount.addEventListener('close', () => clearSelection())
  bulkBar.appendChild(bulkCount)

  const bulkLabel = document.createElement('span')
  bulkLabel.className = 'reassign-dialog__bulk-label'
  bulkLabel.textContent = 'Move to'
  bulkBar.appendChild(bulkLabel)

  const bulkSelect = document.createElement('obs-select')
  bulkSelect.setAttribute('data-role', 'reassign-bulk-select')
  bulkSelect.setAttribute('placeholder', 'Select a category')
  // Without `block` the component renders its trigger at an intrinsic 240px inside a 260px track, so
  // the bulk picker came out 20px narrower than the row pickers directly beneath it. The HOSTS were
  // already the same width, which is why this only shows up by measuring the .trig.
  bulkSelect.setAttribute('block', '')
  bulkSelect.setAttribute('aria-label', 'Category to move the selected reports to')
  /** Set while the picker is being reset below, so that reset is not read as another choice. */
  let resetting = false
  bulkSelect.addEventListener('change', (event) => {
    if (resetting) return
    const next = detailValue(event)
    if (!next || selected.size === 0) return

    for (const id of selected) applyDestination(id, String(next))
    // The rows now show it; keeping them ticked would make the next pick silently re-target them.
    clearSelection()

    // Put the picker back to its placeholder, so applying the SAME category to a second selection
    // still fires a change. Left as-is it would look like a filter that is stuck on.
    resetting = true
    bulkSelect.value = ''
    resetting = false

    if (isComplete()) summaryError.hidden = true
  })
  bulkBar.appendChild(bulkSelect)

  // --- Search -----------------------------------------------------------
  const search = document.createElement('obs-input')
  search.setAttribute('data-role', 'reassign-search')
  search.setAttribute('type', 'search')
  search.setAttribute('placeholder', 'Search')
  search.setAttribute('block', '')
  search.addEventListener('input', (event) => applyFilter(String(detailValue(event) ?? '')))
  body.appendChild(search)

  // Under the search, above the grid — it acts on the rows the search is showing.
  body.appendChild(bulkBar)

  // --- Header -----------------------------------------------------------
  const grid = document.createElement('div')
  grid.className = 'reassign-dialog__grid'
  body.appendChild(grid)

  const header = document.createElement('div')
  header.className = 'reassign-dialog__head'

  const selectAll = document.createElement('obs-checkbox')
  selectAll.setAttribute('data-role', 'reassign-select-all')
  selectAll.setAttribute('aria-label', 'Select all reports')
  selectAll.addEventListener('change', (event) => {
    const next = detailValue(event)
    const on = typeof next === 'boolean' ? next : selectAll.hasAttribute('checked')
    // Only what the filter is showing — see the note at the top of this file.
    for (const report of visibleReports()) setSelected(report.id, on)
    refreshBulkBar()
  })
  header.appendChild(selectAll)

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

    const box = document.createElement('obs-checkbox')
    box.setAttribute('data-role', 'reassign-row-check')
    box.setAttribute('aria-label', `Select ${report.name}`)
    box.addEventListener('change', (event) => {
      const next = detailValue(event)
      setSelected(report.id, typeof next === 'boolean' ? next : box.hasAttribute('checked'))
      refreshBulkBar()
    })
    row.appendChild(box)

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
      // Straight to state — the picker already shows it, so writing back would loop.
      assignments[report.id] = String(next)
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
    controls.set(report.id, { row, select, rowError, box })

    // Object-valued props are assigned only AFTER insertion: setting them on a not-yet-upgraded
    // custom element leaves own-properties that shadow the element's accessors once it upgrades,
    // and the trigger then renders the raw key instead of the option's label.
    // { value, text } is the web element's shape — NOT the catalogue's { key, text }.
    select.options = categories.map((c) => ({ value: c.id, text: c.name }))
    // Restores a destination carried back from the confirmation step; '' for a fresh open.
    select.value = assignments[report.id] ?? ''
  }

  /** Every report has a destination — including any hidden by the search filter. */
  const isComplete = () => reports.every((r) => Boolean(assignments[r.id]))

  /** Rows the search filter is currently showing. Select-all is scoped to these. */
  const visibleReports = () => reports.filter((r) => !controls.get(r.id).row.hidden)

  /**
   * Write a destination into one row, from either route — a row's own picker or the bulk bar.
   * The picker is updated too, so a bulk apply is visible in the grid rather than only in state.
   */
  function applyDestination(reportId, categoryId) {
    const entry = controls.get(reportId)
    if (!entry) return
    assignments[reportId] = categoryId
    entry.select.value = categoryId
    entry.select.removeAttribute('error')
    entry.rowError.hidden = true
  }

  function setSelected(reportId, on) {
    const entry = controls.get(reportId)
    if (!entry) return
    if (on) {
      selected.add(reportId)
      entry.box.setAttribute('checked', '')
    } else {
      selected.delete(reportId)
      entry.box.removeAttribute('checked')
    }
    entry.row.dataset.selected = String(on)
  }

  function clearSelection() {
    for (const id of [...selected]) setSelected(id, false)
    selectAll.removeAttribute('checked')
    refreshBulkBar()
  }

  function refreshBulkBar() {
    const n = selected.size
    bulkBar.hidden = n === 0
    // "items", matching the product's own selection pill rather than naming the row type twice.
    bulkCount.textContent = `${n} item${n === 1 ? '' : 's'} selected`
    // The header box reflects the visible rows, so a filtered view answers "all of these?".
    const visible = visibleReports()
    const allVisible = visible.length > 0 && visible.every((r) => selected.has(r.id))
    if (allVisible) selectAll.setAttribute('checked', '')
    else selectAll.removeAttribute('checked')
  }

  function applyFilter(term) {
    const needle = term.trim().toLowerCase()
    for (const report of reports) {
      const { row } = controls.get(report.id)
      row.hidden = needle.length > 0 && !report.name.toLowerCase().includes(needle)
    }
    // A row hidden by the filter stays ticked — the user chose it deliberately and a search should
    // not silently drop it — but the header box now describes a different set of rows.
    refreshBulkBar()
  }

  /**
   * A partial move is a legitimate outcome, so an empty row is no longer an error: it means "this
   * report goes with the category". Only an ENTIRELY empty grid is refused, because that is
   * indistinguishable from Proceed Anyway and should be taken through that button instead — where
   * the wording makes the loss explicit.
   */
  function validate() {
    const ok = reports.some((r) => Boolean(assignments[r.id]))
    // Nothing is marked in red any more; there is no per-row mistake left to point at.
    for (const report of reports) {
      const { select, rowError } = controls.get(report.id)
      select.removeAttribute('error')
      rowError.hidden = true
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

  // Red, like Proceed Anyway beside it: both routes end with the category destroyed, so neither is
  // the safe default that a primary button would imply.
  const move = button({ role: 'reassign-move', label: 'Move and Delete', variant: 'error' })
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

  // Object-valued props only after insertion, for the same reason as the per-row pickers.
  bulkSelect.options = categories.map((c) => ({ value: c.id, text: c.name }))
  bulkSelect.value = ''
  refreshBulkBar()

  return dialog
}
