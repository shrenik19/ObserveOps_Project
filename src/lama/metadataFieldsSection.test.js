import { describe, it, expect } from 'vitest'
import { renderMetadataFieldsSection } from './metadataFieldsSection.js'

const build = () => renderMetadataFieldsSection()

const rows = (s) => [...s.element.querySelectorAll('[data-role="metadata-row"]')]
const keyOf = (row) => row.querySelector('[data-role="metadata-key"]')
const valueOf = (row) => row.querySelector('[data-role="metadata-value"]')
const addBtn = (s) => s.element.querySelector('[data-repeater="metadata"][data-role="repeater-add"]')
const removeBtns = (s) => [...s.element.querySelectorAll('[data-repeater="metadata"][data-role="repeater-remove"]')]

const type = (el, v) => {
  el.setAttribute('value', v)
  el.dispatchEvent(new CustomEvent('input', { detail: [v] }))
}
const click = (el) => el.dispatchEvent(new Event('click', { bubbles: true }))

describe('initial state', () => {
  it('is titled Metadata Fields', () => {
    expect(build().element.querySelector('[data-role="metadata-fields-title"]').textContent).toBe(
      'Metadata Fields'
    )
  })

  it('starts with one row', () => {
    expect(rows(build())).toHaveLength(1)
  })

  // The parent layer is gone — these fields stand on their own now.
  it('has no Custom Field or Metric Plugin Name anywhere', () => {
    const s = build()
    expect(s.element.querySelector('[data-role="custom-field-name"]')).toBeNull()
    expect(s.element.querySelector('[data-role="metric-plugin-name"]')).toBeNull()
    expect(s.element.querySelector('[data-role="custom-field-group"]')).toBeNull()
  })

  it('shows both fields immediately, with no reveal step', () => {
    const s = build()
    expect(keyOf(rows(s)[0])).not.toBeNull()
    expect(valueOf(rows(s)[0])).not.toBeNull()
  })

  it('starts with every field optional', () => {
    const s = build()
    expect(valueOf(rows(s)[0]).hasAttribute('required')).toBe(false)
  })

  it('reports nothing', () => {
    expect(build().value()).toEqual([])
  })
})

describe('the repeater', () => {
  it('shows add only while there is one row', () => {
    const s = build()
    expect(addBtn(s)).not.toBeNull()
    expect(removeBtns(s)).toHaveLength(0)
  })

  it('shows remove on every row and add on the last once there are two', () => {
    const s = build()
    click(addBtn(s))

    expect(rows(s)).toHaveLength(2)
    expect(removeBtns(s)).toHaveLength(2)
    expect(s.element.querySelectorAll('[data-repeater="metadata"][data-role="repeater-add"]')).toHaveLength(1)
  })

  it('returns to add-only when removed back to one', () => {
    const s = build()
    click(addBtn(s))
    click(removeBtns(s)[0])

    expect(rows(s)).toHaveLength(1)
    expect(removeBtns(s)).toHaveLength(0)
  })

  it('removes the row that was clicked', () => {
    const s = build()
    type(keyOf(rows(s)[0]), 'first')
    click(addBtn(s))
    type(keyOf(rows(s)[1]), 'second')

    click(removeBtns(s)[0])

    expect(rows(s)).toHaveLength(1)
    expect(s.value()).toEqual([{ key: 'second', value: '' }])
  })
})

describe('conditional requiredness', () => {
  it('makes Value required while its Metadata is non-empty', () => {
    const s = build()
    const row = rows(s)[0]

    type(keyOf(row), 'region')
    expect(valueOf(row).hasAttribute('required')).toBe(true)

    type(keyOf(row), '')
    expect(valueOf(row).hasAttribute('required')).toBe(false)
  })

  it('treats whitespace as empty', () => {
    const s = build()
    type(keyOf(rows(s)[0]), '   ')
    expect(valueOf(rows(s)[0]).hasAttribute('required')).toBe(false)
  })

  it('applies the rule per row, independently', () => {
    const s = build()
    click(addBtn(s))
    type(keyOf(rows(s)[1]), 'tier')

    expect(valueOf(rows(s)[0]).hasAttribute('required')).toBe(false)
    expect(valueOf(rows(s)[1]).hasAttribute('required')).toBe(true)
  })
})

describe('validate', () => {
  it('passes while untouched', () => {
    expect(build().validate()).toBe(true)
  })

  it('fails and marks Value when Metadata is filled and it is not', () => {
    const s = build()
    type(keyOf(rows(s)[0]), 'region')

    expect(s.validate()).toBe(false)
    expect(valueOf(rows(s)[0]).hasAttribute('error')).toBe(true)
    expect(keyOf(rows(s)[0]).hasAttribute('error')).toBe(false)
  })

  it('passes once the value is supplied', () => {
    const s = build()
    type(keyOf(rows(s)[0]), 'region')
    type(valueOf(rows(s)[0]), 'ap-south-1')

    expect(s.validate()).toBe(true)
    expect(valueOf(rows(s)[0]).hasAttribute('error')).toBe(false)
  })

  it('passes when only a value is given, with no key', () => {
    const s = build()
    type(valueOf(rows(s)[0]), 'orphan')
    expect(s.validate()).toBe(true)
  })

  it('checks every row, not just the first', () => {
    const s = build()
    click(addBtn(s))
    type(keyOf(rows(s)[1]), 'tier')

    expect(s.validate()).toBe(false)
    expect(valueOf(rows(s)[1]).hasAttribute('error')).toBe(true)
  })
})

describe('value', () => {
  it('reports the flat pairs in order', () => {
    const s = build()
    type(keyOf(rows(s)[0]), 'region')
    type(valueOf(rows(s)[0]), 'ap-south-1')
    click(addBtn(s))
    type(keyOf(rows(s)[1]), 'tier')
    type(valueOf(rows(s)[1]), 'gold')

    expect(s.value()).toEqual([
      { key: 'region', value: 'ap-south-1' },
      { key: 'tier', value: 'gold' },
    ])
  })

  it('omits rows where nothing was entered', () => {
    const s = build()
    type(keyOf(rows(s)[0]), 'region')
    type(valueOf(rows(s)[0]), 'ap-south-1')
    click(addBtn(s))

    expect(s.value()).toEqual([{ key: 'region', value: 'ap-south-1' }])
  })
})

describe('reset', () => {
  it('returns to a single empty row', () => {
    const s = build()
    type(keyOf(rows(s)[0]), 'region')
    click(addBtn(s))

    s.reset()

    expect(rows(s)).toHaveLength(1)
    expect(keyOf(rows(s)[0]).getAttribute('value')).toBe('')
    expect(s.value()).toEqual([])
  })
})
