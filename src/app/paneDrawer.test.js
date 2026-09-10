import { describe, it, expect, vi } from 'vitest'
import { renderPaneDrawer } from './paneDrawer.js'

const panes = () => ({
  nav: Object.assign(document.createElement('div'), { className: 'x-nav' }),
  form: Object.assign(document.createElement('div'), { className: 'x-form' }),
  help: Object.assign(document.createElement('div'), { className: 'x-help' }),
})

describe('the large multi-pane drawer', () => {
  it('is an obs-drawer, opened, at the large width tier', () => {
    const d = renderPaneDrawer({ title: 'Create Thing', ...panes() })
    expect(d.tagName.toLowerCase()).toBe('obs-drawer')
    expect(d.hasAttribute('open')).toBe(true)
    expect(d.getAttribute('title')).toBe('Create Thing')
    // 85–96% is the DS's large / full-screen tier; the APM registration reference is 96%.
    expect(d.getAttribute('width')).toBe('96%')
  })

  // Without this the drawer wraps the body in ONE scroll region and the columns cannot scroll
  // independently — the whole point of the multi-pane tier.
  it('turns off the single scroll region so the columns scroll independently', () => {
    expect(renderPaneDrawer({ title: 't', ...panes() }).getAttribute('scrolled-content')).toBe('false')
  })

  it('lays the body out as three columns in the given order', () => {
    const p = panes()
    const d = renderPaneDrawer({ title: 't', ...p })
    const cols = d.querySelectorAll('.pane-drawer__col')
    expect(cols).toHaveLength(3)
    expect(cols[0].querySelector('.x-nav')).not.toBeNull()
    expect(cols[1].querySelector('.x-form')).not.toBeNull()
    expect(cols[2].querySelector('.x-help')).not.toBeNull()
  })

  it('names the columns so the 2:6:4 ratio is styleable', () => {
    const d = renderPaneDrawer({ title: 't', ...panes() })
    expect(d.querySelector('.pane-drawer__nav')).not.toBeNull()
    expect(d.querySelector('.pane-drawer__form')).not.toBeNull()
    expect(d.querySelector('.pane-drawer__help')).not.toBeNull()
  })

  it('closes on the drawer\'s own close event', () => {
    const onClose = vi.fn()
    const d = renderPaneDrawer({ title: 't', ...panes(), onClose })
    document.body.append(d)
    d.dispatchEvent(new CustomEvent('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
    d.remove()
  })

  // obs-drawer fires `close` when it is REMOVED from the DOM as well, which nothing documents
  // (G51). Acting on that tears down whatever replaced the drawer: Save and Run swaps the progress
  // panel into the view, the drawer's removal fires close, and a naive handler empties it again.
  // Verified in real Chrome: a user close fires while still connected, a teardown after detaching.
  it('ignores the close obs-drawer fires when it is torn down', () => {
    const onClose = vi.fn()
    const d = renderPaneDrawer({ title: 't', ...panes(), onClose })
    document.body.append(d)
    d.remove()
    d.dispatchEvent(new CustomEvent('close'))
    expect(onClose).not.toHaveBeenCalled()
  })

  // The footer is the consumer's, not a built-in preset: these forms carry Reset + a create action,
  // and one of them also carries Save and Exit / Save and Run.
  it('puts consumer actions in the drawer\'s actions slot', () => {
    const actions = document.createElement('div')
    actions.className = 'x-actions'
    const d = renderPaneDrawer({ title: 't', ...panes(), actions })
    const slotted = d.querySelector('.x-actions')
    expect(slotted).not.toBeNull()
    expect(slotted.getAttribute('slot')).toBe('actions')
  })

  it('omits the actions slot when the consumer gives none', () => {
    const d = renderPaneDrawer({ title: 't', ...panes() })
    expect(d.querySelector('[slot="actions"]')).toBeNull()
  })
})

describe('the drawer nav rail', () => {
  it('marks exactly the selected item, and reports clicks by key', async () => {
    const { renderNavRail } = await import('./paneDrawer.js')
    const onSelect = vi.fn()
    const rail = renderNavRail({
      items: [{ key: 'a', label: 'Availability' }, { key: 'p', label: 'Performance' }],
      selected: 'p',
      onSelect,
    })
    const items = rail.querySelectorAll('.pane-drawer__nav-item')
    expect([...items].map((i) => i.textContent.trim())).toEqual(['Availability', 'Performance'])
    expect(items[0].classList.contains('is-selected')).toBe(false)
    expect(items[1].classList.contains('is-selected')).toBe(true)
    expect(items[1].getAttribute('aria-current')).toBe('true')
    items[0].click()
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('renders a disabled item as present but not selectable', async () => {
    const { renderNavRail } = await import('./paneDrawer.js')
    const onSelect = vi.fn()
    const rail = renderNavRail({
      items: [{ key: 'a', label: 'Server', disabled: true }, { key: 'w', label: 'WAN Link' }],
      selected: 'w',
      onSelect,
    })
    const first = rail.querySelector('.pane-drawer__nav-item')
    expect(first.hasAttribute('disabled')).toBe(true)
    first.click()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
