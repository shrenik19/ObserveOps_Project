import { describe, it, expect, vi } from 'vitest'
import { renderDeleteConfirmDialog } from './deleteConfirmDialog.js'

const build = (overrides = {}) =>
  renderDeleteConfirmDialog({ categoryName: 'Inventory', onConfirm: vi.fn(), onCancel: vi.fn(), ...overrides })

describe('renderDeleteConfirmDialog', () => {
  // The name lives in `title`, which the confirm variant renders inside its shadow root — so it is
  // not in the host's light-DOM textContent.
  it('names the category in the title and states the consequence in the body', () => {
    const dialog = build()
    expect(dialog.getAttribute('title')).toContain('Inventory')
    expect(dialog.textContent).toContain("can't be undone")
  })

  // obs-modal variant="confirm" renders its own Cancel/action footer inside the shadow root and
  // reports back via `confirm` / `cancel` events — there are no light-DOM buttons to click.
  it('calls onConfirm when the modal confirms', () => {
    const onConfirm = vi.fn()
    const dialog = build({ onConfirm })
    dialog.dispatchEvent(new CustomEvent('confirm'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onCancel when the modal cancels', () => {
    const onCancel = vi.fn()
    const dialog = build({ onCancel })
    dialog.dispatchEvent(new CustomEvent('cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('treats a dismiss (Escape, close) as a cancel', () => {
    const onCancel = vi.fn()
    const dialog = build({ onCancel })
    dialog.dispatchEvent(new CustomEvent('close'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not throw when handlers are omitted', () => {
    const dialog = renderDeleteConfirmDialog({ categoryName: 'Inventory' })
    expect(() => {
      dialog.dispatchEvent(new CustomEvent('confirm'))
      dialog.dispatchEvent(new CustomEvent('cancel'))
    }).not.toThrow()
  })

  // --- DS contract, per docs/superpowers/plans/2026-08-06-ds-component-reference.md ---

  it('is an open obs-modal using the confirm variant', () => {
    const dialog = build()
    expect(dialog.tagName.toLowerCase()).toBe('obs-modal')
    expect(dialog.getAttribute('variant')).toBe('confirm')
    expect(dialog.hasAttribute('open')).toBe(true)
  })

  it('names the verb on the action rather than saying Yes or OK', () => {
    const dialog = build()
    expect(dialog.getAttribute('confirm-text')).toBe('Delete')
    expect(dialog.getAttribute('cancel-text')).toBe('Cancel')
  })

  it('marks the action destructive with the error variant', () => {
    expect(build().getAttribute('confirm-variant')).toBe('error')
  })

  it('titles the dialog with the category being deleted', () => {
    expect(build().getAttribute('title')).toBe("Delete 'Inventory'?")
  })

  // The confirm variant renders `title` itself as of elements@0.1.146; repeating it in the content
  // showed the heading twice.
  it('does not repeat the title in the content', () => {
    const dialog = build()
    expect(dialog.querySelector('[data-role="delete-confirm-title"]')).toBeNull()
    expect(dialog.querySelector('[data-role="delete-confirm-message"]').textContent).toBe("This can't be undone.")
  })

  it('carries the name verbatim, including quotes', () => {
    const dialog = renderDeleteConfirmDialog({ categoryName: `Ravi's "Reports"` })
    expect(dialog.getAttribute('title')).toBe(`Delete 'Ravi's "Reports"'?`)
  })
})
