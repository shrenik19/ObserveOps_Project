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

/** "1 report" / "5 reports" — the count is the point of the sentence, so it is never bare. */
export const pluralReports = (n) => `${n} ${n === 1 ? 'report' : 'reports'}`

/**
 * What deleting this category costs, as SEPARATE facts rather than a paragraph.
 *
 * This started as one line, then grew into four lines of uniform grey prose — which is worse than
 * either. Three unrelated things were fused into one block: how many reports are at stake, what
 * happens to them next, and that none of it can be undone. The number that actually changes the
 * decision sat mid-sentence at the same weight as everything around it, and the irreversibility
 * landed last, where a reader who has already decided has stopped reading.
 *
 * They are returned apart so the dialog can give each one its own line and its own weight:
 *
 *   stake   "18 reports are in this category."   the number, leading, on its own
 *   choice  what happens next, in one clause
 *   warning the irreversible bit, visually separated
 *
 * The choice line is empty for an empty category — there is nothing to decide about reports that do
 * not exist, and no line at all beats a sentence explaining that nothing will happen.
 */
export function consequenceParts(categoryName, reportCount = 0) {
  if (reportCount === 0) {
    return {
      stake: `${categoryName} holds no reports.`,
      choice: '',
      warning: 'This action cannot be undone.',
    }
  }
  return {
    // "1 report IS", "18 reports ARE" — the verb has to follow the count, not the plural noun.
    stake: `${pluralReports(reportCount)} ${reportCount === 1 ? 'is' : 'are'} in this category.`,
    choice: 'You can move them to another category, or delete them along with it.',
    warning: 'This action cannot be undone.',
  }
}

/** The same three facts as one string, for anything that needs them flat (tests, aria). */
export function consequenceText(categoryName, reportCount = 0) {
  const { stake, choice, warning } = consequenceParts(categoryName, reportCount)
  return [stake, choice, warning].filter(Boolean).join(' ')
}

export function renderDeleteConfirmDialog({ categoryName, reportCount = 0, onConfirm, onCancel } = {}) {
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

  // The consequence, broken into its three facts. Each gets a line and a weight of its own, so the
  // count is seen before it is read and the warning is not the tail of a paragraph.
  const { stake, choice, warning } = consequenceParts(categoryName, reportCount)

  const consequence = document.createElement('div')
  consequence.setAttribute('data-role', 'delete-confirm-consequence')
  consequence.className = 'delete-confirm-dialog__consequence'

  const stakeLine = document.createElement('p')
  stakeLine.setAttribute('data-role', 'delete-confirm-stake')
  stakeLine.className = 'delete-confirm-dialog__stake'
  stakeLine.textContent = stake
  consequence.appendChild(stakeLine)

  if (choice) {
    const choiceLine = document.createElement('p')
    choiceLine.setAttribute('data-role', 'delete-confirm-choice')
    choiceLine.className = 'delete-confirm-dialog__choice'
    choiceLine.textContent = choice
    consequence.appendChild(choiceLine)
  }

  // Plain text. No glyph, no rule, no alarm colour: this step ASKS, it does not warn — the red and
  // the icon belong to the force-delete gate, where the action is actually irreversible on click.
  // Dressing this line up made the softer step look louder than the final one.
  const warningLine = document.createElement('p')
  warningLine.setAttribute('data-role', 'delete-confirm-warning')
  warningLine.className = 'delete-confirm-dialog__warning'
  warningLine.textContent = warning
  consequence.appendChild(warningLine)
  dialog.appendChild(consequence)

  // ONE outcome per dialog. obs-modal emits `confirm` -> `close` -> `hide` from a single click on
  // the action button, so `close` arrives after a SUCCESSFUL confirm as well as after a dismissal.
  // Without this latch the trailing `close` is read as a cancel and the host tears down whatever
  // step the confirm just opened — which dead-ended this flow with a blank screen.
  let reported = false
  const once = (handler) => () => {
    if (reported) return
    reported = true
    handler?.()
  }

  dialog.addEventListener('confirm', once(onConfirm))
  dialog.addEventListener('cancel', once(onCancel))
  // The modal has no × and no backdrop-close, but Escape still dismisses it — treat that as a
  // cancel so the host always gets told to tear the dialog down.
  dialog.addEventListener('close', once(onCancel))

  return dialog
}
