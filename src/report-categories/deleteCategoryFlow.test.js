import { describe, it, expect, vi } from 'vitest'
import { startDeleteCategoryFlow, destinationsFor } from './deleteCategoryFlow.js'
import { createStore } from './store.js'

const categories = [
  { id: 'all-reports', name: 'All Reports', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'config', name: 'Config', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'inventory', name: 'Inventory', type: 'custom', visibility: 'public', sharedWith: [] },
  { id: 'empty', name: 'Capacity Planning', type: 'custom', visibility: 'public', sharedWith: [] },
]

const reports = [
  { id: 'r1', category: 'inventory', title: 'Switch Inventory' },
  { id: 'r2', category: 'inventory', title: 'Firmware Compliance' },
  { id: 'r3', category: 'config', title: '3rd August Training' },
]

function harness(categoryId) {
  const store = createStore({ categories, reports })
  const mount = vi.fn()
  const close = vi.fn()
  const onDeleted = vi.fn()
  startDeleteCategoryFlow({ category: store.getCategory(categoryId), store, mount, close, onDeleted })
  const shown = () => mount.mock.calls.at(-1)[0]
  return { store, mount, close, onDeleted, shown }
}

const click = (el, role) => el.querySelector(`[data-role="${role}"]`).dispatchEvent(new Event('click', { bubbles: true }))
const choose = (dialog, reportId, value) => {
  const select = dialog
    .querySelector(`[data-role="reassign-row"][data-report-id="${reportId}"]`)
    .querySelector('[data-role="reassign-select"]')
  select.dispatchEvent(new CustomEvent('change', { detail: [value] }))
}

describe('destinationsFor', () => {
  it('excludes the doomed category and the virtual All Reports view', () => {
    const store = createStore({ categories, reports })
    expect(destinationsFor(store, 'inventory')).toEqual([
      { id: 'config', name: 'Config' },
      { id: 'empty', name: 'Capacity Planning' },
    ])
  })
})

describe('startDeleteCategoryFlow', () => {
  it('opens the confirm dialog first', () => {
    const { shown } = harness('inventory')
    expect(shown().getAttribute('data-role')).toBe('delete-confirm-dialog')
  })

  it('closes and changes nothing when the confirm is declined', () => {
    const { store, shown, close, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('cancel'))
    expect(close).toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(store.getCategory('inventory')).toBeDefined()
  })

  it('deletes an empty category outright, without a reassignment step', () => {
    const { store, shown, close, onDeleted, mount } = harness('empty')
    shown().dispatchEvent(new CustomEvent('confirm'))

    expect(store.getCategory('empty')).toBeUndefined()
    expect(onDeleted).toHaveBeenCalledWith('empty')
    expect(close).toHaveBeenCalled()
    expect(mount).toHaveBeenCalledTimes(1)
  })

  it('opens the reassignment step when the category holds reports', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    expect(shown().getAttribute('data-role')).toBe('reassign-dialog')
    expect(shown().querySelectorAll('[data-role="reassign-row"]')).toHaveLength(2)
  })

  it('moves the reports and deletes the category on Move and Delete', () => {
    const { store, shown, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))

    const reassign = shown()
    choose(reassign, 'r1', 'config')
    choose(reassign, 'r2', 'config')
    click(reassign, 'reassign-move')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getReportsByCategory('config').map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
    expect(onDeleted).toHaveBeenCalledWith('inventory')
  })

  it('does not delete anything while a report is unmapped', () => {
    const { store, shown, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))

    const reassign = shown()
    choose(reassign, 'r1', 'config')
    click(reassign, 'reassign-move')

    expect(store.getCategory('inventory')).toBeDefined()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('advances to the force-delete step on Proceed Anyway', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')
    expect(shown().getAttribute('data-role')).toBe('force-delete-dialog')
  })

  it('force-deletes the category and its reports once the name is typed', () => {
    const { store, shown, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')

    const force = shown()
    force
      .querySelector('[data-role="force-delete-input"]')
      .dispatchEvent(new CustomEvent('input', { detail: ['Inventory'] }))
    click(force, 'force-delete-confirm')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getReports().map((r) => r.id)).toEqual(['r3'])
    expect(onDeleted).toHaveBeenCalledWith('inventory')
  })

  it('cancelling the force step tears the whole flow down', () => {
    const { store, shown, close } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')
    click(shown(), 'force-delete-cancel')

    expect(close).toHaveBeenCalled()
    expect(store.getCategory('inventory')).toBeDefined()
  })
})
