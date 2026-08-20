// Metadata Fields — a flat, repeating list of Metadata / Value pairs.
//
// This replaces the earlier two-level Custom Fields section. The parent layer (Custom Field +
// Metric Plugin Name) is gone; the metadata rows that used to be nested inside it are now
// independent top-level fields, each standing on its own.
//
// One rule survives from the nested version, and it is the only conditional behaviour here:
//
//   Metadata non-empty -> Value required
//
// The (+)/(x) rule comes from fieldRepeater, so it matches every other repeating list in this
// drawer: a lone row shows (+) only; two or more show (x) on every row and (+) on the last.

import { createFieldRepeater } from './fieldRepeater.js'

/** DS events wrap their value in an array — unwrap, tolerating a bare value. */
function detailValue(event) {
  const { detail } = event
  if (Array.isArray(detail)) return detail[0]
  if (detail !== undefined && detail !== null) return detail
  return event.target?.value
}

const valueOf = (input) => (input.getAttribute('value') ?? '').trim()

function field({ role, label, placeholder }) {
  const input = document.createElement('obs-input')
  input.setAttribute('data-role', role)
  input.setAttribute('label', label)
  input.setAttribute('value', '')
  input.setAttribute('placeholder', placeholder)
  input.setAttribute('block', '')
  return input
}

/** Mirror typing into the `value` attribute so reads are consistent and jsdom-visible. */
function onType(input, handler) {
  input.addEventListener('input', (event) => {
    const next = String(detailValue(event) ?? '')
    input.setAttribute('value', next)
    handler(next)
  })
}

function setRequired(input, required) {
  if (required) input.setAttribute('required', '')
  else input.removeAttribute('required')
}

export function renderMetadataFieldsSection() {
  const element = document.createElement('section')
  element.className = 'metadata-fields'
  element.setAttribute('data-role', 'metadata-fields-section')

  const title = document.createElement('h3')
  title.setAttribute('data-role', 'metadata-fields-title')
  title.className = 'section-title'
  title.textContent = 'Metadata Fields'
  element.appendChild(title)

  const mount = document.createElement('div')
  mount.className = 'metadata-fields__rows'
  element.appendChild(mount)

  const rows = createFieldRepeater({
    mount,
    name: 'metadata',
    addLabel: 'Add metadata field',
    removeLabel: 'Remove metadata field',
    renderRow: () => {
      const rowEl = document.createElement('div')
      rowEl.setAttribute('data-role', 'metadata-row')
      rowEl.className = 'metadata-fields__pair'

      const key = field({ role: 'metadata-key', label: 'Metadata', placeholder: 'Write metadata' })
      const value = field({ role: 'metadata-value', label: 'Value', placeholder: 'Write value' })
      rowEl.append(key, value)

      // A row's own key governs its value.
      onType(key, (next) => {
        setRequired(value, next.trim().length > 0)
        if (next.trim().length === 0) value.removeAttribute('error')
      })
      onType(value, (next) => {
        if (next.trim().length > 0) value.removeAttribute('error')
      })

      return { element: rowEl, key, value }
    },
  })

  rows.addRow()

  function validate() {
    let ok = true
    for (const row of rows.rows()) {
      const keyed = valueOf(row.key).length > 0
      if (keyed && valueOf(row.value).length === 0) {
        row.value.setAttribute('error', '')
        row.value.setAttribute('error-message', 'Value is required.')
        ok = false
      } else {
        row.value.removeAttribute('error')
      }
    }
    return ok
  }

  /** Rows where nothing was entered are omitted. */
  function value() {
    return rows
      .rows()
      .filter((row) => valueOf(row.key).length > 0 || valueOf(row.value).length > 0)
      .map((row) => ({ key: valueOf(row.key), value: valueOf(row.value) }))
  }

  function reset() {
    for (const row of rows.rows()) rows.removeRow(row.id)
    mount.replaceChildren()
    rows.addRow()
  }

  return { element, validate, value, reset }
}
