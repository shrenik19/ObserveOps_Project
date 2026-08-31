import { describe, it, expect, vi } from 'vitest'
import { renderDeleteConfirmDialog, consequenceParts, consequenceText } from './deleteConfirmDialog.js'

const build = (overrides = {}) =>
  renderDeleteConfirmDialog({ categoryName: 'Inventory', onConfirm: vi.fn(), onCancel: vi.fn(), ...overrides })

describe('renderDeleteConfirmDialog', () => {
  it('asks the question naming the category, with no separate heading', () => {
    const dialog = build()
    expect(dialog.querySelector('[data-role="delete-confirm-message"]').textContent).toBe(
      'Are you sure you want to delete Inventory Category?'
    )
    expect(dialog.getAttribute('title')).toBe('')
  })

  it('offers No and Yes', () => {
    const dialog = build()
    expect(dialog.getAttribute('cancel-text')).toBe('No')
    expect(dialog.getAttribute('confirm-text')).toBe('Yes')
  })

  it('marks the action destructive and uses the trash icon', () => {
    const dialog = build()
    expect(dialog.getAttribute('confirm-variant')).toBe('error')
    expect(dialog.getAttribute('icon')).toBe('trash')
  })

  it('is an open obs-modal using the confirm variant', () => {
    const dialog = build()
    expect(dialog.tagName.toLowerCase()).toBe('obs-modal')
    expect(dialog.getAttribute('variant')).toBe('confirm')
    expect(dialog.hasAttribute('open')).toBe(true)
  })

  it('calls onConfirm when the modal confirms', () => {
    const onConfirm = vi.fn()
    build({ onConfirm }).dispatchEvent(new CustomEvent('confirm'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onCancel when the modal cancels', () => {
    const onCancel = vi.fn()
    build({ onCancel }).dispatchEvent(new CustomEvent('cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('treats a dismiss (Escape, close) as a cancel', () => {
    const onCancel = vi.fn()
    build({ onCancel }).dispatchEvent(new CustomEvent('close'))
    expect(onCancel).toHaveBeenCalled()
  })

  // obs-modal emits confirm -> close -> hide when the action button is clicked, so `close` arrives
  // after a SUCCESSFUL confirm as well as after a dismissal. Reporting both would tell the host to
  // tear down the very step the confirm just opened.
  it('does not also report a cancel when close follows a confirm', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const dialog = build({ onConfirm, onCancel })

    dialog.dispatchEvent(new CustomEvent('confirm'))
    dialog.dispatchEvent(new CustomEvent('close'))
    dialog.dispatchEvent(new CustomEvent('hide'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('reports one outcome only, however many events arrive', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const dialog = build({ onConfirm, onCancel })

    dialog.dispatchEvent(new CustomEvent('cancel'))
    dialog.dispatchEvent(new CustomEvent('close'))
    dialog.dispatchEvent(new CustomEvent('confirm'))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('does not throw when handlers are omitted', () => {
    const dialog = renderDeleteConfirmDialog({ categoryName: 'Inventory' })
    expect(() => {
      dialog.dispatchEvent(new CustomEvent('confirm'))
      dialog.dispatchEvent(new CustomEvent('cancel'))
    }).not.toThrow()
  })

  it('carries the name verbatim, including quotes', () => {
    const dialog = renderDeleteConfirmDialog({ categoryName: `Ravi's "Reports"` })
    expect(dialog.querySelector('[data-role="delete-confirm-message"]').textContent).toBe(
      `Are you sure you want to delete Ravi's "Reports" Category?`
    )
  })
})


describe('the consequence is three facts, not a paragraph', () => {
  const parts = (name, n) => consequenceParts(name, n)

  it('leads with the number, on its own', () => {
    expect(parts('Inventory', 18).stake).toBe('18 reports are in this category.')
  })

  it('counts one report in the singular', () => {
    expect(parts('Inventory', 1).stake).toBe('1 report is in this category.')
  })

  it('keeps the choice to a single clause', () => {
    expect(parts('Inventory', 18).choice).toBe(
      'You can move them to another category, or delete them along with it.'
    )
  })

  it('always warns, whatever the count', () => {
    expect(parts('Inventory', 18).warning).toBe('This action cannot be undone.')
    expect(parts('Inventory', 0).warning).toBe('This action cannot be undone.')
  })

  it('offers no choice line for an empty category — there is nothing to decide', () => {
    expect(parts('Capacity Planning', 0).choice).toBe('')
  })

  it('renders each fact as its own element', () => {
    const dialog = renderDeleteConfirmDialog({ categoryName: 'Inventory', reportCount: 18 })

    expect(dialog.querySelector('[data-role="delete-confirm-stake"]')).not.toBeNull()
    expect(dialog.querySelector('[data-role="delete-confirm-choice"]')).not.toBeNull()
    expect(dialog.querySelector('[data-role="delete-confirm-warning"]')).not.toBeNull()
  })

  it('omits the choice element entirely when there is no choice', () => {
    const dialog = renderDeleteConfirmDialog({ categoryName: 'Capacity Planning', reportCount: 0 })
    expect(dialog.querySelector('[data-role="delete-confirm-choice"]')).toBeNull()
  })

  it('keeps the warning as plain text — no glyph anywhere in the block', () => {
    const dialog = renderDeleteConfirmDialog({ categoryName: 'Inventory', reportCount: 18 })
    const warning = dialog.querySelector('[data-role="delete-confirm-warning"]')

    expect(warning.querySelector('obs-icon')).toBeNull()
    expect(warning.textContent).toBe('This action cannot be undone.')
    expect(dialog.querySelector('[data-role="delete-confirm-consequence"] obs-icon')).toBeNull()
  })

  it('still offers the three facts flat, for anything that needs one string', () => {
    const text = consequenceText('Inventory', 18)
    expect(text).toContain('18 reports are in this category.')
    expect(text).toContain('This action cannot be undone.')
  })
})
