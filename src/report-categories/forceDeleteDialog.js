// The last step of the delete flow: destroy the category AND every report in it.
//
// The typed-name gate is the whole point of this dialog — it makes an irreversible, data-losing
// action impossible to trigger by muscle memory. The comparison is exact and case-sensitive, and
// the confirm button stays disabled until it passes.

/** DS events wrap their value in an array — unwrap, tolerating a bare value. */
function detailValue(event) {
  const { detail } = event
  if (Array.isArray(detail)) return detail[0]
  if (detail !== undefined && detail !== null) return detail
  return event.target?.value
}

export function renderForceDeleteDialog({ categoryName, onCancel, onConfirm } = {}) {
  let matches = false

  const dialog = document.createElement('obs-modal')
  dialog.setAttribute('data-role', 'force-delete-dialog')
  dialog.setAttribute('open', '')
  dialog.setAttribute('title', '')
  dialog.setAttribute('width', '520')
  dialog.setAttribute('mask-closable', 'false')

  const body = document.createElement('div')
  body.className = 'force-delete-dialog'
  dialog.appendChild(body)

  const warningRow = document.createElement('div')
  warningRow.className = 'force-delete-dialog__warning-row'
  body.appendChild(warningRow)

  const icon = document.createElement('obs-icon')
  icon.className = 'force-delete-dialog__icon'
  icon.setAttribute('name', 'exclamationTriangle')
  icon.setAttribute('size', '32')
  icon.setAttribute('aria-hidden', 'true')
  warningRow.appendChild(icon)

  const copy = document.createElement('div')
  copy.className = 'force-delete-dialog__copy'
  warningRow.appendChild(copy)

  const warning = document.createElement('p')
  warning.setAttribute('data-role', 'force-delete-warning')
  warning.className = 'force-delete-dialog__warning'
  warning.textContent =
    'All reports associated within this category will be permanently deleted. This action cannot be undone.'
  copy.appendChild(warning)

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

  // ONE outcome per dialog: a successful Force Delete tears this element down, and the resulting
  // disconnect makes obs-modal emit its own `close`, which must not then be read as a cancel.
  let reported = false
  const once = (handler) => () => {
    if (reported) return
    reported = true
    handler?.()
  }
  const reportCancel = once(onCancel)
  const reportConfirm = once(onConfirm)

  const cancel = document.createElement('obs-button')
  cancel.setAttribute('data-role', 'force-delete-cancel')
  cancel.setAttribute('variant', 'default')
  cancel.textContent = 'Cancel'
  cancel.addEventListener('click', () => reportCancel())
  footer.appendChild(cancel)

  const confirm = document.createElement('obs-button')
  confirm.setAttribute('data-role', 'force-delete-confirm')
  confirm.setAttribute('variant', 'error')
  confirm.setAttribute('disabled', '')
  confirm.textContent = 'Force Delete'
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
