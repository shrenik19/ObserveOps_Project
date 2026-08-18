import { describe, it, expect } from 'vitest'
import { renderCustomFieldsSection } from './customFieldsSection.js'

const build = () => renderCustomFieldsSection()

const groups = (s) => [...s.element.querySelectorAll('[data-role="custom-field-group"]')]
const groupAt = (s, i) => groups(s)[i]
const nameInput = (g) => g.querySelector('[data-role="custom-field-name"]')
const pluginInput = (g) => g.querySelector('[data-role="metric-plugin-name"]')
const metaBlock = (g) => g.querySelector('[data-role="metadata-block"]')
const metaRows = (g) => [...g.querySelectorAll('[data-role="metadata-row"]')]
// Both levels expose repeater-add; address them by level so the nested one is never picked up.
const addGroup = (s) => s.element.querySelector('[data-repeater="custom-field"][data-role="repeater-add"]')
const addMeta = (g) => g.querySelector('[data-repeater="metadata"][data-role="repeater-add"]')
const metaKey = (row) => row.querySelector('[data-role="metadata-key"]')
const metaValue = (row) => row.querySelector('[data-role="metadata-value"]')

/** obs-input reports through `input`, value wrapped in an array. */
const type = (el, value) => {
  el.setAttribute('value', value)
  el.dispatchEvent(new CustomEvent('input', { detail: [value] }))
}
const click = (el) => el.dispatchEvent(new Event('click', { bubbles: true }))

describe('renderCustomFieldsSection — initial state', () => {
  it('is titled Custom Fields', () => {
    const s = build()
    expect(s.element.querySelector('[data-role="custom-fields-title"]').textContent).toBe('Custom Fields')
  })

  it('starts with exactly one group', () => {
    expect(groups(build())).toHaveLength(1)
  })

  it('starts with no metadata visible', () => {
    const s = build()
    expect(metaBlock(groupAt(s, 0)).hidden).toBe(true)
  })

  it('starts with every field optional', () => {
    const s = build()
    const g = groupAt(s, 0)
    expect(nameInput(g).hasAttribute('required')).toBe(false)
    expect(pluginInput(g).hasAttribute('required')).toBe(false)
  })
})

describe('metadata reveal', () => {
  it('reveals metadata on the first character typed in Custom Field', () => {
    const s = build()
    const g = groupAt(s, 0)
    expect(metaBlock(g).hidden).toBe(true)

    type(nameInput(g), 'l')

    expect(metaBlock(g).hidden).toBe(false)
    expect(metaRows(g)).toHaveLength(1)
  })

  it('keeps metadata visible after Custom Field is cleared', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    type(nameInput(g), '')

    expect(metaBlock(g).hidden).toBe(false)
  })

  it('does not discard metadata already entered when Custom Field is cleared', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    type(metaKey(metaRows(g)[0]), 'region')
    type(nameInput(g), '')

    expect(metaKey(metaRows(g)[0]).getAttribute('value')).toBe('region')
  })

  it('reveals metadata independently per group', () => {
    const s = build()
    click(addGroup(s))
    expect(groups(s)).toHaveLength(2)

    type(nameInput(groupAt(s, 1)), 'x')

    expect(metaBlock(groupAt(s, 0)).hidden).toBe(true)
    expect(metaBlock(groupAt(s, 1)).hidden).toBe(false)
  })
})

