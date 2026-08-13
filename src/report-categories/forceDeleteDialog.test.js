import { describe, it, expect, vi } from 'vitest'
import { renderForceDeleteDialog } from './forceDeleteDialog.js'

const build = (overrides = {}) =>
  renderForceDeleteDialog({ categoryName: 'Inventory', onCancel: vi.fn(), onConfirm: vi.fn(), ...overrides })

const input = (el) => el.querySelector('[data-role="force-delete-input"]')
const confirmBtn = (el) => el.querySelector('[data-role="force-delete-confirm"]')
const type = (el, value) => input(el).dispatchEvent(new CustomEvent('input', { detail: [value] }))

describe('renderForceDeleteDialog', () => {
  it('states the consequence', () => {
    const dialog = build()
    expect(dialog.querySelector('[data-role="force-delete-warning"]').textContent).toBe(
      'All reports associated within this category will be permanently deleted. This action cannot be undone.'
    )
  })

  it('instructs the user to type the exact category name', () => {
    const dialog = build()
    expect(dialog.querySelector('[data-role="force-delete-instruction"]').textContent).toBe(
      'To confirm, type the category name Inventory (case-sensitive) below.'
    )
  })

  it('placeholders the input with the category name', () => {
    expect(input(build()).getAttribute('placeholder')).toBe('Inventory')
  })

  it('starts with the confirm button disabled', () => {
    expect(confirmBtn(build()).hasAttribute('disabled')).toBe(true)
  })

  it('keeps the button disabled for a near miss', () => {
    const dialog = build()
    type(dialog, 'Invent')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('keeps the button disabled when only the case differs', () => {
    const dialog = build()
    type(dialog, 'inventory')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('keeps the button disabled when the text is padded with spaces', () => {
    const dialog = build()
    type(dialog, ' Inventory ')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('enables the button on an exact match', () => {
    const dialog = build()
    type(dialog, 'Inventory')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(false)
  })

  it('re-disables the button if the text stops matching', () => {
    const dialog = build()
    type(dialog, 'Inventory')
    type(dialog, 'Inventor')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('reports a confirmation only once the name matches', () => {
    const onConfirm = vi.fn()
    const dialog = build({ onConfirm })

    confirmBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    expect(onConfirm).not.toHaveBeenCalled()

    type(dialog, 'Inventory')
    confirmBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('routes Cancel and dismissal to onCancel', () => {
    const onCancel = vi.fn()
    const dialog = build({ onCancel })

    dialog.querySelector('[data-role="force-delete-cancel"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    dialog.dispatchEvent(new CustomEvent('close'))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('is an open obs-modal that does not close on its backdrop', () => {
    const dialog = build()
    expect(dialog.tagName.toLowerCase()).toBe('obs-modal')
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(dialog.getAttribute('mask-closable')).toBe('false')
  })

  it('does not throw when handlers are omitted', () => {
    const dialog = renderForceDeleteDialog({ categoryName: 'X' })
    expect(() => {
      type(dialog, 'X')
      confirmBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    }).not.toThrow()
  })
})
