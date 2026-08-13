// obs-modal ships a purpose-built `confirm` variant (icon + message + Cancel/action footer), so
// this is configuration rather than a hand-composed modal.
//
// The variant renders its footer inside the shadow root and reports back via `confirm` / `cancel`
// events — there are no light-DOM buttons to attach data-role hooks to.
//
// NOTE ON THE BUTTON LABELS. The DS's own guidance is that a confirm action should name its verb
// rather than say Yes/OK. This dialog deliberately says No/Yes because the product's confirm step
// is specified that way, and the destructive verb is named a moment later on the force-delete
// step. The deviation is intentional and recorded in the design spec.

export function renderDeleteConfirmDialog({ categoryName, onConfirm, onCancel } = {}) {
  const dialog = document.createElement('obs-modal')
  dialog.setAttribute('data-role', 'delete-confirm-dialog')
  dialog.setAttribute('open', '')
  dialog.setAttribute('variant', 'confirm')
  // No heading: the question IS the content, per the product's confirm step.
  dialog.setAttribute('title', '')
  dialog.setAttribute('icon', 'trash')
  dialog.setAttribute('confirm-text', 'Yes')
  dialog.setAttribute('cancel-text', 'No')
  dialog.setAttribute('confirm-variant', 'error')
  dialog.setAttribute('width', '450')

  const message = document.createElement('p')
  message.setAttribute('data-role', 'delete-confirm-message')
  message.className = 'delete-confirm-dialog__message'
  message.textContent = `Are you sure you want to delete ${categoryName} Category?`

  dialog.appendChild(message)

  dialog.addEventListener('confirm', () => onConfirm?.())
  dialog.addEventListener('cancel', () => onCancel?.())
  // The modal has no × and no backdrop-close, but Escape still dismisses it — treat that as a
  // cancel so the host always gets told to tear the dialog down.
  dialog.addEventListener('close', () => onCancel?.())

  return dialog
}
