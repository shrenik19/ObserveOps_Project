// The last step of the delete flow — and now the last step of BOTH routes out of the reassign
// dialog, not just the destructive one.
//
// The typed-name gate is the whole point of this dialog: it makes an irreversible action impossible
// to trigger by muscle memory. The comparison is exact and case-sensitive, and the confirm button
// stays disabled until it passes.
//
// TWO MODES, one gate. Both routes end a category's life, so both are confirmed the same way:
//
//   mode: 'force'   Proceed Anyway   — the category AND every report in it are destroyed
//   mode: 'move'    Move and Delete  — the reports are relocated first, then the category goes
//
// They differ in what the warning says and what the button is called. 'move' is usually the gentler
// of the two, but it is NOT automatically safe: a report left without a destination goes with the
// category, so a partial move destroys reports too. That is why the numbers below are stated rather
// than implied, and why the category disappearing irreversibly is gated either way.
//
// Whichever route the user took, the numbers are spelled out here: how many reports go where, or
// how many are about to be destroyed. The count is the last thing seen before the point of no
// return, so it is stated rather than implied.
//
// BACK, NOT CANCEL. Reading those numbers is exactly when someone realises they mis-assigned a
// report — and with eighteen of them, Cancel is a punishment: it throws the whole grid away and the
// work starts again. Back returns to the grid with every destination still chosen. Cancel stays,
// and still means "abandon the whole thing", so the two outcomes remain distinct.

/** DS events wrap their value in an array — unwrap, tolerating a bare value. */
function detailValue(event) {
  const { detail } = event
  if (Array.isArray(detail)) return detail[0]
  if (detail !== undefined && detail !== null) return detail
  return event.target?.value
}

/** "1 report" / "5 reports" — the count is the point of the sentence, so it is never bare. */
export const pluralReports = (n) => `${n} ${n === 1 ? 'report' : 'reports'}`

/**
 * Group an assignment map into one line per destination, so the summary reads as a plan rather
 * than a total: "3 reports → Network".
 *
 * @param {object} assignments  reportId -> destination categoryId
 * @param {Array}  categories   [{ id, name }]
 * @returns {Array<{id: string, name: string, count: number}>}
 */