describe('conditional requiredness', () => {
  it('makes Metric Plugin Name required while Custom Field is non-empty', () => {
    const s = build()
    const g = groupAt(s, 0)

    type(nameInput(g), 'latency')
    expect(pluginInput(g).hasAttribute('required')).toBe(true)

    type(nameInput(g), '')
    expect(pluginInput(g).hasAttribute('required')).toBe(false)
  })

  it('makes Value required while its Metadata key is non-empty', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    const row = metaRows(g)[0]

    expect(metaValue(row).hasAttribute('required')).toBe(false)
    type(metaKey(row), 'region')
    expect(metaValue(row).hasAttribute('required')).toBe(true)

    type(metaKey(row), '')
    expect(metaValue(row).hasAttribute('required')).toBe(false)
  })

  // The two rules are independent: a metadata row's own key governs its value.
  it('keeps the metadata rule in force after Custom Field is cleared', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    type(metaKey(metaRows(g)[0]), 'region')
    type(nameInput(g), '')

    expect(metaValue(metaRows(g)[0]).hasAttribute('required')).toBe(true)
  })

  it('does not make Metric Plugin Name required from metadata alone', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    type(nameInput(g), '')
    type(metaKey(metaRows(g)[0]), 'region')

    expect(pluginInput(g).hasAttribute('required')).toBe(false)
  })

  it('treats whitespace as empty', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), '   ')
    expect(pluginInput(g).hasAttribute('required')).toBe(false)
  })
})

describe('validate', () => {
  it('passes when everything is untouched', () => {
    const s = build()
    expect(s.validate()).toBe(true)
  })

  it('fails and marks Metric Plugin Name when Custom Field is filled and it is not', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')

    expect(s.validate()).toBe(false)
    expect(pluginInput(g).hasAttribute('error')).toBe(true)
    expect(nameInput(g).hasAttribute('error')).toBe(false)
  })

  it('passes once Metric Plugin Name is supplied', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    type(pluginInput(g), 'ping')

    expect(s.validate()).toBe(true)
    expect(pluginInput(g).hasAttribute('error')).toBe(false)
  })

  it('fails and marks Value when its Metadata key is filled and it is not', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    type(pluginInput(g), 'ping')
    type(metaKey(metaRows(g)[0]), 'region')

    expect(s.validate()).toBe(false)
    expect(metaValue(metaRows(g)[0]).hasAttribute('error')).toBe(true)
  })

  it('clears a mark once the field is filled and revalidated', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    s.validate()
    expect(pluginInput(g).hasAttribute('error')).toBe(true)

    type(pluginInput(g), 'ping')
    expect(s.validate()).toBe(true)
    expect(pluginInput(g).hasAttribute('error')).toBe(false)
  })

  it('validates every group, not just the first', () => {
    const s = build()
    click(addGroup(s))
    type(nameInput(groupAt(s, 1)), 'throughput')

    expect(s.validate()).toBe(false)
    expect(pluginInput(groupAt(s, 1)).hasAttribute('error')).toBe(true)
  })
})

describe('value', () => {
  it('reports nothing while the section is untouched', () => {
    expect(build().value()).toEqual([])
  })

  it('reports the nested shape', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    type(pluginInput(g), 'ping')
    type(metaKey(metaRows(g)[0]), 'region')
    type(metaValue(metaRows(g)[0]), 'ap-south-1')

    expect(s.value()).toEqual([
      { customField: 'latency', metricPluginName: 'ping', metadata: [{ key: 'region', value: 'ap-south-1' }] },
    ])
  })

  it('omits blank metadata rows', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    type(pluginInput(g), 'ping')

    expect(s.value()).toEqual([{ customField: 'latency', metricPluginName: 'ping', metadata: [] }])
  })

  it('reports multiple metadata rows in order', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    click(addMeta(g))

    const rows = metaRows(g)
    expect(rows).toHaveLength(2)
    type(metaKey(rows[0]), 'a')
    type(metaValue(rows[0]), '1')
    type(metaKey(rows[1]), 'b')
    type(metaValue(rows[1]), '2')

    expect(s.value()[0].metadata).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ])
  })
})

describe('reset', () => {
  it('returns to a single empty group with metadata hidden', () => {
    const s = build()
    const g = groupAt(s, 0)
    type(nameInput(g), 'latency')
    click(addGroup(s))
    expect(groups(s)).toHaveLength(2)

    s.reset()

    expect(groups(s)).toHaveLength(1)
    expect(nameInput(groupAt(s, 0)).getAttribute('value')).toBe('')
    expect(metaBlock(groupAt(s, 0)).hidden).toBe(true)
    expect(s.value()).toEqual([])
  })
})
