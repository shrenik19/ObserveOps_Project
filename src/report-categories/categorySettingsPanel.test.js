import { describe, it, expect, vi } from 'vitest'
import { renderCategorySettingsPanel } from './categorySettingsPanel.js'

const customCategory = {
  id: 'inventory',
  name: 'Inventory',
  type: 'custom',
  visibility: 'private',
  sharedWith: [{ type: 'user', id: 'u1' }],
}

const builtinCategory = {
  id: 'network',
  name: 'Network',
  type: 'builtin',
  visibility: 'public',
  sharedWith: [],
}

const nameInput = (panel) => panel.querySelector('[data-role="category-name"]')
const deleteButton = (panel) => panel.querySelector('[data-role="delete-category"]')
const toggle = (panel) => panel.querySelector('[data-role="visibility-toggle"]')
const banner = (panel) => panel.querySelector('[data-role="visibility-banner"]')
const picker = (panel) => panel.querySelector('[data-role="sharing-picker"]')
const save = (panel) => panel.querySelector('[data-role="save-category"]')

const click = (el) => el.dispatchEvent(new Event('click', { bubbles: true }))

// The DS delivers event values in event.detail as an ARRAY (unwrap detail[0]).
const dsChange = (el, value) => el.dispatchEvent(new CustomEvent('change', { detail: [value] }))