export function summariseMoves(assignments = {}, categories = []) {
  const nameOf = new Map(categories.map((c) => [c.id, c.name]))
  const counts = new Map()
  for (const destination of Object.values(assignments)) {
    counts.set(destination, (counts.get(destination) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, name: nameOf.get(id) ?? id, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/**
 * The headline warning for each mode.
 *
 * In move mode the numbers do the work: a partial move has to say how many are being KEPT and how
 * many are going, because the two halves have opposite consequences and the user chose both.
 *
 * @param {number} reportCount  every report the category holds
 * @param {number} movedCount   how many of them have a destination
 */
export function warningText({ mode = 'force', categoryName = '', reportCount = 0, movedCount = 0 } = {}) {
  if (mode === 'move') {
    if (reportCount === 0) {
      return `${categoryName} will be permanently deleted. This action cannot be undone.`
    }
    const deleted = Math.max(reportCount - movedCount, 0)
    if (deleted === 0) {
      return (
        `All ${pluralReports(reportCount)} will be moved to the categories chosen, and ${categoryName} ` +
        'will then be permanently deleted. This action cannot be undone.'
      )
    }
    return (
      `${movedCount} out of ${pluralReports(reportCount)} will be moved to the categories chosen. ` +
      `The remaining ${pluralReports(deleted)} will be permanently deleted along with ${categoryName}. ` +
      'This action cannot be undone.'
    )
  }
  return (
    `All ${pluralReports(reportCount)} associated within this category will be permanently deleted. ` +
    'This action cannot be undone.'
  )
}

export function renderForceDeleteDialog({
  categoryName,
  mode = 'force',
  reportCount = 0,
  movedCount = 0,
  moves = [],
  onCancel,
  onConfirm,
  onBack,
} = {}) {
  let matches = false
  const moving = mode === 'move'

  const dialog = document.createElement('obs-modal')
  dialog.setAttribute('data-role', 'force-delete-dialog')
  dialog.dataset.mode = mode
  dialog.setAttribute('open', '')
  dialog.setAttribute('title', '')
  dialog.setAttribute('width', '520')
  dialog.setAttribute('mask-closable', 'false')

  const body = document.createElement('div')
  body.className = 'force-delete-dialog'
  dialog.appendChild(body)

  // Back lives in the modal's top-LEFT corner: a left-pointing arrow that rewinds belongs at the
  // start of the header, opposite the × that dismisses at the end. Labelled, because "Back" is a
  // destination and a bare glyph in a corner is a guess.
  //
  // obs-modal exposes only `default` and `footer` slots — there is no header slot — so it cannot be
  // placed there directly. It is positioned instead: the modal's own `dialog.modal` element is
  // `position: fixed`, which makes it the containing block for anything absolutely positioned inside
  // the slotted content. So this sits in the light DOM, is styled from the consumer's stylesheet, and
  // still lands in the header. No shadow DOM is pierced.
  //
  // Rendered only when there IS a previous step: an empty category deletes outright without ever
  // passing through the grid, so it has nothing to go back to.
  if (onBack) {
    const back = document.createElement('obs-button')
    back.setAttribute('data-role', 'force-delete-back')
    back.setAttribute('variant', 'transparent')
    back.className = 'force-delete-dialog__back'
    const backIcon = document.createElement('obs-icon')
    backIcon.setAttribute('data-role', 'force-delete-back-icon')
    backIcon.setAttribute('name', 'chevronLeft')
    backIcon.setAttribute('size', '16')
    backIcon.setAttribute('aria-hidden', 'true')
    back.appendChild(backIcon)
    // The visible word IS the accessible name — no aria-label, which would only shadow it.
    back.appendChild(document.createTextNode('Back'))
    back.addEventListener('click', () => reportBack())
    body.appendChild(back)
  }

  const warningRow = document.createElement('div')
  warningRow.className = 'force-delete-dialog__warning-row'
  body.appendChild(warningRow)

  const icon = document.createElement('obs-icon')
  icon.className = 'force-delete-dialog__icon'
  icon.setAttribute('data-role', 'force-delete-icon')
  // The glyph follows the OUTCOME, not the route: informational only when every report survives,
  // the alarm whenever any is destroyed — which includes a partial move. The gate is identical
  // either way; only the tone changes.
  const losesReports = !moving || reportCount > movedCount
  icon.setAttribute('name', losesReports ? 'exclamationTriangle' : 'infoCircle')
  icon.setAttribute('size', '32')
  icon.setAttribute('aria-hidden', 'true')
  warningRow.appendChild(icon)

  const copy = document.createElement('div')
  copy.className = 'force-delete-dialog__copy'
  warningRow.appendChild(copy)

  const warning = document.createElement('p')
  warning.setAttribute('data-role', 'force-delete-warning')
  warning.className = 'force-delete-dialog__warning'
  warning.textContent = warningText({ mode, categoryName, reportCount, movedCount })
  copy.appendChild(warning)

  // --- What actually happens to the reports, in numbers -------------------
  const summary = document.createElement('ul')
  summary.setAttribute('data-role', 'force-delete-summary')
  summary.className = 'force-delete-dialog__summary'

  const line = (role, text, count) => {
    const item = document.createElement('li')
    item.setAttribute('data-role', role)
    item.className = 'force-delete-dialog__summary-item'
    item.dataset.count = String(count)
    item.textContent = text
    return item
  }

  if (moving) {
    for (const move of moves) {
      summary.appendChild(
        line('force-delete-move-line', `${pluralReports(move.count)} → ${move.name}`, move.count)
      )
    }
    // The other half of a partial move. Listed last and named plainly, so the reports being lost are
    // never implied by subtraction.
    const dropped = Math.max(reportCount - movedCount, 0)
    if (dropped > 0) {
      summary.appendChild(
        line('force-delete-destroy-line', `${pluralReports(dropped)} deleted permanently`, dropped)
      )
    }
  } else if (reportCount > 0) {
    summary.appendChild(
      line('force-delete-destroy-line', `${pluralReports(reportCount)} deleted permanently`, reportCount)
    )
  }
  summary.hidden = summary.childElementCount === 0
  copy.appendChild(summary)

  const instruction = document.createElement('p')
  instruction.setAttribute('data-role', 'force-delete-instruction')
  instruction.className = 'force-delete-dialog__instruction'
  instruction.textContent = `To confirm, type the category name ${categoryName} (case-sensitive) below.`
  copy.appendChild(instruction)

  const field = document.createElement('obs-input')
  field.setAttribute('data-role', 'force-delete-input')
  field.setAttribute('placeholder', categoryName)
  field.setAttribute('block', '')
  field.setAttribute('aria-label', `Type ${categoryName} to confirm`)
  copy.appendChild(field)

  // --- Footer -----------------------------------------------------------
  const footer = document.createElement('div')
  footer.setAttribute('slot', 'footer')
  footer.className = 'force-delete-dialog__footer'

  // ONE outcome per dialog: a successful confirm tears this element down, and the resulting
  // disconnect makes obs-modal emit its own `close`, which must not then be read as a cancel.
  let reported = false
  const once = (handler) => () => {
    if (reported) return
    reported = true
    handler?.()
  }
  const reportCancel = once(onCancel)
  const reportConfirm = once(onConfirm)
  const reportBack = once(onBack)

  const cancel = document.createElement('obs-button')
  cancel.setAttribute('data-role', 'force-delete-cancel')
  cancel.setAttribute('variant', 'default')
  cancel.textContent = 'Cancel'
  cancel.addEventListener('click', () => reportCancel())
  footer.appendChild(cancel)

  const confirm = document.createElement('obs-button')
  confirm.setAttribute('data-role', 'force-delete-confirm')
  // Red in BOTH modes: whatever happens to the reports, the category is destroyed either way.
  confirm.setAttribute('variant', 'error')
  confirm.setAttribute('disabled', '')
  confirm.textContent = moving ? 'Move and Delete' : 'Force Delete'
  confirm.addEventListener('click', () => {
    // Guarded as well as disabled: `disabled` is a rendering concern, this is the actual rule.
    // Checked BEFORE the latch, so a premature click is not an outcome and the user can type the
    // name and press again.
    if (!matches) return
    reportConfirm()
  })
  footer.appendChild(confirm)

  dialog.appendChild(footer)

  field.addEventListener('input', (event) => {
    // Exact and case-sensitive, and no trimming — " Inventory " is not the category's name.
    matches = String(detailValue(event) ?? '') === categoryName
    if (matches) confirm.removeAttribute('disabled')
    else confirm.setAttribute('disabled', '')
  })

  dialog.addEventListener('close', () => reportCancel())
  dialog.addEventListener('cancel', () => reportCancel())

  return dialog
}
