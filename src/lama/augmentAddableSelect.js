// CONSUMER WORKAROUND — delete this file when the DS fixes it.
//
// obs-select's `can-user-add-options` renders the inline "+" and forces the search row open, but
// clicking it emits NOTHING and never adds the option. Verified by patching dispatchEvent on the
// element and capturing every event it fires: typing produces a stream of `search` events, and the
// "+" click — and Enter — produce none at all, with `options` unchanged. The affordance is present
// but inert, the same defect shape as the app-header avatar (G22) and the filter Match control
// (G18). See docs/DS-GAPS.md, G27.
//
// So the typed text comes from the PUBLIC `search` event, and only the click target is taken from
// the shadow root. If the DS ever emits an add event, delete this file and listen to that instead.
//
// It takes any element with a shadow root, so it is fully unit-testable without a live custom
// element.

/** Normalise to the DS's { value, text } option shape and append, without duplicating. */
export function withAddedOption(options = [], value) {
  const normalised = options.map((o) => (typeof o === 'string' ? { value: o, text: o } : o))
  if (normalised.some((o) => o.value === value)) return normalised
  return [...normalised, { value, text: value }]
}

const INTERNAL_ADD_BUTTON = '.addbtn'

/**
 * @param {object}   options
 * @param {Element}  options.select   the obs-select element
 * @param {Function} [options.onAdd]  called with the value that was added
 */
export function augmentAddableSelect({ select, onAdd } = {}) {
  if (!select) return
  const root = select.shadowRoot
  if (!root) return

  // The typed text, straight from the component's own public `search` event — no piercing needed
  // for this half.
  let query = ''
  select.addEventListener('search', (event) => {
    const detail = event.detail
    query = String((Array.isArray(detail) ? detail[0] : detail) ?? '')
  })

  function commit() {
    const value = query.trim()
    if (!value) return

    const before = select.options ?? []
    const after = withAddedOption(before, value)
    // Already present: select it rather than adding a duplicate.
    if (after.length !== before.length) select.options = after

    select.value = value
    // Report it the way the component would have, so callers need not know this file exists.
    select.dispatchEvent(new CustomEvent('change', { detail: [value] }))
    onAdd?.(value)

    // The query is spent. Without this, a second click on "+" would re-add the same text.
    query = ''

    // Dismiss the component's own inline-add editor row. The DS opens a "+ / tick / cross" editor
    // that never commits anything, so once we have added the value that row is stale UI sitting on
    // screen. Closing the menu takes it with it.
    root.querySelector('.trig')?.click()
  }

  // Delegated on the shadow root, NOT bound to the button itself. The add button and search row are
  // only created when the dropdown opens, so binding them directly would need a MutationObserver
  // and would race the first open. Delegation sidesteps that entirely.
  root.addEventListener('click', (event) => {
    const path = event.composedPath?.() ?? [event.target]
    const hitAdd = path.some((n) => n?.classList?.contains?.(INTERNAL_ADD_BUTTON.slice(1)))
    if (hitAdd) commit()
  })

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    const path = event.composedPath?.() ?? [event.target]
    if (!path.some((n) => n?.tagName === 'INPUT')) return
    event.preventDefault()
    commit()
  })
}
