import { describe, it, expect, vi } from 'vitest'
import { createFieldRepeater } from './fieldRepeater.js'

/** A minimal row: one input, so tests can tell rows apart by value. */
const renderRow = ({ id }) => {
  const element = document.createElement('div')
  element.dataset.rowId = id
  const input = document.createElement('obs-input')
  input.setAttribute('data-role', 'row-input')
  element.appendChild(input)
  return { element, input }
}

function build({ addLabel = 'Add' } = {}) {
  const mount = document.createElement('div')
  const repeater = createFieldRepeater({ mount, renderRow, addLabel })
  return { mount, repeater }
}

const addBtns = (mount) => [...mount.querySelectorAll('[data-role="repeater-add"]')]
const removeBtns = (mount) => [...mount.querySelectorAll('[data-role="repeater-remove"]')]
const rowEls = (mount) => [...mount.querySelectorAll('[data-role="repeater-row"]')]
const click = (el) => el.dispatchEvent(new Event('click', { bubbles: true }))

describe('createFieldRepeater', () => {
  it('starts empty until a row is added', () => {
    const { mount, repeater } = build()
    expect(repeater.count()).toBe(0)
    expect(rowEls(mount)).toHaveLength(0)
  })

  it('adds a row and returns that row api', () => {
    const { mount, repeater } = build()
    const row = repeater.addRow()
    expect(repeater.count()).toBe(1)
    expect(rowEls(mount)).toHaveLength(1)
    expect(row.input).toBeDefined()
    expect(row.id).toBeDefined()
  })

  // The affordance rule: a lone row has nothing to remove back to.
  it('shows only an add control while there is exactly one row', () => {
    const { mount, repeater } = build()
    repeater.addRow()
    expect(addBtns(mount)).toHaveLength(1)
    expect(removeBtns(mount)).toHaveLength(0)
  })

  it('shows a remove on every row and an add on the last once there are two', () => {
    const { mount, repeater } = build()
    repeater.addRow()
    repeater.addRow()

    expect(removeBtns(mount)).toHaveLength(2)
    expect(addBtns(mount)).toHaveLength(1)

    const rows = rowEls(mount)
    expect(rows[1].querySelector('[data-role="repeater-add"]')).not.toBeNull()
    expect(rows[0].querySelector('[data-role="repeater-add"]')).toBeNull()
  })

  it('keeps the add on the last row as more are added', () => {
    const { mount, repeater } = build()
    repeater.addRow()
    repeater.addRow()
    repeater.addRow()

    const rows = rowEls(mount)
    expect(removeBtns(mount)).toHaveLength(3)
    expect(rows.at(-1).querySelector('[data-role="repeater-add"]')).not.toBeNull()
    expect(rows[1].querySelector('[data-role="repeater-add"]')).toBeNull()
  })

  it('returns to add-only when removals bring it back to one row', () => {
    const { mount, repeater } = build()
    const first = repeater.addRow()
    repeater.addRow()
    expect(removeBtns(mount)).toHaveLength(2)

    repeater.removeRow(first.id)

    expect(repeater.count()).toBe(1)
    expect(removeBtns(mount)).toHaveLength(0)
    expect(addBtns(mount)).toHaveLength(1)
  })

  it('adds a row when the add control is clicked', () => {
    const { mount, repeater } = build()
    repeater.addRow()
    click(addBtns(mount)[0])
    expect(repeater.count()).toBe(2)
  })

  it('removes that row when its remove control is clicked', () => {
    const { mount, repeater } = build()
    const first = repeater.addRow()
    repeater.addRow()

    click(rowEls(mount)[0].querySelector('[data-role="repeater-remove"]'))

    expect(repeater.count()).toBe(1)
    expect(repeater.rows()[0].id).not.toBe(first.id)
  })

  it('preserves order when a middle row is removed', () => {
    const { mount, repeater } = build()
    const a = repeater.addRow()
    const b = repeater.addRow()
    const c = repeater.addRow()

    repeater.removeRow(b.id)

    expect(repeater.rows().map((r) => r.id)).toEqual([a.id, c.id])
    expect(rowEls(mount).map((el) => el.dataset.rowId)).toEqual([a.id, c.id])
  })

  it('gives every row a distinct id', () => {
    const { repeater } = build()
    const ids = [repeater.addRow().id, repeater.addRow().id, repeater.addRow().id]
    expect(new Set(ids).size).toBe(3)
  })

  it('reports an added row through onChange', () => {
    const mount = document.createElement('div')
    const onChange = vi.fn()
    const repeater = createFieldRepeater({ mount, renderRow, onChange })

    const row = repeater.addRow()
    expect(onChange).toHaveBeenCalledTimes(1)

    repeater.removeRow(row.id)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('ignores a remove for an unknown id', () => {
    const { repeater } = build()
    repeater.addRow()
    expect(() => repeater.removeRow('nope')).not.toThrow()
    expect(repeater.count()).toBe(1)
  })

})

describe('createFieldRepeater — accessible naming', () => {
  it('names the add and remove controls', () => {
    const mount = document.createElement('div')
    const repeater = createFieldRepeater({
      mount,
      renderRow,
      addLabel: 'Add custom field',
      removeLabel: 'Remove custom field',
    })
    repeater.addRow()
    repeater.addRow()

    expect(mount.querySelector('[data-role="repeater-add"]').getAttribute('aria-label')).toBe('Add custom field')
    expect(mount.querySelector('[data-role="repeater-remove"]').getAttribute('aria-label')).toBe('Remove custom field')
  })
})
