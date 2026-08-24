import { describe, it, expect, vi, beforeEach } from 'vitest'
import { augmentSelectDescription, selectedOption } from './augmentSelectDescription.js'

/** A stand-in for an OPEN two-pane obs-select, shaped like the DS's shadow root. */
function fakeSelect({ options = ['benchmark', 'peakOrder'], selected = 'benchmark' } = {}) {
  const el = document.createElement('div')
  const root = el.attachShadow({ mode: 'open' })

  const trigger = document.createElement('button')
  trigger.className = 'trig'
  root.appendChild(trigger)

  const opts = document.createElement('div')
  opts.className = 'opts'
  for (const value of options) {
    const opt = document.createElement('button')
    opt.setAttribute('role', 'option')
    opt.setAttribute('aria-selected', String(value === selected))
    opt.dataset.value = value
    opt.textContent = value
    // jsdom has no layout, so scrollIntoView is absent unless supplied.
    opt.scrollIntoView = vi.fn()
    opts.appendChild(opt)
  }
  root.appendChild(opts)
  return el
}

const openMenu = (el) =>
  el.shadowRoot.querySelector('.trig').dispatchEvent(new Event('click', { bubbles: true }))

/** requestAnimationFrame is what the augmentation waits on before reading the menu. */
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (fn) => fn())
})

describe('selectedOption', () => {
  it('finds the option the component has marked current', () => {
    const el = fakeSelect({ selected: 'peakOrder' })
    expect(selectedOption(el.shadowRoot).dataset.value).toBe('peakOrder')
  })

  it('returns null when nothing is selected', () => {
    const el = fakeSelect({ selected: null })
    expect(selectedOption(el.shadowRoot)).toBeNull()
  })

  it('tolerates a missing root', () => {
    expect(selectedOption(null)).toBeNull()
  })
})

describe('augmentSelectDescription', () => {
  it('hovers the selected option when the menu opens, so its description shows', () => {
    const el = fakeSelect({ selected: 'peakOrder' })
    const chosen = el.shadowRoot.querySelector('[data-value="peakOrder"]')
    const seen = vi.fn()
    chosen.addEventListener('mouseenter', seen)

    augmentSelectDescription({ select: el })
    openMenu(el)

    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('brings that option into view, since the catalogue is long', () => {
    const el = fakeSelect({ selected: 'peakOrder' })
    const chosen = el.shadowRoot.querySelector('[data-value="peakOrder"]')

    augmentSelectDescription({ select: el })
    openMenu(el)

    expect(chosen.scrollIntoView).toHaveBeenCalled()
  })

  it('leaves an unselected option alone', () => {
    const el = fakeSelect({ selected: 'benchmark' })
    const other = el.shadowRoot.querySelector('[data-value="peakOrder"]')
    const seen = vi.fn()
    other.addEventListener('mouseenter', seen)

    augmentSelectDescription({ select: el })
    openMenu(el)

    expect(seen).not.toHaveBeenCalled()
  })

  it('does nothing when the row holds no counter yet', () => {
    const el = fakeSelect({ selected: null })
    augmentSelectDescription({ select: el })
    expect(() => openMenu(el)).not.toThrow()
  })

  it('ignores clicks that did not open the menu', () => {
    const el = fakeSelect({ selected: 'benchmark' })
    const chosen = el.shadowRoot.querySelector('[data-value="benchmark"]')
    const seen = vi.fn()
    chosen.addEventListener('mouseenter', seen)

    augmentSelectDescription({ select: el })
    el.shadowRoot.querySelector('.opts').dispatchEvent(new Event('click', { bubbles: true }))

    expect(seen).not.toHaveBeenCalled()
  })

  it('does not throw without a select or a shadow root', () => {
    expect(() => augmentSelectDescription({})).not.toThrow()
    expect(() => augmentSelectDescription({ select: document.createElement('div') })).not.toThrow()
  })
})
