import { describe, it, expect, vi } from 'vitest'
import { augmentAddableSelect, withAddedOption } from './augmentAddableSelect.js'

/** A stand-in for obs-select: a real element with a real shadow root shaped like the DS's. */
function fakeSelect({ options = ['/a', '/b'], withAddButton = true } = {}) {
  const el = document.createElement('div')
  el.options = options.map((value) => ({ value, text: value }))
  el.value = ''
  const root = el.attachShadow({ mode: 'open' })
  const input = document.createElement('input')
  root.appendChild(input)
  if (withAddButton) {
    const add = document.createElement('button')
    add.className = 'addbtn'
    root.appendChild(add)
  }
  return el
}

const search = (el, value) => el.dispatchEvent(new CustomEvent('search', { detail: [value] }))
const clickAdd = (el) => el.shadowRoot.querySelector('.addbtn').dispatchEvent(new Event('click', { bubbles: true }))
const optionValues = (el) => el.options.map((o) => o.value)

describe('withAddedOption', () => {
  it('appends the value in the DS option shape', () => {
    expect(withAddedOption([{ value: '/a', text: '/a' }], '/c')).toEqual([
      { value: '/a', text: '/a' },
      { value: '/c', text: '/c' },
    ])
  })

  it('does not duplicate an existing value', () => {
    const existing = [{ value: '/a', text: '/a' }]
    expect(withAddedOption(existing, '/a')).toEqual(existing)
  })

  it('tolerates a bare string option list', () => {
    expect(withAddedOption(['/a'], '/c')).toEqual([
      { value: '/a', text: '/a' },
      { value: '/c', text: '/c' },
    ])
  })
})

describe('augmentAddableSelect', () => {
  it('adds the typed value when the DS add button is clicked', () => {
    const el = fakeSelect()
    augmentAddableSelect({ select: el })

    search(el, '/metrics/custom')
    clickAdd(el)

    expect(optionValues(el)).toEqual(['/a', '/b', '/metrics/custom'])
  })

  it('selects the value it just added', () => {
    const el = fakeSelect()
    augmentAddableSelect({ select: el })

    search(el, '/metrics/custom')
    clickAdd(el)

    expect(el.value).toBe('/metrics/custom')
  })

  it('reports the addition through change, as the DS would have', () => {
    const el = fakeSelect()
    const onChange = vi.fn()
    el.addEventListener('change', (e) => onChange(e.detail))
    augmentAddableSelect({ select: el })

    search(el, '/metrics/custom')
    clickAdd(el)

    expect(onChange).toHaveBeenCalledWith(['/metrics/custom'])
  })

  it('calls onAdd with the new value', () => {
    const el = fakeSelect()
    const onAdd = vi.fn()
    augmentAddableSelect({ select: el, onAdd })

    search(el, '/metrics/custom')
    clickAdd(el)

    expect(onAdd).toHaveBeenCalledWith('/metrics/custom')
  })

  it('ignores an empty or whitespace-only query', () => {
    const el = fakeSelect()
    augmentAddableSelect({ select: el })

    clickAdd(el)
    expect(optionValues(el)).toEqual(['/a', '/b'])

    search(el, '   ')
    clickAdd(el)
    expect(optionValues(el)).toEqual(['/a', '/b'])
  })

  it('trims the typed value', () => {
    const el = fakeSelect()
    augmentAddableSelect({ select: el })

    search(el, '  /metrics/custom  ')
    clickAdd(el)

    expect(optionValues(el)).toEqual(['/a', '/b', '/metrics/custom'])
  })

  it('does not add the same value twice', () => {
    const el = fakeSelect()
    augmentAddableSelect({ select: el })

    search(el, '/metrics/custom')
    clickAdd(el)
    clickAdd(el)

    expect(optionValues(el)).toEqual(['/a', '/b', '/metrics/custom'])
  })

  it('selects an existing option rather than duplicating it', () => {
    const el = fakeSelect()
    augmentAddableSelect({ select: el })

    search(el, '/a')
    clickAdd(el)

    expect(optionValues(el)).toEqual(['/a', '/b'])
    expect(el.value).toBe('/a')
  })

  it('adds on Enter in the search box too', () => {
    const el = fakeSelect()
    augmentAddableSelect({ select: el })

    search(el, '/metrics/custom')
    el.shadowRoot.querySelector('input').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )

    expect(optionValues(el)).toEqual(['/a', '/b', '/metrics/custom'])
  })

  it('clears the pending query after adding, so a second click adds nothing', () => {
    const el = fakeSelect()
    augmentAddableSelect({ select: el })

    search(el, '/one')
    clickAdd(el)
    clickAdd(el)

    expect(optionValues(el)).toEqual(['/a', '/b', '/one'])
  })

  it('does not throw when the component renders no add button', () => {
    const el = fakeSelect({ withAddButton: false })
    expect(() => augmentAddableSelect({ select: el })).not.toThrow()
  })

  it('does not throw without a shadow root', () => {
    const bare = document.createElement('div')
    expect(() => augmentAddableSelect({ select: bare })).not.toThrow()
  })

  it('binds an add button that appears after the dropdown opens', () => {
    const el = fakeSelect({ withAddButton: false })
    augmentAddableSelect({ select: el })

    const add = document.createElement('button')
    add.className = 'addbtn'
    el.shadowRoot.appendChild(add)

    search(el, '/late')
    add.dispatchEvent(new Event('click', { bubbles: true }))

    expect(optionValues(el)).toEqual(['/a', '/b', '/late'])
  })
})
