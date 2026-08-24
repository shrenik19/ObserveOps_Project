// CONSUMER WORKAROUND — delete this file when the DS fixes it.
//
// obs-select's two-pane mode (`use-after-menu-description`) fills its right-hand pane from the
// HOVERED option only. The component tracks a highlight index that every option sets from its own
// `mouseenter`, and opening the menu leaves that index unset — so a select that already HAS a value
// opens with "Hover an option to see details." beside a list whose selected entry may be scrolled
// out of sight. The selected option's own description, which the component already holds, is never
// shown until the pointer happens to cross it. See docs/DS-GAPS.md, G30.
//
// Verified by rendering, not by reading: a real mouse hover over an option fills the pane with that
// counter's text, while opening the menu on a row whose counter is already chosen leaves the hint in
// place. The DS has no prop, method or event for "highlight the current value", so the selected
// option is nudged with the same `mouseenter` the component is already listening for.
//
// It takes any element with a shadow root, so it is fully unit-testable without a live custom
// element.

/** The option the component has marked as current, if any. */
export function selectedOption(root) {
  return root?.querySelector?.('.opts [role="option"][aria-selected="true"]') ?? null
}

/**
 * Show the selected option's description as soon as the menu opens, and bring that option into
 * view, so an already-chosen row reads the same as one the user just picked.
 *
 * @param {object}  options
 * @param {Element} options.select  the obs-select element
 */
export function augmentSelectDescription({ select } = {}) {
  if (!select) return
  const root = select.shadowRoot
  if (!root) return

  function reveal() {
    const chosen = selectedOption(root)
    if (!chosen) return
    // The list is the whole catalogue, so the current counter is usually below the fold.
    chosen.scrollIntoView?.({ block: 'nearest' })
    // `mouseenter` does not bubble, so it goes straight onto the option the component listens on.
    chosen.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
  }

  // Delegated on the shadow root, NOT bound to the trigger: the menu and its options only exist
  // once the dropdown is open, so binding them directly would race the first open.
  root.addEventListener('click', (event) => {
    const path = event.composedPath?.() ?? [event.target]
    const openedByTrigger = path.some((n) => n?.classList?.contains?.('trig'))
    if (!openedByTrigger) return
    // The menu is rendered on the tick after the click, so read it once the DOM has caught up.
    requestAnimationFrame(reveal)
  })
}
