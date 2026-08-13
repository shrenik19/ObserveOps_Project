// obs-modal ships as a real web component with a purpose-built `confirm` variant (icon + message +
// Cancel/action footer), so this is configuration rather than a hand-composed modal reproduction.
// See docs/superpowers/plans/2026-08-06-ds-component-reference.md.
//
// The variant renders its footer inside the shadow root and reports back via `confirm` / `cancel`
// events — there are no light-DOM buttons to attach data-role hooks to.

export function renderDeleteConfirmDialog({ categoryName, onConfirm, onCancel } = {}) {
  const dialog = document.createElement('obs-modal')
  dialog.setAttribute('data-role', 'delete-confirm-dialog')
  dialog.setAttribute('open', '')
  dialog.setAttribute('variant', 'confirm')
  dialog.setAttribute('title', `Delete '${categoryName}'?`)
  dialog.setAttribute('icon', 'timesCircle')
  // Name the verb — the DS is explicit that confirm actions must never be labelled Yes/OK.
  dialog.setAttribute('confirm-text', 'Delete')
  dialog.setAttribute('cancel-text', 'Cancel')
  dialog.setAttribute('confirm-variant', 'error')
  dialog.setAttribute('width', '450')

  // The `confirm` variant renders the `title` attribute itself (as of elements@0.1.146 — it used
  // to drop it, which is why this file once repeated the heading in the content). Only the body
  // belongs here now.
  const message = document.createElement('p')
  message.setAttribute('data-role', 'delete-confirm-message')
  message.className = 'delete-confirm-dialog__message'
  message.textContent = "This can't be undone."

  dialog.appendChild(message)

  dialog.addEventListener('confirm', () => onConfirm?.())
  dialog.addEventListener('cancel', () => onCancel?.())
  // The modal has no × and no backdrop-close, but Escape still dismisses it — treat that as a
  // cancel so the host always gets told to tear the dialog down.
  dialog.addEventListener('close', () => onCancel?.())

  return dialog
}
