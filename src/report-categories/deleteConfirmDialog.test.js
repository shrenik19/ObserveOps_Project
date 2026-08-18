import { describe, it, expect, vi } from 'vitest'
import { renderDeleteConfirmDialog } from './deleteConfirmDialog.js'

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