describe('renderCategorySettingsPanel', () => {
  it('shows an editable, empty Name field and Public default in create mode', () => {
    const panel = renderCategorySettingsPanel({ mode: 'create', category: null })
    expect(nameInput(panel).hasAttribute('disabled')).toBe(false)
    expect(toggle(panel).dataset.selected).toBe('public')
  })

  it('shows a disabled, pre-filled Name field in edit-builtin mode', () => {
    const panel = renderCategorySettingsPanel({ mode: 'edit-builtin', category: builtinCategory })
    const input = nameInput(panel)
    expect(input.hasAttribute('disabled')).toBe(true)
    expect(input.getAttribute('value')).toBe('Network')
  })

  it('shows an editable, pre-filled Name field in edit-custom mode', () => {
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory })
    const input = nameInput(panel)
    expect(input.hasAttribute('disabled')).toBe(false)
    expect(input.getAttribute('value')).toBe('Inventory')
  })

  it('only shows the Delete button in edit-custom mode', () => {
    expect(deleteButton(renderCategorySettingsPanel({ mode: 'create', category: null }))).toBeNull()
    expect(deleteButton(renderCategorySettingsPanel({ mode: 'edit-builtin', category: builtinCategory }))).toBeNull()
    expect(deleteButton(renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory }))).not.toBeNull()
  })

  it('shows the sharing picker pre-selected to Private, hides it after switching to Public', () => {
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory })
    expect(picker(panel)).not.toBeNull()
    expect(banner(panel).textContent).toContain('Only the Users or User Profiles')

    dsChange(toggle(panel), 'public')

    expect(picker(panel)).toBeNull()
    expect(banner(panel).textContent).toContain('Visible to all users in the organization')
  })

  it('calls onSave with name, visibility, and sharedWith on save', () => {
    const onSave = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory, onSave })
    click(save(panel))
    expect(onSave).toHaveBeenCalledWith({
      name: 'Inventory',
      visibility: 'private',
      sharedWith: [{ type: 'user', id: 'u1' }],
    })
  })

  it('blocks save when Private is selected with no sharedWith entries', () => {
    const onSave = vi.fn()
    const emptyShare = { ...customCategory, sharedWith: [] }
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: emptyShare, onSave })
    const error = panel.querySelector('[data-role="sharing-error"]')

    expect(error.hidden).toBe(true)
    click(save(panel))

    expect(onSave).not.toHaveBeenCalled()
    expect(error).not.toBeNull()
    expect(error.hidden).toBe(false)
  })

  it('calls onCancel when Cancel is activated', () => {
    const onCancel = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'create', category: null, onCancel })
    click(panel.querySelector('[data-role="cancel-category"]'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onDelete with the category id when Delete is activated', () => {
    const onDelete = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory, onDelete })
    click(deleteButton(panel))
    expect(onDelete).toHaveBeenCalledWith('inventory')
  })

  // --- spec §"Save validation": Name required and non-empty in editable modes ---

  it('blocks save on an empty Name in create mode', () => {
    const onSave = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'create', category: null, onSave })
    const error = panel.querySelector('[data-role="name-error"]')

    expect(error.hidden).toBe(true)
    click(save(panel))

    expect(onSave).not.toHaveBeenCalled()
    expect(error.hidden).toBe(false)
  })

  it('blocks save when the Name is whitespace only', () => {
    const onSave = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory, onSave })
    nameInput(panel).dispatchEvent(new CustomEvent('input', { detail: ['   '] }))
    click(save(panel))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not require a Name in edit-builtin mode, where the field is disabled', () => {
    const onSave = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'edit-builtin', category: builtinCategory, onSave })
    click(save(panel))
    expect(onSave).toHaveBeenCalledWith({ visibility: 'public', sharedWith: [] })
  })

  it('clears a validation error once the problem is fixed', () => {
    const onSave = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'create', category: null, onSave })
    click(save(panel))
    expect(panel.querySelector('[data-role="name-error"]').hidden).toBe(false)

    nameInput(panel).dispatchEvent(new CustomEvent('input', { detail: ['Wireless'] }))
    click(save(panel))

    expect(panel.querySelector('[data-role="name-error"]').hidden).toBe(true)
    expect(onSave).toHaveBeenCalledWith({ name: 'Wireless', visibility: 'public', sharedWith: [] })
  })

  // --- DS contract, per docs/superpowers/plans/2026-08-06-ds-component-reference.md ---

  it('is an obs-drawer, not a hand-composed overlay', () => {
    const panel = renderCategorySettingsPanel({ mode: 'create', category: null })
    expect(panel.tagName.toLowerCase()).toBe('obs-drawer')
    expect(panel.hasAttribute('open')).toBe(true)
  })

  it('titles the panel by mode', () => {
    expect(renderCategorySettingsPanel({ mode: 'create', category: null }).getAttribute('title')).toBe('New Category')
    expect(
      renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory }).getAttribute('title')
    ).toBe('Edit Category')
  })

  it('builds the toggle as a segmented obs-radio with Public/Private options', () => {
    const panel = renderCategorySettingsPanel({ mode: 'create', category: null })
    const el = toggle(panel)
    expect(el.tagName.toLowerCase()).toBe('obs-radio')
    expect(el.hasAttribute('as-button')).toBe(true)
    expect(el.options.map((o) => o.value)).toEqual(['public', 'private'])
  })

  it('builds the sharing picker as a multiple obs-select', () => {
    const el = picker(renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory }))
    expect(el.tagName.toLowerCase()).toBe('obs-select')
    expect(el.hasAttribute('multiple')).toBe(true)
  })

  it('uses the error variant for the panel Delete button', () => {
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory })
    expect(deleteButton(panel).getAttribute('variant')).toBe('error')
    expect(save(panel).getAttribute('variant')).toBe('primary')
    expect(panel.querySelector('[data-role="cancel-category"]').getAttribute('variant')).toBe('default')
  })

  it('uses a plain heading for the Visibility & Sharing section, not a divider', () => {
    const panel = renderCategorySettingsPanel({ mode: 'create', category: null })
    const heading = panel.querySelector('[data-role="visibility-heading"]')
    expect(heading.tagName.toLowerCase()).toBe('h3')
    expect(heading.textContent).toBe('Visibility & Sharing')
  })

  // obs-select speaks flat string keys, not the store's { type, id } objects — handing it objects
  // renders "[object Object]" (caught by rendering, not by jsdom). The panel encodes on the way in
  // and decodes on the way out.
  it('decodes picker selections from obs-select string keys back into store entries', () => {
    const onSave = vi.fn()
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory, onSave })
    picker(panel).dispatchEvent(new CustomEvent('change', { detail: [['user:u9', 'profile:p1']] }))
    click(save(panel))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        sharedWith: [
          { type: 'user', id: 'u9' },
          { type: 'profile', id: 'p1' },
        ],
      })
    )
  })

  it('encodes the pre-selected sharedWith as obs-select keys and options', () => {
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory })
    const el = picker(panel)
    expect(el.value).toEqual(['user:u1'])
    // { value, text } — the element's shape. { key, text } is the Vue component's and does not match.
    expect(el.options).toEqual([{ value: 'user:u1', text: '@u1' }])
  })

  it('labels picker options from the supplied directory', () => {
    const panel = renderCategorySettingsPanel({
      mode: 'edit-custom',
      category: customCategory,
      directory: [
        { type: 'user', id: 'u1', label: 'Alice Chen' },
        { type: 'profile', id: 'p1', label: 'Ops Team' },
      ],
    })
    expect(picker(panel).options).toEqual([
      { value: 'user:u1', text: 'Alice Chen' },
      { value: 'profile:p1', text: 'Ops Team' },
    ])
  })

  it('does not mutate the category it was handed', () => {
    const original = JSON.parse(JSON.stringify(customCategory))
    const panel = renderCategorySettingsPanel({ mode: 'edit-custom', category: customCategory, onSave: vi.fn() })
    dsChange(toggle(panel), 'public')
    nameInput(panel).dispatchEvent(new CustomEvent('input', { detail: ['Renamed'] }))
    expect(customCategory).toEqual(original)
  })
})
