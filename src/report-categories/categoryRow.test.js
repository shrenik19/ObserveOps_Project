import { describe, it, expect, vi } from 'vitest'
import { renderCategoryRow } from './categoryRow.js'

const builtinPublic = { id: 'network', name: 'Network', type: 'builtin', visibility: 'public', sharedWith: [] }
const customPrivate = { id: 'inventory', name: 'Inventory', type: 'custom', visibility: 'private', sharedWith: [] }

describe('renderCategoryRow', () => {
  it('renders the category name', () => {
    const row = renderCategoryRow(builtinPublic, {})
    expect(row.textContent).toContain('Network')
  })

  it('shows an open-lock indicator for public categories', () => {
    const row = renderCategoryRow(builtinPublic, {})
    const lock = row.querySelector('[data-role="visibility-lock"]')
    expect(lock.getAttribute('data-visibility')).toBe('public')
  })

  it('shows a closed-lock indicator for private categories', () => {
    const row = renderCategoryRow(customPrivate, {})
    const lock = row.querySelector('[data-role="visibility-lock"]')
    expect(lock.getAttribute('data-visibility')).toBe('private')
  })

  it('always renders a hidden-until-hover edit control for every category', () => {
    const builtinRow = renderCategoryRow(builtinPublic, {})
    const customRow = renderCategoryRow(customPrivate, {})
    expect(builtinRow.querySelector('[data-role="edit-category"]')).not.toBeNull()
    expect(customRow.querySelector('[data-role="edit-category"]')).not.toBeNull()
  })

  it('only renders a delete control for custom categories', () => {
    const builtinRow = renderCategoryRow(builtinPublic, {})
    const customRow = renderCategoryRow(customPrivate, {})
    expect(builtinRow.querySelector('[data-role="delete-category"]')).toBeNull()
    expect(customRow.querySelector('[data-role="delete-category"]')).not.toBeNull()
  })

  it('calls onEdit with the category id when the edit control is activated', () => {
    const onEdit = vi.fn()
    const row = renderCategoryRow(customPrivate, { onEdit, onDelete: vi.fn() })
    row.querySelector('[data-role="edit-category"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onEdit).toHaveBeenCalledWith('inventory')
  })

  it('calls onDelete with the category id when the delete control is activated', () => {
    const onDelete = vi.fn()
    const row = renderCategoryRow(customPrivate, { onEdit: vi.fn(), onDelete })
    row.querySelector('[data-role="delete-category"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onDelete).toHaveBeenCalledWith('inventory')
  })

  // --- DS contract, per docs/superpowers/plans/2026-08-06-ds-component-reference.md ---

  it('uses the resolved DS glyphs: globe for public, lockAlt for private', () => {
    const publicIcon = renderCategoryRow(builtinPublic, {}).querySelector('[data-role="visibility-lock"] obs-icon')
    const privateIcon = renderCategoryRow(customPrivate, {}).querySelector('[data-role="visibility-lock"] obs-icon')
    expect(publicIcon.getAttribute('name')).toBe('globe')
    expect(privateIcon.getAttribute('name')).toBe('lockAlt')
  })

  it('builds the hover actions from obs-button, not bare icons', () => {
    const row = renderCategoryRow(customPrivate, {})
    expect(row.querySelector('[data-role="edit-category"]').tagName.toLowerCase()).toBe('obs-button')
    expect(row.querySelector('[data-role="delete-category"]').tagName.toLowerCase()).toBe('obs-button')
  })

  it('gives every icon-only control an accessible name', () => {
    const row = renderCategoryRow(customPrivate, {})
    expect(row.querySelector('[data-role="visibility-lock"]').getAttribute('aria-label')).toBe('Private category')
    expect(row.querySelector('[data-role="edit-category"]').getAttribute('aria-label')).toBe('Edit Inventory')
    expect(row.querySelector('[data-role="delete-category"]').getAttribute('aria-label')).toBe('Delete Inventory')
  })

  // The row's delete is a QUIET hover action, so it uses the transparent variant with a red-tinted
  // glyph. variant="error" paints a solid red fill (verified by rendering) — that belongs on the
  // confirmation dialog's Delete button, not on a nav row.
  it('keeps the row delete quiet rather than a solid red block', () => {
    const row = renderCategoryRow(customPrivate, {})
    expect(row.querySelector('[data-role="delete-category"]').getAttribute('variant')).toBe('transparent')
  })

  it('exposes the category id on the row for event delegation', () => {
    const row = renderCategoryRow(customPrivate, {})
    expect(row.dataset.categoryId).toBe('inventory')
  })

  it('does not throw when handlers are omitted', () => {
    const row = renderCategoryRow(customPrivate, {})
    expect(() => {
      row.querySelector('[data-role="edit-category"]').dispatchEvent(new Event('click', { bubbles: true }))
      row.querySelector('[data-role="delete-category"]').dispatchEvent(new Event('click', { bubbles: true }))
    }).not.toThrow()
  })
})
