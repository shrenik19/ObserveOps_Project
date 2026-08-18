// The Custom Fields section of the LAMA profile drawer.
//
// Group-based: each Custom Field + Metric Plugin Name is a parent, holding its own repeating list
// of Metadata + Value children. Both levels use the same fieldRepeater, so the (+)/(x) rule is
// defined once.
//
// Two behaviours carry all the weight here:
//
//   REVEAL       Metadata is absent until its group's Custom Field holds a character. Once shown it
//                STAYS shown even if the field is cleared — nothing typed is ever hidden away.
//
//   REQUIREDNESS Everything starts optional. Live, as the user types:
//                  Custom Field non-empty -> Metric Plugin Name required
//                  Metadata key non-empty -> Value required
//                The two rules are INDEPENDENT: a metadata row's own key governs its value, so
//                clearing Custom Field does not switch the metadata rule off.
//
// Nothing here re-renders the section wholesale. Metadata appears while the user is mid-keystroke,
// and a full re-render would take the focus and cursor with it.

import { createFieldRepeater } from './fieldRepeater.js'

/** DS events wrap their value in an array — unwrap, tolerating a bare value. */
function detailValue(event) {
  const { detail } = event
  if (Array.isArray(detail)) return detail[0]
  if (detail !== undefined && detail !== null) return detail
  return event.target?.value
}

/** The live value of an obs-input. The attribute is the source of truth we set on every input. */
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

/** Flip a field between optional and required, live. */
function setRequired(input, required) {
  if (required) input.setAttribute('required', '')
  else input.removeAttribute('required')
}

export function renderCustomFieldsSection() {
  const element = document.createElement('section')
  element.className = 'custom-fields'
  element.setAttribute('data-role', 'custom-fields-section')

  const title = document.createElement('h3')
  title.setAttribute('data-role', 'custom-fields-title')
  title.className = 'custom-fields__title'
  title.textContent = 'Custom Fields'
  element.appendChild(title)

  const groupMount = document.createElement('div')
  groupMount.className = 'custom-fields__groups'
  element.appendChild(groupMount)

  /** Builds one Custom Field group, including its nested metadata repeater. */
  function renderGroup() {
    const groupEl = document.createElement('div')
    groupEl.setAttribute('data-role', 'custom-field-group')
    groupEl.className = 'custom-fields__group'

    const parentRow = document.createElement('div')
    parentRow.className = 'custom-fields__pair'
    groupEl.appendChild(parentRow)

    const name = field({ role: 'custom-field-name', label: 'Custom Field', placeholder: 'Write custom field' })
    const plugin = field({ role: 'metric-plugin-name', label: 'Metric Plugin Name', placeholder: 'Write metric plugin name' })
    parentRow.append(name, plugin)

    // --- Metadata, hidden until the parent field is typed into ---------
    const metaBlock = document.createElement('div')
    metaBlock.setAttribute('data-role', 'metadata-block')
    metaBlock.className = 'custom-fields__metadata'
    metaBlock.hidden = true
    groupEl.appendChild(metaBlock)

    const metaTitle = document.createElement('h4')
    metaTitle.className = 'custom-fields__subtitle'
    metaTitle.textContent = 'Metadata'
    metaBlock.appendChild(metaTitle)

    const metaMount = document.createElement('div')
    metaMount.className = 'custom-fields__metadata-rows'
    metaBlock.appendChild(metaMount)

    const metadata = createFieldRepeater({
      mount: metaMount,
      name: 'metadata',
      addLabel: 'Add metadata',
      removeLabel: 'Remove metadata',
      renderRow: () => {
        const rowEl = document.createElement('div')
        rowEl.setAttribute('data-role', 'metadata-row')
        rowEl.className = 'custom-fields__pair'

        const key = field({ role: 'metadata-key', label: 'Metadata', placeholder: 'Write metadata' })
        const value = field({ role: 'metadata-value', label: 'Value', placeholder: 'Write value' })
        rowEl.append(key, value)

        // A metadata row's own key governs its value — independent of the parent field.
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

    let revealed = false
    onType(name, (next) => {
      setRequired(plugin, next.trim().length > 0)
      if (next.trim().length === 0) plugin.removeAttribute('error')

      // Reveal once, on the first character — and never take it back.
      if (!revealed && next.trim().length > 0) {
        revealed = true
        metaBlock.hidden = false
        metadata.addRow()
      }
    })
    onType(plugin, (next) => {
      if (next.trim().length > 0) plugin.removeAttribute('error')
    })

    return { element: groupEl, name, plugin, metadata }
  }

  const groups = createFieldRepeater({
    mount: groupMount,
    name: 'custom-field',
    renderRow: renderGroup,
    addLabel: 'Add custom field',
    removeLabel: 'Remove custom field',
  })

  groups.addRow()

  /** Marks every field that its own rule requires but that is empty. */
  function validate() {
    let ok = true

    for (const group of groups.rows()) {
      const named = valueOf(group.name).length > 0
      if (named && valueOf(group.plugin).length === 0) {
        group.plugin.setAttribute('error', '')
        group.plugin.setAttribute('error-message', 'Metric Plugin Name is required.')
        ok = false
      } else {
        group.plugin.removeAttribute('error')
      }

      for (const row of group.metadata.rows()) {
        const keyed = valueOf(row.key).length > 0
        if (keyed && valueOf(row.value).length === 0) {
          row.value.setAttribute('error', '')
          row.value.setAttribute('error-message', 'Value is required.')
          ok = false
        } else {
          row.value.removeAttribute('error')
        }
      }
    }

    return ok
  }

  /** The nested shape. Groups with no Custom Field, and blank metadata rows, are omitted. */
  function value() {
    return groups
      .rows()
      .filter((group) => valueOf(group.name).length > 0)
      .map((group) => ({
        customField: valueOf(group.name),
        metricPluginName: valueOf(group.plugin),
        metadata: group.metadata
          .rows()
          .filter((row) => valueOf(row.key).length > 0 || valueOf(row.value).length > 0)
          .map((row) => ({ key: valueOf(row.key), value: valueOf(row.value) })),
      }))
  }

  function reset() {
    for (const group of groups.rows()) groups.removeRow(group.id)
    groupMount.replaceChildren()
    groups.addRow()
  }

  return { element, validate, value, reset }
}
