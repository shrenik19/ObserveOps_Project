// A list of repeating rows with add/remove affordances.
//
// It exists because the affordance rule below has an edge case and has to hold identically at two
// nesting levels (custom-field groups, and the metadata rows inside each group). Written twice it
// would drift, so it is written once here and composed.
//
//   exactly one row  -> that row shows (+) only; there is nothing to remove back to
//   two or more      -> EVERY row shows (x), and the LAST also shows (+)
//
// The repeater owns the list and the affordances and nothing else — it never inspects what a row
// contains. `renderRow({ id })` returns `{ element, ...api }` and that api is handed back through
// `rows()`, so the caller keeps whatever handles it needs.

let sequence = 0
const nextId = () => `row-${++sequence}`

function iconButton({ role, name, label, repeater }) {
  // obs-icon renders no control of its own, so the affordance is built as a real obs-button in
  // square/transparent form — keeps it keyboard-operable and out of the raw-controls count.
  const button = document.createElement('obs-button')
  button.setAttribute('data-role', role)
  // Nested repeaters put one level's controls inside another's rows, so a document-order query for
  // `repeater-add` would hit the inner one. This names the level unambiguously.
  if (repeater) button.setAttribute('data-repeater', repeater)
  button.setAttribute('variant', 'transparent')
  // `squared` is the documented 35x35 icon button; `square` renders 48 wide, which forces the
  // reserved actions track wider than it needs to be.
  button.setAttribute('squared', '')
  button.setAttribute('aria-label', label)

  const icon = document.createElement('obs-icon')
  icon.setAttribute('name', name)
  icon.setAttribute('size', '16')
  icon.setAttribute('aria-hidden', 'true')
  button.appendChild(icon)

  return button
}

/**
 * @param {object}   options
 * @param {Element}  options.mount        container the rows are appended to
 * @param {Function} options.renderRow    ({ id }) => ({ element, ...api })
 * @param {string}   [options.addLabel]   accessible name for the add control
 * @param {string}   [options.removeLabel] accessible name for the remove control
 * @param {Function} [options.onChange]   called after any add or remove
 */
export function createFieldRepeater({
  mount,
  renderRow,
  addLabel = 'Add row',
  removeLabel = 'Remove row',
  name,
  onChange,
} = {}) {
  /** @type {Array<{id: string, element: Element, actions: Element, api: object}>} */
  let rows = []

  function refreshAffordances() {
    const many = rows.length > 1
    rows.forEach((row, index) => {
      row.actions.replaceChildren()

      // A lone row has nothing to remove back to, so it carries no (x).
      if (many) {
        const remove = iconButton({ role: 'repeater-remove', name: 'timesCircle', label: removeLabel, repeater: name })
        remove.addEventListener('click', () => removeRow(row.id))
        row.actions.appendChild(remove)
      }

      // Only the last row grows the list.
      if (index === rows.length - 1) {
        const add = iconButton({ role: 'repeater-add', name: 'plusCircle', label: addLabel, repeater: name })
        add.addEventListener('click', () => addRow())
        row.actions.appendChild(add)
      }
    })
  }

  function addRow() {
    const id = nextId()
    const rendered = renderRow({ id })

    const element = document.createElement('div')
    element.setAttribute('data-role', 'repeater-row')
    if (name) element.setAttribute('data-repeater', name)
    element.dataset.rowId = id
    element.className = 'field-repeater__row'

    const body = document.createElement('div')
    body.className = 'field-repeater__body'
    body.appendChild(rendered.element)
    element.appendChild(body)

    const actions = document.createElement('div')
    actions.className = 'field-repeater__actions'
    element.appendChild(actions)

    mount.appendChild(element)
    const row = { id, element, actions, api: { ...rendered, id } }
    rows = [...rows, row]

    refreshAffordances()
    onChange?.()
    return row.api
  }

  function removeRow(id) {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    row.element.remove()
    rows = rows.filter((r) => r.id !== id)
    refreshAffordances()
    onChange?.()
  }

  return {
    addRow,
    removeRow,
    rows: () => rows.map((r) => r.api),
    count: () => rows.length,
  }
}
